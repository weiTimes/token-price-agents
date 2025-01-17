import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PriceData,
  NotificationPreference,
  PriceCondition,
  TimeWindow,
} from '../interfaces/price.interface';
import { PriceComparisonCondition } from '../interfaces/intent.interface';
import { NotificationGateway } from '../gateways/notification.gateway';
import { v4 as uuidv4 } from 'uuid';
import { NotificationQueueService } from './notification-queue.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private preferences: Map<string, NotificationPreference> = new Map();
  private lastPriceData: PriceData | null = null;
  private lastNotificationTimes: Map<string, number> = new Map();
  private timeWindowEnabled: Map<string, boolean> = new Map();
  private timeWindows: Map<string, TimeWindow[]> = new Map();

  constructor(
    private readonly notificationGateway: NotificationGateway,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  private createDefaultTimeWindows(baseTime: Date = new Date()): TimeWindow[] {
    // 格式化时间为 HH:mm 格式
    const formatTime = (date: Date) => {
      return date.toTimeString().substring(0, 5);
    };

    // 创建三个时间窗口，分别在当前时间后推1、2、3分钟开始，每个持续1小时
    return [
      {
        startTime: formatTime(new Date(baseTime.getTime() + 60000)), // +1分钟
        endTime: formatTime(new Date(baseTime.getTime() + 3660000)), // +1分钟+1小时
        prices: [],
      },
      {
        startTime: formatTime(new Date(baseTime.getTime() + 120000)), // +2分钟
        endTime: formatTime(new Date(baseTime.getTime() + 3720000)), // +2分钟+1小时
        prices: [],
      },
      {
        startTime: formatTime(new Date(baseTime.getTime() + 180000)), // +3分钟
        endTime: formatTime(new Date(baseTime.getTime() + 3780000)), // +3分钟+1小时
        prices: [],
      },
    ];
  }

  private parseCustomTimeWindows(description: string): TimeWindow[] | null {
    // 匹配时间窗口格式 [HH:mm-HH:mm, HH:mm-HH:mm, HH:mm-HH:mm]
    const timeWindowMatch = description.match(/时间窗口\[([\d:,-\s]+)\]/);
    if (!timeWindowMatch) return null;

    const timeWindowsStr = timeWindowMatch[1];
    const windowStrings = timeWindowsStr.split(',').map((s) => s.trim());

    // 验证是否有正确数量的时间窗口
    if (windowStrings.length !== 3) return null;

    const windows: TimeWindow[] = [];
    for (const windowStr of windowStrings) {
      const [start, end] = windowStr.split('-').map((s) => s.trim());
      // 验证时间格式
      if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end))
        return null;

      windows.push({
        startTime: start,
        endTime: end,
        prices: [],
      });
    }

    return windows;
  }

  registerPreference(
    userId: string,
    condition: PriceCondition,
  ): NotificationPreference {
    const preference: NotificationPreference = {
      id: uuidv4(),
      userId,
      condition,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 检查意图中是否包含时间窗口相关的关键词
    const hasTimeWindowKeywords =
      condition.description.includes('时间窗口') ||
      condition.description.includes('重叠区域') ||
      condition.description.includes('时间段');

    // 设置时间窗口开关
    this.timeWindowEnabled.set(preference.id, hasTimeWindowKeywords);

    if (hasTimeWindowKeywords) {
      // 尝试解析自定义时间窗口
      const customWindows = this.parseCustomTimeWindows(condition.description);

      // 如果有自定义时间窗口，使用自定义的；否则使用默认的
      const windows = customWindows || this.createDefaultTimeWindows();
      this.timeWindows.set(preference.id, windows);

      // 在响应中添加时间窗口信息
      const timeWindowInfo = windows
        .map((w) => `- ${w.startTime} - ${w.endTime}`)
        .join('\n');

      // 更新条件描述，包含时间窗口信息
      condition.description = `${condition.description}\n\n已启用时间窗口监控，时间窗口设置为：\n${timeWindowInfo}`;
    }

    this.preferences.set(preference.id, preference);
    return preference;
  }

  getPreference(id: string): NotificationPreference | undefined {
    return this.preferences.get(id);
  }

  getUserPreferences(userId: string): NotificationPreference[] {
    return Array.from(this.preferences.values()).filter(
      (pref) => pref.userId === userId,
    );
  }

  private isInOverlappingPeriod(
    timestamp: number,
    windows: TimeWindow[],
  ): boolean {
    const timeStr = new Date(timestamp).toTimeString().substring(0, 5);
    // 检查当前时间是否在所有时间窗口内
    return windows.every(
      (window) => timeStr >= window.startTime && timeStr <= window.endTime,
    );
  }

  @OnEvent('price.new')
  async handlePriceUpdate(priceData: PriceData) {
    this.logger.debug(`Handling price update: ${JSON.stringify(priceData)}`);
    const previousPriceData = this.lastPriceData;
    this.lastPriceData = priceData;

    // 收集需要发送的通知
    const notifications: { userId: string; message: string }[] = [];

    // 检查每个偏好设置
    for (const [id, preference] of this.preferences.entries()) {
      const currentTime = priceData.timestamp;
      const lastNotificationTime = this.lastNotificationTimes.get(id) || 0;
      const { notification } = preference.condition.parameters;

      // 检查是否满足通知频率要求
      let canNotify = false;
      if (notification.frequency === 'IMMEDIATE') {
        canNotify = true;
      } else if (notification.frequency === 'INTERVAL') {
        const interval = notification.interval || 1000;
        const timeSinceLastNotification = currentTime - lastNotificationTime;
        canNotify = timeSinceLastNotification >= interval;
      }

      if (!canNotify) continue;

      // 检查是否启用了时间窗口
      if (this.timeWindowEnabled.get(id)) {
        const windows = this.timeWindows.get(id);
        if (!this.isInOverlappingPeriod(priceData.timestamp, windows)) {
          this.logger.debug('Price update is outside overlapping period');
          continue;
        }
      }

      // 检查价格条件
      if (
        this.checkConditions(preference.condition, priceData, previousPriceData)
      ) {
        const description = preference.condition.description.split('\n\n')[0];
        const message =
          `价格监控提醒 - ${new Date(priceData.timestamp).toLocaleTimeString()}\n` +
          `条件：${description}\n` +
          `当前价格数据：\n` +
          `- 开盘价：${priceData.open}\n` +
          `- 最高价：${priceData.high}\n` +
          `- 最低价：${priceData.low}\n` +
          `- 收盘价：${priceData.close}`;

        notifications.push({
          userId: preference.userId,
          message,
        });

        this.lastNotificationTimes.set(id, currentTime);
      }
    }

    // 批量添加通知到队列
    if (notifications.length > 0) {
      await this.notificationQueue.addBatch(notifications);
    }
  }

  private checkConditions(
    condition: PriceCondition,
    currentPrice: PriceData,
    previousPrice: PriceData | null,
  ): boolean {
    if (condition.type !== 'PRICE_PATTERN') {
      return false;
    }

    const { conditions, operator } = condition.parameters;
    if (!Array.isArray(conditions)) {
      return false;
    }

    // 如果有需要比较前一个价格的条件，但没有前一个价格数据，则返回 false
    if (
      conditions.some((cond) => cond.target === 'PREVIOUS') &&
      !previousPrice
    ) {
      return false;
    }

    const results = conditions.map((cond) =>
      this.checkSingleCondition(cond, currentPrice, previousPrice!),
    );

    return operator === 'AND'
      ? results.every((r) => r)
      : results.some((r) => r);
  }

  private checkSingleCondition(
    condition: PriceComparisonCondition,
    currentPrice: PriceData,
    previousPrice: PriceData,
  ): boolean {
    const getCurrentValue = (price: PriceData, type: string) => {
      switch (type) {
        case 'OPEN':
          return price.open;
        case 'CLOSE':
          return price.close;
        case 'HIGH':
          return price.high;
        case 'LOW':
          return price.low;
        default:
          return 0;
      }
    };

    const currentValue = getCurrentValue(currentPrice, condition.type);
    const compareValue =
      condition.target === 'PREVIOUS'
        ? getCurrentValue(previousPrice, condition.type)
        : condition.value || 0;

    return condition.comparison === 'HIGHER'
      ? currentValue > compareValue
      : currentValue < compareValue;
  }

  private async notify(
    userId: string,
    description: string,
    priceData: PriceData,
  ) {
    const message =
      `价格监控提醒 - ${new Date(priceData.timestamp).toLocaleTimeString()}\n` +
      `条件：${description}\n` +
      `当前价格数据：\n` +
      `- 开盘价：${priceData.open}\n` +
      `- 最高价：${priceData.high}\n` +
      `- 最低价：${priceData.low}\n` +
      `- 收盘价：${priceData.close}`;

    // 将通知添加到队列而不是直接发送
    await this.notificationQueue.addNotification(userId, message);
  }
}
