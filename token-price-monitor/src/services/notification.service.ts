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

  constructor(private readonly notificationGateway: NotificationGateway) {}

  registerPreference(
    userId: string,
    condition: PriceCondition,
  ): NotificationPreference {
    this.logger.debug(`Registering preference for user ${userId}:`, condition);

    const preference: NotificationPreference = {
      id: uuidv4(),
      userId,
      condition,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.preferences.set(preference.id, preference);
    this.logger.debug(`Registered preference with ID ${preference.id}`);
    return preference;
  }

  getPreference(id: string): NotificationPreference | undefined {
    const preference = this.preferences.get(id);
    this.logger.debug(`Retrieved preference for ID ${id}:`, preference);
    return preference;
  }

  getUserPreferences(userId: string): NotificationPreference[] {
    const preferences = Array.from(this.preferences.values()).filter(
      (pref) => pref.userId === userId,
    );
    this.logger.debug(`Retrieved preferences for user ${userId}:`, preferences);
    return preferences;
  }

  @OnEvent('price.new')
  async handlePriceUpdate(priceData: PriceData) {
    // this.logger.debug('Received new price data:', priceData);
    const previousPriceData = this.lastPriceData;
    this.lastPriceData = priceData;

    for (const preference of this.preferences.values()) {
      //   this.logger.debug(`Checking preference ${preference.id}:`, preference);

      if (
        this.checkCondition(preference.condition, priceData, previousPriceData)
      ) {
        this.logger.debug(
          `Condition met for preference ${preference.id}, sending notification`,
        );
        await this.notify(
          preference.userId,
          preference.condition.description,
          priceData,
        );
      }
    }
  }

  private checkCondition(
    condition: PriceCondition,
    currentPrice: PriceData,
    previousPrice: PriceData | null,
  ): boolean {
    // this.logger.debug('Checking condition:', {
    //   condition,
    //   currentPrice,
    //   previousPrice,
    // });

    if (condition.type !== 'PRICE_PATTERN') {
      this.logger.debug('Invalid condition type:', condition.type);
      return false;
    }

    const { conditions, operator } = condition.parameters;
    if (!Array.isArray(conditions) || !previousPrice) {
      this.logger.debug('Invalid conditions or no previous price:', {
        conditions,
        hasPreviousPrice: !!previousPrice,
      });
      return false;
    }

    const results = conditions.map((cond) =>
      this.checkSingleCondition(cond, currentPrice, previousPrice),
    );

    // this.logger.debug('Condition check results:', {
    //   operator,
    //   results,
    // });

    return operator === 'AND'
      ? results.every((r) => r)
      : results.some((r) => r);
  }

  private checkSingleCondition(
    condition: PriceComparisonCondition,
    currentPrice: PriceData,
    previousPrice: PriceData,
  ): boolean {
    // this.logger.debug('Checking single condition:', {
    //   condition,
    //   currentPrice,
    //   previousPrice,
    // });

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

    const result =
      condition.comparison === 'HIGHER'
        ? currentValue > compareValue
        : currentValue < compareValue;

    // this.logger.debug('Single condition check result:', {
    //   currentValue,
    //   compareValue,
    //   comparison: condition.comparison,
    //   result,
    // });

    return result;
  }

  private async notify(
    userId: string,
    description: string,
    priceData: PriceData,
  ) {
    const formattedTime = new Date(priceData.timestamp).toLocaleTimeString(
      'zh-CN',
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

    this.logger.debug(message);
    console.log(message);

    // Send notification through WebSocket
    this.notificationGateway.sendNotification(userId, message, data);
  }
}
