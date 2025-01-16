import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { PriceTuple, StockSimulatorOptions } from './stock-simulator.interface';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private priceSubject = new Subject<PriceTuple>();
  private stopSimulation = false;

  constructor() {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Lifecycle hook that runs once this service is initialized.
   * Starts the background price simulation.
   */
  onModuleInit() {
    // Start the async simulator in the background
    this.startPriceSimulation({
      initialPrice: 100,
      drift: 0.0001,
      volatility: 0.005,
      countPerBatch: 10,
      intervalMs: 1000,
    });
  }

  /**
   * Lifecycle hook that runs on shutdown, ensuring
   * we stop the simulation loop to prevent memory leaks.
   */
  onModuleDestroy() {
    this.stopSimulation = true;
  }

  /**
   * Returns an observable that clients can subscribe to
   * in order to receive continuous price updates.
   */
  public getPriceStream(): Observable<PriceTuple> {
    return this.priceSubject.asObservable();
  }

  /**
   * Asynchronously simulates stock prices using a GBM-like model,
   * pushing new prices through the RxJS subject.
   */
  private async startPriceSimulation(options: StockSimulatorOptions) {
    const {
      initialPrice = 100,
      drift = 0.0002,
      volatility = 0.01,
      countPerBatch = 10,
      intervalMs = 1000,
    } = options;

    let currentPrice = initialPrice;

    while (!this.stopSimulation) {
      for (let i = 0; i < countPerBatch; i++) {
        const unixTime = Date.now();

        // Generate standard normal random
        const randomStdNormal = this.generateStandardNormal();

        // GBM-like price change
        const deltaPrice =
          currentPrice * (drift + volatility * randomStdNormal);
        currentPrice = Math.max(currentPrice + deltaPrice, 0.01);

        // Emit a tuple [timestamp, price]
        this.priceSubject.next([unixTime, parseFloat(currentPrice.toFixed(2))]);

        if (this.stopSimulation) break;
      }

      // Wait before producing the next batch
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * Generates a random number following a standard normal distribution
   * using the Box-Muller transform.
   */
  private generateStandardNormal(): number {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}
