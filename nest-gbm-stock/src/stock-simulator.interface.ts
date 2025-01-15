/**
 * A tuple of [unixTime, price].
 */
export type PriceTuple = [number, number];

/**
 * Configuration options for the GBM-based stock price simulator.
 */
export interface StockSimulatorOptions {
  initialPrice?: number;      // Starting price of the stock
  drift?: number;             // Expected return (μ)
  volatility?: number;        // Volatility (σ)
  countPerBatch?: number;     // Number of price updates per batch
  intervalMs?: number;        // Interval in milliseconds between batches
}
