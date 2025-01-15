import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PriceData,
  NotificationPreference,
  PriceCondition,
} from '../interfaces/price.interface';
import { PriceComparisonCondition } from '../interfaces/intent.interface';
import { NotificationGateway } from '../gateways/notification.gateway';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private preferences: Map<string, NotificationPreference> = new Map();
  private lastPriceData: PriceData | null = null;
  private lastNotificationTimes: Map<string, number> = new Map();

  constructor(private readonly notificationGateway: NotificationGateway) {}

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

    this.preferences.set(preference.id, preference);
    this.logger.debug(
      `Registered preference with ID ${preference.id}:`,
      condition,
    );
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

  @OnEvent('price.new')
  async handlePriceUpdate(priceData: PriceData) {
    const previousPriceData = this.lastPriceData;
    this.lastPriceData = priceData;

    for (const preference of this.preferences.values()) {
      const currentTime = priceData.timestamp;
      const lastNotificationTime =
        this.lastNotificationTimes.get(preference.id) || 0;
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

      // 只有在满足通知频率要求的情况下才检查条件
      if (
        canNotify &&
        this.checkConditions(preference.condition, priceData, previousPriceData)
      ) {
        await this.notify(
          preference.userId,
          preference.condition.description,
          priceData,
        );
        this.lastNotificationTimes.set(preference.id, currentTime);
      }
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
    const formattedTime = new Date(priceData.timestamp).toLocaleTimeString(
      'zh-CN',
      {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      },
    );

    const message =
      `价格监控提醒 - ${formattedTime}\n` +
      `条件：${description}\n` +
      `当前价格数据：\n` +
      `- 开盘价：${priceData.open.toFixed(2)}\n` +
      `- 最高价：${priceData.high.toFixed(2)}\n` +
      `- 最低价：${priceData.low.toFixed(2)}\n` +
      `- 收盘价：${priceData.close.toFixed(2)}`;

    const data = {
      symbol: priceData.symbol,
      timestamp: formattedTime,
      open: priceData.open,
      close: priceData.close,
      high: priceData.high,
      low: priceData.low,
    };

    this.logger.debug(`Sending notification to user ${userId}:`, message);
    this.notificationGateway.sendNotification(userId, message, data);
  }
}
