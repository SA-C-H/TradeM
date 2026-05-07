import { Trade, PlaybookCondition } from './types';

export const mockPlaybookConditions: PlaybookCondition[] = [
  { id: 'pb1', label: 'Confluences identifiées (3+)', description: 'Au moins 3 confluences techniques' },
  { id: 'pb2', label: 'Structure de marché claire', description: 'Tendance ou range bien défini' },
  { id: 'pb3', label: 'RR minimum 2:1', description: 'Risk/Reward minimum de 2:1' },
  { id: 'pb4', label: 'Session de trading appropriée', description: 'Trade pris pendant une session active' },
  { id: 'pb5', label: 'Risque ≤ 1% du capital', description: 'Risque par trade respecté' },
];

export const mockTrades: Trade[] = [
  {
    id: '1', instrument: 'EUR/USD', date: '2025-06-04', time: '09:30', session: 'London',
    direction: 'long', entryPrice: 1.13238, stopLoss: 1.12464, takeProfit: 1.14500,
    result: 845.49, riskAmount: 50, riskPercent: 1, rrRatio: 3.22, strategy: 'Break & Retest',
    reason: 'Retest of broken structure with FVG fill', emotionBefore: 'calm', emotionDuring: 'confident', emotionAfter: 'calm',
    playbookChecks: [
      { conditionId: 'pb1', respected: true }, { conditionId: 'pb2', respected: true },
      { conditionId: 'pb3', respected: true }, { conditionId: 'pb4', respected: true }, { conditionId: 'pb5', respected: true },
    ],
    isValid: true, createdAt: '2025-06-04T09:30:00Z',
  },
  {
    id: '2', instrument: 'EUR/USD', date: '2025-06-06', time: '14:15', session: 'New York',
    direction: 'long', entryPrice: 1.09864, stopLoss: 1.09565, takeProfit: 1.10800,
    result: 1655.15, riskAmount: 50, riskPercent: 1, rrRatio: 2.76, strategy: 'Order Block',
    reason: 'Bullish OB in premium zone', emotionBefore: 'confident', emotionDuring: 'calm', emotionAfter: 'confident',
    playbookChecks: [
      { conditionId: 'pb1', respected: true }, { conditionId: 'pb2', respected: true },
      { conditionId: 'pb3', respected: true }, { conditionId: 'pb4', respected: true }, { conditionId: 'pb5', respected: true },
    ],
    isValid: true, createdAt: '2025-06-06T14:15:00Z',
  },
  {
    id: '3', instrument: 'EUR/USD', date: '2025-06-18', time: '10:00', session: 'London',
    direction: 'short', entryPrice: 1.12522, stopLoss: 1.12974, takeProfit: 1.11500,
    result: 524.17, riskAmount: 50, riskPercent: 1, rrRatio: 2.68, strategy: 'Supply Zone',
    reason: 'Rejection at supply zone with bearish engulfing', emotionBefore: 'calm', emotionDuring: 'anxious', emotionAfter: 'calm',
    playbookChecks: [
      { conditionId: 'pb1', respected: true }, { conditionId: 'pb2', respected: true },
      { conditionId: 'pb3', respected: true }, { conditionId: 'pb4', respected: true }, { conditionId: 'pb5', respected: true },
    ],
    isValid: true, createdAt: '2025-06-18T10:00:00Z',
  },
  {
    id: '4', instrument: 'EUR/USD', date: '2025-06-19', time: '08:45', session: 'London',
    direction: 'short', entryPrice: 1.11255, stopLoss: 1.11473, takeProfit: 1.10500,
    result: -50, riskAmount: 50, riskPercent: 1, rrRatio: -0.17, strategy: 'Break & Retest',
    reason: 'Bearish retest of structure', emotionBefore: 'anxious', emotionDuring: 'fearful', emotionAfter: 'frustrated',
    playbookChecks: [
      { conditionId: 'pb1', respected: false }, { conditionId: 'pb2', respected: true },
      { conditionId: 'pb3', respected: false }, { conditionId: 'pb4', respected: true }, { conditionId: 'pb5', respected: true },
    ],
    isValid: false, createdAt: '2025-06-19T08:45:00Z',
  },
  {
    id: '5', instrument: 'EUR/USD', date: '2025-06-19', time: '15:30', session: 'New York',
    direction: 'long', entryPrice: 1.09911, stopLoss: 1.09401, takeProfit: 1.11000,
    result: -50, riskAmount: 50, riskPercent: 1, rrRatio: 1.94, strategy: 'FVG Fill',
    reason: 'FVG fill with bullish structure', emotionBefore: 'greedy', emotionDuring: 'anxious', emotionAfter: 'frustrated',
    playbookChecks: [
      { conditionId: 'pb1', respected: true }, { conditionId: 'pb2', respected: false },
      { conditionId: 'pb3', respected: false }, { conditionId: 'pb4', respected: true }, { conditionId: 'pb5', respected: true },
    ],
    isValid: false, createdAt: '2025-06-19T15:30:00Z',
  },
  {
    id: '6', instrument: 'GBP/USD', date: '2025-06-19', time: '09:15', session: 'London',
    direction: 'long', entryPrice: 1.27500, stopLoss: 1.27100, takeProfit: 1.28500,
    result: -50, riskAmount: 50, riskPercent: 1, rrRatio: 2.50, strategy: 'Break & Retest',
    reason: 'Structure break with volume confirmation', emotionBefore: 'neutral', emotionDuring: 'calm', emotionAfter: 'neutral',
    playbookChecks: [
      { conditionId: 'pb1', respected: true }, { conditionId: 'pb2', respected: true },
      { conditionId: 'pb3', respected: true }, { conditionId: 'pb4', respected: true }, { conditionId: 'pb5', respected: true },
    ],
    isValid: true, createdAt: '2025-06-19T09:15:00Z',
  },
  {
    id: '7', instrument: 'XAU/USD', date: '2025-06-19', time: '14:00', session: 'New York',
    direction: 'short', entryPrice: 2350.50, stopLoss: 2355.00, takeProfit: 2340.00,
    result: -50, riskAmount: 50, riskPercent: 1, rrRatio: 2.33, strategy: 'Supply Zone',
    reason: 'Strong supply zone rejection', emotionBefore: 'confident', emotionDuring: 'confident', emotionAfter: 'frustrated',
    playbookChecks: [
      { conditionId: 'pb1', respected: true }, { conditionId: 'pb2', respected: true },
      { conditionId: 'pb3', respected: true }, { conditionId: 'pb4', respected: true }, { conditionId: 'pb5', respected: false },
    ],
    isValid: false, createdAt: '2025-06-19T14:00:00Z',
  },
  {
    id: '8', instrument: 'EUR/USD', date: '2025-06-19', time: '16:30', session: 'New York',
    direction: 'long', entryPrice: 1.10200, stopLoss: 1.09900, takeProfit: 1.10800,
    result: -869.80, riskAmount: 50, riskPercent: 1, rrRatio: 2.00, strategy: 'Order Block',
    reason: 'Demand zone bounce', emotionBefore: 'frustrated', emotionDuring: 'fearful', emotionAfter: 'frustrated',
    playbookChecks: [
      { conditionId: 'pb1', respected: false }, { conditionId: 'pb2', respected: false },
      { conditionId: 'pb3', respected: true }, { conditionId: 'pb4', respected: true }, { conditionId: 'pb5', respected: false },
    ],
    isValid: false, createdAt: '2025-06-19T16:30:00Z',
  },
];
