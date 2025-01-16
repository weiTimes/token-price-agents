import { Controller, Sse, MessageEvent, Get } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { AppService } from './app.service';
import { PriceTuple } from './stock-simulator.interface';

@Controller('stocks')
export class AppController {
  constructor(private readonly stocksService: AppService) {}

  @Get()
  getHello(): string {
    return this.stocksService.getHello();
  }

  /**
   * SSE endpoint: /stocks/prices
   *
   * Clients can connect (e.g. via EventSource in the browser) and
   * receive continuous price updates.
   */
  @Sse('prices')
  getStockPrices(): Observable<MessageEvent> {
    return this.stocksService.getPriceStream().pipe(
      map((priceTuple: PriceTuple) => {
        // Wrap each price update in a MessageEvent structure
        // The 'data' field is what clients will receive
        return {
          data: priceTuple,
        } as MessageEvent;
      }),
    );
  }
}
