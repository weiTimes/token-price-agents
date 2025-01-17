import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NotificationGateway } from '../gateways/notification.gateway';
import { Observable, Subject } from 'rxjs';

interface QueuedNotification {
  userId: string;
  message: string;
  timestamp: number;
  retryCount: number;
}

@Injectable()
export class NotificationQueueService implements OnModuleInit {
  private readonly logger = new Logger(NotificationQueueService.name);
  private queue: QueuedNotification[] = [];
  private readonly maxRetries = 3;
  private readonly batchSize = 100;
  private readonly maxQueueSize = 10000;
  private messageSubject = new Subject<any>();

  constructor(private readonly notificationGateway: NotificationGateway) {}

  /**
   * Lifecycle hook that runs once this service is initialized.
   * Starts the background price simulation.
   */
  onModuleInit() {
    // setInterval(() => {
    //   this.messageSubject.next({
    //     timestamp: new Date().toLocaleTimeString(),
    //     userId: 'user123',
    //     message: 'test',
    //   });
    // }, 1000);
  }

  public getMessageStream(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  async addNotification(userId: string, message: string) {
    if (this.queue.length >= this.maxQueueSize) {
      this.logger.warn('Queue is full, dropping oldest notifications');
      this.queue = this.queue.slice(-this.maxQueueSize + 1);
    }

    this.queue.push({
      userId,
      message,
      timestamp: Date.now(),
      retryCount: 0,
    });
  }

  async addBatch(notifications: { userId: string; message: string }[]) {
    for (const notification of notifications) {
      await this.addNotification(notification.userId, notification.message);
    }
  }

  private async getBatch(): Promise<QueuedNotification[]> {
    return this.queue.splice(0, this.batchSize);
  }

  @Interval(1000) // 每秒处理一批
  async processBatch() {
    if (this.queue.length === 0) return;

    const batch = await this.getBatch();
    this.logger.debug(`Processing batch of ${batch.length} notifications`);

    const results = await Promise.allSettled(
      batch.map(async (notification) => {
        try {
          await this.sendNotification(notification);
          return true;
        } catch (error) {
          if (notification.retryCount < this.maxRetries) {
            notification.retryCount++;
            this.queue.push(notification);
            this.logger.warn(
              `Failed to send notification, retrying (${notification.retryCount}/${this.maxRetries})`,
            );
          } else {
            this.logger.error(
              `Failed to send notification after ${this.maxRetries} retries`,
              error,
            );
          }
          return false;
        }
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.debug(
      `Batch processing completed: ${succeeded} succeeded, ${failed} failed`,
    );
  }

  private async sendNotification(notification: QueuedNotification) {
    this.logger.debug(
      `Sending notification to ${notification.userId}: ${notification.message}`,
    );

    const timestamp = new Date(notification.timestamp).toLocaleTimeString();

    // Emit sse message
    this.messageSubject.next({
      timestamp,
      userId: notification.userId,
      message: notification.message,
    });

    // 使用 NotificationGateway 发送通知
    await this.notificationGateway.sendNotification(
      notification.userId,
      notification.message,
      {
        timestamp,
      },
    );
  }
}
