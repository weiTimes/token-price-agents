export interface PriceComparisonCondition {
  type: 'OPEN' | 'CLOSE' | 'HIGH' | 'LOW';
  comparison: 'HIGHER' | 'LOWER';
  target: 'PREVIOUS' | 'FIXED_VALUE';
  value?: number; // 用于固定值比较
  timeframe?: string; // 用于指定比较的时间范围
}

export interface NotificationTiming {
  frequency: 'IMMEDIATE' | 'INTERVAL';
  interval?: number; // 以毫秒为单位
}

export interface PriceIntent {
  conditions: PriceComparisonCondition[];
  operator: 'AND' | 'OR'; // 用于组合多个条件
  notification: NotificationTiming;
}

// 用于存储原始的自然语言意图和解析后的结构化数据
export interface UserIntent {
  rawIntent: string;
  userId: string;
  parsedIntent: PriceIntent;
}
