export type TradingSession = 'London' | 'New York' | 'Asian';
export type TradeDirection = 'long' | 'short';
export type EmotionalState = 'calm' | 'confident' | 'anxious' | 'fearful' | 'greedy' | 'frustrated' | 'neutral';

export interface PlaybookCondition {
  id: string;
  label: string;
  description?: string;
}

export interface TradePlaybookCheck {
  conditionId: string;
  respected: boolean;
}

export interface Trade {
  id: string;
  instrument: string;
  date: string;
  time: string;
  session: TradingSession;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  result: number;
  riskAmount: number;
  riskPercent: number;
  rrRatio: number;
  strategy: string;
  reason: string;
  emotionBefore: EmotionalState;
  emotionDuring: EmotionalState;
  emotionAfter: EmotionalState;
  playbookChecks: TradePlaybookCheck[];
  isValid: boolean;
  imagesBefore?: string[];
  imagesAfter?: string[];
  createdAt: string;
}
