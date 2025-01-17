import { Controller, Sse, MessageEvent, Get } from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { NotificationQueueService } from '../services/notification-queue.service';

@Controller('message')
export class MessageController {
  constructor(
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  @Get()
  getHello(): string {
    return 'Hello World!';
  }

  /**
   * SSE endpoint: /message/prices
   *
   * Clients can connect (e.g. via EventSource in the browser) and
   * receive continuous price updates.
   */
  @Sse('prices')
  getMessagePrices(): Observable<MessageEvent> {
    return this.notificationQueueService.getMessageStream().pipe(
      map((data: any) => {
        // Wrap each price update in a MessageEvent structure
        // The 'data' field is what clients will receive
        return {
          data,
        } as MessageEvent;
      }),
    );
  }
}
