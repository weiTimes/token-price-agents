export interface PriceData {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeWindow {
  startTime: string; // 格式 HH:mm
  endTime: string; // 格式 HH:mm
  prices: PriceData[];
}

export interface WindowState {
  windows: TimeWindow[];
  lastCheck: number;
}

export interface PriceCondition {
  type: string;
  parameters: Record<string, any>;
  description: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  condition: PriceCondition;
  createdAt: Date;
  updatedAt: Date;
}
