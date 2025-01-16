import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PriceMonitorService } from './services/price-monitor.service';
import { NotificationService } from './services/notification.service';
import { IntentParserService } from './services/intent-parser.service';
import { AIService } from './services/ai.service';
import { NotificationController } from './controllers/notification.controller';
import { IntentController } from './controllers/intent.controller';
import { NotificationGateway } from './gateways/notification.gateway';
import configuration from './config/configuration';
import { NotificationQueueService } from './services/notification-queue.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [NotificationController, IntentController],
  providers: [
    PriceMonitorService,
    NotificationService,
    IntentParserService,
    AIService,
    NotificationGateway,
    NotificationQueueService,
  ],
})
export class AppModule {}
