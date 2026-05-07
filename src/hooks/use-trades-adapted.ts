import { useTrades } from './use-trades';
import type { Trade, TradingSession, TradeDirection, EmotionalState, TradePlaybookCheck } from '@/lib/types';

function adapt(row: any): Trade {
  return {
    id: row.id,
    instrument: row.instrument ?? '',
    date: row.trade_date ?? '',
    time: (row.trade_time ?? '').slice(0, 5),
    session: (row.session ?? 'London') as TradingSession,
    direction: (row.direction ?? 'long') as TradeDirection,
    entryPrice: Number(row.entry_price ?? 0),
    stopLoss: Number(row.stop_loss ?? 0),
    takeProfit: Number(row.take_profit ?? 0),
    result: Number(row.result ?? 0),
    riskAmount: Number(row.risk_amount ?? 0),
    riskPercent: Number(row.risk_percent ?? 0),
    rrRatio: Number(row.rr_ratio ?? 0),
    strategy: row.strategy ?? '',
    reason: row.reason ?? '',
    emotionBefore: (row.emotion_before ?? 'neutral') as EmotionalState,
    emotionDuring: (row.emotion_during ?? 'neutral') as EmotionalState,
    emotionAfter: (row.emotion_after ?? 'neutral') as EmotionalState,
    playbookChecks: (Array.isArray(row.playbook_checks) ? row.playbook_checks : []) as TradePlaybookCheck[],
    isValid: !!row.is_valid,
    createdAt: row.created_at ?? '',
  };
}

export function useTradesAdapted(): { trades: Trade[]; isLoading: boolean } {
  const { data = [], isLoading } = useTrades();
  return { trades: data.map(adapt), isLoading };
}
