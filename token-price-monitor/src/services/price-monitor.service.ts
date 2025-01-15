import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PriceData } from '../interfaces/price.interface';
import { EventSource } from 'eventsource';

interface MinuteData {
  prices: number[];
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

@Injectable()
export class PriceMonitorService implements OnModuleInit {
  private priceHistory: PriceData[] = [];
  private currentMinuteData: MinuteData | null = null;
  private readonly MAX_HISTORY_SIZE = 1000;
  private readonly logger = new Logger(PriceMonitorService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  onModuleInit() {
    this.connectToPriceStream();
  }

  private connectToPriceStream() {
    const eventSource = new EventSource('http://localhost:3001/stocks/prices');

    eventSource.onmessage = (event) => {
      try {
        const [timestamp, price] = JSON.parse(event.data);
        // this.logger.debug(
        //   `Received price data: timestamp=${timestamp}, price=${price}`,
        // );

        this.processPrice(timestamp, price);
      } catch (error) {
        this.logger.error('Failed to parse price data:', error);
      }
    };

    eventSource.onerror = (error) => {
      this.logger.error('Price stream connection error:', error);
      setTimeout(() => this.connectToPriceStream(), 5000);
    };
  }

  private processPrice(timestamp: number, price: number) {
    const minuteTimestamp = Math.floor(timestamp / 60000) * 60000;

    if (
      !this.currentMinuteData ||
      this.currentMinuteData.timestamp !== minuteTimestamp
    ) {
      // If we have data from the previous minute, save it
      if (this.currentMinuteData) {
        const priceData: PriceData = {
          symbol: 'BTC/USD',
          timestamp: this.currentMinuteData.timestamp,
          open: this.currentMinuteData.open,
          high: this.currentMinuteData.high,
          low: this.currentMinuteData.low,
          close: this.currentMinuteData.close,
          volume: 0,
        };
        this.handleNewPrice(priceData);
      }

      // Start a new minute
      this.currentMinuteData = {
        prices: [price],
        timestamp: minuteTimestamp,
        open: price,
        high: price,
        low: price,
        close: price,
      };
    } else {
      // Update current minute data
      this.currentMinuteData.prices.push(price);
      this.currentMinuteData.high = Math.max(
        this.currentMinuteData.high,
        price,
      );
      this.currentMinuteData.low = Math.min(this.currentMinuteData.low, price);
      this.currentMinuteData.close = price;

      // Emit intermediate updates with current minute data
      const intermediateData: PriceData = {
        symbol: 'BTC/USD',
        timestamp: minuteTimestamp,
        open: this.currentMinuteData.open,
        high: this.currentMinuteData.high,
        low: this.currentMinuteData.low,
        close: this.currentMinuteData.close,
        volume: 0,
      };
      this.eventEmitter.emit('price.new', intermediateData);
    }
  }

  private handleNewPrice(priceData: PriceData) {
    this.logger.debug('Processing new price:', priceData);

    this.priceHistory.push(priceData);
    if (this.priceHistory.length > this.MAX_HISTORY_SIZE) {
      this.priceHistory.shift();
    }

    this.eventEmitter.emit('price.new', priceData);
  }

  getPriceHistory(): PriceData[] {
    return this.priceHistory;
  }

  getLatestPrice(): PriceData | null {
    return this.priceHistory.length > 0
      ? this.priceHistory[this.priceHistory.length - 1]
      : null;
  }
}
