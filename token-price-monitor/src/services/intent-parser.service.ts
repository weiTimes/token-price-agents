import { Injectable, Logger } from '@nestjs/common';
import { PriceIntent, UserIntent } from '../interfaces/intent.interface';
import { NotificationService } from './notification.service';
import { PriceCondition } from '../interfaces/price.interface';
import { AIService } from './ai.service';

@Injectable()
export class IntentParserService {
  private readonly logger = new Logger(IntentParserService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly aiService: AIService,
  ) {}

  async parseIntent(userId: string, rawIntent: string): Promise<UserIntent> {
    // this.logger.debug(`Parsing intent for user ${userId}: ${rawIntent}`);

    // 使用AI服务解析自然语言意图
    const parsedJson = await this.aiService.parseIntent(rawIntent);
    // this.logger.debug('Received parsed JSON from AI service:', parsedJson);

    const parsedIntent: PriceIntent = {
      conditions: parsedJson.conditions,
      operator: parsedJson.operator,
      notification: parsedJson.notification,
    };
    // this.logger.debug('Created PriceIntent:', parsedIntent);

    return {
      rawIntent,
      userId,
      parsedIntent,
    };
  }

  convertToNotificationCondition(intent: UserIntent): PriceCondition {
    // this.logger.debug(
    //   'Converting UserIntent to NotificationCondition:',
    //   intent,
    // );

    const condition: PriceCondition = {
      type: 'PRICE_PATTERN',
      parameters: {
        conditions: intent.parsedIntent.conditions,
        operator: intent.parsedIntent.operator,
        notification: intent.parsedIntent.notification,
      },
      description: intent.rawIntent,
    };

    // this.logger.debug('Created PriceCondition:', condition);
    return condition;
  }

  async processIntent(userId: string, rawIntent: string) {
    // this.logger.debug(`Processing intent for user ${userId}: ${rawIntent}`);

    const parsedIntent = await this.parseIntent(userId, rawIntent);
    // this.logger.debug('Parsed intent:', parsedIntent);

    const condition = this.convertToNotificationCondition(parsedIntent);
    // this.logger.debug('Converted to notification condition:', condition);

    return this.notificationService.registerPreference(userId, condition);
  }
}
