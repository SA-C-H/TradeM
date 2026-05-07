// The SBR System — personal trading playbook
// Sweep · Break · Retest — SMC framework for Forex & Gold

export const SBR_PLAYBOOK = {
  name: 'SBR System — Sweep · Break · Retest',
  description:
    'Smart Money Concepts framework for Forex & Gold. 3-stage setup, top-down MTF, 1% risk / 3RR, NY & London sessions only.',
  conditions: [
    { label: 'Stage 1 — Liquidity Sweep confirmed', description: 'A buyside or sellside liquidity level has been swept (wick through or close beyond, then rejection).' },
    { label: 'Stage 2 — BOS or CHoCH after the sweep', description: 'Previous swing high/low broken in the impulse direction (BOS = continuation, CHoCH = reversal).' },
    { label: 'Stage 3 — Retest of 50% Fibonacci zone', description: 'Price retraced into the discount zone (longs) or premium zone (shorts) of the impulse leg.' },
    { label: 'HTF alignment (4H / 1H bias matches)', description: 'Trade direction aligns with the higher-timeframe trend. No counter-trend setups.' },
    { label: 'Active session (London 08–12 or NY 14–20)', description: 'Trade taken inside the London or New York session window only.' },
    { label: 'Risk ≤ 1% of account', description: 'Position sized so SL = max 1% account risk. If multiple positions are open, risk is divided across them.' },
    { label: 'Risk:Reward ≥ 3RR', description: 'Take profit is at minimum 3R from entry. Below 3RR potential = no trade.' },
    { label: 'TP located at structure / key zone', description: 'TP coincides with a structural level (swing high/low, key zone). Not 3RR in empty space.' },
    { label: 'Hard SL set immediately upon entry', description: 'Stop loss placed below demand zone (longs) or above supply zone (shorts). No mental stops.' },
  ],
};

export interface SbrSection {
  id: string;
  number: string;
  title: string;
  intro?: string;
  blocks: SbrBlock[];
}

export type SbrBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'rule'; title: string; lines: string[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'kv'; rows: { k: string; v: string }[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'stats'; items: { value: string; label: string }[] }
  | { kind: 'stages'; items: { tag: string; title: string; subtitle: string }[] };

export const SBR_SECTIONS: SbrSection[] = [
  {
    id: 'overview',
    number: '01',
    title: 'System Overview',
    intro:
      'The SBR System is a rules-based day trading framework built on a curated subset of Smart Money Concepts. It chains the most essential ideas into three sequential stages — eliminating confusion at execution.',
    blocks: [
      {
        kind: 'stages',
        items: [
          { tag: '01', title: 'SWEEP', subtitle: 'Liquidity taken' },
          { tag: '02', title: 'BREAK', subtitle: 'BOS / CHoCH' },
          { tag: '03', title: 'RETEST', subtitle: '50% Fibonacci zone' },
        ],
      },
      {
        kind: 'kv',
        rows: [
          { k: 'Markets', v: 'Forex pairs & Gold (XAUUSD)' },
          { k: 'Style', v: 'Day Trading (primary) — swing allowed' },
          { k: 'Sessions', v: 'London 08:00–12:00 · NY 14:00–20:00' },
        ],
      },
      {
        kind: 'rule',
        title: 'NON-NEGOTIABLE RULE',
        lines: [
          'Only take a trade when ALL three stages of the SBR setup are confirmed.',
          'No exceptions. If one stage is missing, there is NO setup.',
        ],
      },
    ],
  },
  {
    id: 'stages',
    number: '02',
    title: 'The Three Stages',
    blocks: [
      { kind: 'paragraph', text: 'Stage 1 — Liquidity Sweep. Liquidity pools at obvious levels: above swing highs (buyside) and below swing lows (sellside). Price hunts these pools to fill institutional orders before the true move.' },
      { kind: 'list', items: [
        'Mark previous swing highs (buyside liquidity)',
        'Mark previous swing lows (sellside liquidity)',
        'Mark recent consolidation zones where stops cluster',
        'Watch for an aggressive wick/close beyond the level → rejection',
      ]},
      { kind: 'paragraph', text: 'Stage 2 — Break of Structure (BOS) or Change of Character (CHoCH). After the sweep, the impulsive move must break the previous swing high or low. BOS = trend continuation. CHoCH = potential reversal.' },
      { kind: 'rule', title: 'KEY RULE', lines: [
        'Once liquidity is taken AND the previous high/low is broken,',
        'we are confirmed in Stage 2. Do NOT enter before both conditions are met.',
      ]},
      { kind: 'paragraph', text: 'Stage 3 — Retest of the 50% Fibonacci zone. Wait for price to retrace into the discount zone (longs) or premium zone (shorts) of the impulse leg.' },
      { kind: 'table', headers: ['Direction', 'Zone'], rows: [
        ['Bullish', 'Discount — below 50% of impulse'],
        ['Bearish', 'Premium — above 50% of impulse'],
      ]},
      { kind: 'rule', title: 'PROBABILITY MINDSET', lines: [
        'No zone is guaranteed to hold. Manage risk accordingly.',
        'The edge comes from consistency, not from any single trade.',
      ]},
    ],
  },
  {
    id: 'mtf',
    number: '03',
    title: 'Multi-Timeframe Analysis',
    intro: 'Top-down: from the highest timeframe down to execution. Never skip a timeframe.',
    blocks: [
      { kind: 'table', headers: ['Level', 'Timeframe', 'Purpose'], rows: [
        ['HTF', '4H & 1H', 'Overall direction and bias'],
        ['MTF', '15min', 'Mark recent BOS/CHoCH and active zone'],
        ['ETF', '5min', 'Confirm retest and execute the entry'],
      ]},
      { kind: 'rule', title: 'ALIGNMENT RULE', lines: [
        'Only take a trade if the LTF is aligned with the HTF bias.',
        'Counter-trend setups are NOT taken in this system.',
      ]},
      { kind: 'list', items: [
        '4H — identify trend, mark major swings',
        '1H — confirm trend, mark major liquidity zones',
        '15min — mark recent BOS/CHoCH, draw Fib on the impulse leg',
        '5min — wait for retest, look for confirmation BOS/CHoCH, execute',
      ]},
    ],
  },
  {
    id: 'sessions',
    number: '04',
    title: 'Trading Sessions',
    blocks: [
      { kind: 'table', headers: ['Session', 'Hours', 'Notes'], rows: [
        ['London', '08:00 – 12:00', 'High-volatility open, common liquidity sweeps'],
        ['New York', '14:00 – 20:00', 'Highest volume, strong moves on Gold & USD pairs'],
      ]},
      { kind: 'rule', title: 'PRE-MARKET ROUTINE', lines: [
        'Awake BEFORE 08:00. Analysis complete before any session begins.',
        'Do not trade without completing your analysis — a rushed trade is a bad trade.',
      ]},
      { kind: 'list', items: [
        'Review 4H / 1H — confirm trend and bias',
        'Mark all key liquidity levels',
        'Identify active BOS/CHoCH zones on 15min',
        'Draw Fib on the most recent impulse legs',
        'Note high-impact news for Forex & Gold',
        'Confirm risk parameters for the day',
      ]},
      { kind: 'rule', title: 'NO TRADES OUTSIDE SESSIONS', lines: [
        'Low-liquidity periods produce false signals.',
        'No valid setup during session hours = NO TRADE.',
      ]},
    ],
  },
  {
    id: 'risk',
    number: '05',
    title: 'Risk Management',
    blocks: [
      { kind: 'stats', items: [
        { value: '1%', label: 'Risk per trade' },
        { value: '2%', label: 'Max daily risk' },
        { value: '3RR', label: 'Min Risk:Reward' },
        { value: '3', label: 'Max open (Gold)' },
      ]},
      { kind: 'paragraph', text: 'Position sizing — risk is DIVIDED across open positions, never added.' },
      { kind: 'table', headers: ['Open positions', 'Risk per position'], rows: [
        ['1', '1.00%'],
        ['2', '0.50% (1% total)'],
        ['3', '0.33% (1% total)'],
      ]},
      { kind: 'rule', title: 'STOP LOSS RULE', lines: [
        'SL placed structurally — below the demand zone (longs) or above the supply zone (shorts).',
        'If the zone is invalidated, the trade thesis is wrong — the stop protects against this.',
        'Hard SL set immediately upon entry. No mental stops. No exceptions.',
      ]},
      { kind: 'rule', title: 'TP MUST BE AT STRUCTURE', lines: [
        '3RR landing in the middle of nowhere is not a valid take profit.',
        'TP must coincide with a key zone or structural level.',
      ]},
    ],
  },
  {
    id: 'management',
    number: '06',
    title: 'Trade Management',
    blocks: [
      { kind: 'rule', title: 'ONCE OPEN — DO NOT TOUCH IT', lines: [
        'Do not move the stop loss (except to breakeven at TP3).',
        'Do not close early out of fear. Do not add to a losing position.',
        'Do not widen the stop. The trade was planned before entry — trust the plan.',
      ]},
      { kind: 'table', headers: ['Rule', 'Detail'], rows: [
        ['When to BE', 'Only when price reaches TP3 level'],
        ['Where', 'Exactly at entry price'],
        ['Why TP3', 'Earlier BE cuts winners short — TP3 lets the trade breathe'],
      ]},
      { kind: 'list', items: [
        '1. Stage 1 confirmed — liquidity swept',
        '2. Stage 2 confirmed — BOS or CHoCH after the sweep',
        '3. Stage 3 confirmed — price in 50% Fibonacci zone',
        '4. HTF alignment confirmed (4H / 1H)',
        '5. Inside London or NY session',
        '6. Risk = max 1% of account',
        '7. R:R ≥ 3RR confirmed',
        '8. TP at structure / key zone',
        '9. Hard SL set immediately',
      ]},
    ],
  },
  {
    id: 'mindset',
    number: '07',
    title: 'Goals & Mindset',
    blocks: [
      { kind: 'rule', title: 'CONSISTENCY — NOT PROFIT', lines: [
        'The primary objective is consistency in following the system.',
        'Profitability is a by-product of consistency — not the other way around.',
      ]},
      { kind: 'paragraph', text: 'Personal why — geographical freedom and financial independence. To retire my mother and give her the life she deserves.' },
      { kind: 'list', items: [
        'The market owes you nothing. You earn your edge through discipline.',
        'A day with no valid setup = a good day. Not forcing trades is a skill.',
        'Focus on the process, not the outcome.',
        'Review every trade — winners and losers.',
        'Losses are tuition fees. Accept, learn, move forward.',
      ]},
      { kind: 'table', headers: ['Horizon', 'Milestone'], rows: [
        ['Short-term', '3 consecutive months of rule-following (regardless of PnL)'],
        ['Mid-term', 'Consistent monthly profitability following the rules exactly'],
        ['Long-term', 'Financial and geographical freedom through trading income'],
      ]},
    ],
  },
];
