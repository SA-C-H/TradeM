import { useMemo } from 'react';
import { useTradesAdapted } from '@/hooks/use-trades-adapted';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, ReferenceLine } from 'recharts';
import { TrendingDown, Activity, Gauge } from 'lucide-react';

const tooltipStyle = { background: 'hsl(220, 12%, 8%)', border: '1px solid hsl(220, 10%, 15%)', borderRadius: '8px', color: 'hsl(210, 20%, 92%)', boxShadow: 'none' };
const tooltipWrapperStyle = { outline: 'none', border: 'none', boxShadow: 'none' };
const money = (v: number) => `$${Number(v).toFixed(2)}`;

export default function Analytics() {
  const { trades: mockTrades, isLoading } = useTradesAdapted();

  const { hourData, comparisonData, emotionPnL, strategyData, dayFreq, drawdownCurve, riskMetrics, instrumentData, distribution, calendarHeatmap, weeksRange } = useMemo(() => {
    const hourData = Array.from({ length: 24 }, (_, h) => {
      const hourTrades = mockTrades.filter(t => parseInt(t.time.split(':')[0]) === h);
      return { hour: `${String(h).padStart(2, '0')}:00`, pnl: Number(hourTrades.reduce((s, t) => s + t.result, 0).toFixed(2)) };
    });

    const validTrades = mockTrades.filter(t => t.isValid);
    const invalidTrades = mockTrades.filter(t => !t.isValid);
    const validWinRate = validTrades.length ? (validTrades.filter(t => t.result > 0).length / validTrades.length * 100) : 0;
    const invalidWinRate = invalidTrades.length ? (invalidTrades.filter(t => t.result > 0).length / invalidTrades.length * 100) : 0;

    const comparisonData = [
      { name: 'Win Rate %', valid: Math.round(validWinRate), invalid: Math.round(invalidWinRate) },
      { name: 'Avg RR', valid: Number((validTrades.reduce((s, t) => s + t.rrRatio, 0) / (validTrades.length || 1)).toFixed(2)), invalid: Number((invalidTrades.reduce((s, t) => s + t.rrRatio, 0) / (invalidTrades.length || 1)).toFixed(2)) },
      { name: 'Avg P&L', valid: Math.round(validTrades.reduce((s, t) => s + t.result, 0) / (validTrades.length || 1)), invalid: Math.round(invalidTrades.reduce((s, t) => s + t.result, 0) / (invalidTrades.length || 1)) },
    ];

    const emotionPnL = ['calm', 'confident', 'anxious', 'fearful', 'greedy', 'frustrated', 'neutral'].map(e => {
      const trades = mockTrades.filter(t => t.emotionBefore === e);
      return { emotion: e, trades: trades.length, avgPnL: trades.length ? Number((trades.reduce((s, t) => s + t.result, 0) / trades.length).toFixed(2)) : 0 };
    }).filter(e => e.trades > 0);

    const strategies = [...new Set(mockTrades.map(t => t.strategy).filter(Boolean))];
    const strategyData = strategies.map(s => {
      const trades = mockTrades.filter(t => t.strategy === s);
      const wins = trades.filter(t => t.result > 0);
      return { strategy: s, trades: trades.length, winRate: Math.round((wins.length / trades.length) * 100), pnl: Number(trades.reduce((sum, t) => sum + t.result, 0).toFixed(2)) };
    });

    const dayFreq = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => {
      const dayMap = [1, 2, 3, 4, 5, 6, 0];
      return { day: d, count: mockTrades.filter(t => new Date(t.date).getDay() === dayMap[i]).length };
    });

    // === Drawdown curve & risk metrics ===
    const sorted = [...mockTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cum = 0; let peak = 0; let maxDD = 0;
    const drawdownCurve = sorted.map((t, i) => {
      cum += t.result;
      if (cum > peak) peak = cum;
      const dd = peak - cum;
      if (dd > maxDD) maxDD = dd;
      return { i, label: t.date, equity: Number(cum.toFixed(2)), drawdown: Number((-dd).toFixed(2)) };
    });
    // Sharpe / Sortino on per-trade returns
    const returns = sorted.map(t => t.result);
    const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length ? returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length : 0;
    const std = Math.sqrt(variance);
    const downside = returns.filter(r => r < 0);
    const downsideStd = downside.length ? Math.sqrt(downside.reduce((a, b) => a + b ** 2, 0) / downside.length) : 0;
    const sharpe = std > 0 ? Number((mean / std).toFixed(2)) : 0;
    const sortino = downsideStd > 0 ? Number((mean / downsideStd).toFixed(2)) : 0;
    const riskMetrics = { sharpe, sortino, maxDD: Number(maxDD.toFixed(2)), avgTrade: Number(mean.toFixed(2)) };

    // === Performance par instrument ===
    const instruments = [...new Set(mockTrades.map(t => t.instrument).filter(Boolean))];
    const instrumentData = instruments.map(inst => {
      const trades = mockTrades.filter(t => t.instrument === inst);
      const wins = trades.filter(t => t.result > 0);
      return {
        instrument: inst,
        pnl: Number(trades.reduce((s, t) => s + t.result, 0).toFixed(2)),
        trades: trades.length,
        winRate: trades.length ? Math.round((wins.length / trades.length) * 100) : 0,
      };
    }).sort((a, b) => b.pnl - a.pnl);

    // === Distribution histogram ===
    const allResults = mockTrades.map(t => t.result);
    let distribution: { bucket: string; count: number; mid: number }[] = [];
    if (allResults.length) {
      const minR = Math.min(...allResults);
      const maxR = Math.max(...allResults);
      const range = maxR - minR || 1;
      const bins = Math.min(12, Math.max(6, Math.ceil(Math.sqrt(allResults.length))));
      const step = range / bins;
      distribution = Array.from({ length: bins }, (_, i) => {
        const lo = minR + step * i;
        const hi = i === bins - 1 ? maxR + 0.0001 : lo + step;
        const mid = (lo + hi) / 2;
        const count = allResults.filter(r => r >= lo && r < hi).length;
        return { bucket: `${lo.toFixed(0)}`, count, mid: Number(mid.toFixed(2)) };
      });
    }

    // === Calendar heatmap (last 12 weeks) ===
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeks = 12;
    const start = new Date(today);
    start.setDate(start.getDate() - (weeks * 7 - 1));
    // Align to Monday
    const dayOfWeek = (start.getDay() + 6) % 7; // Mon=0
    start.setDate(start.getDate() - dayOfWeek);
    const weeksRange = weeks + 1;
    const dailyPnL = new Map<string, number>();
    mockTrades.forEach(t => {
      const k = t.date;
      dailyPnL.set(k, (dailyPnL.get(k) || 0) + t.result);
    });
    const calendarHeatmap: { date: string; pnl: number; week: number; dow: number }[] = [];
    for (let w = 0; w < weeksRange; w++) {
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start);
        dt.setDate(start.getDate() + w * 7 + d);
        if (dt > today) continue;
        const key = dt.toISOString().slice(0, 10);
        calendarHeatmap.push({ date: key, pnl: Number((dailyPnL.get(key) || 0).toFixed(2)), week: w, dow: d });
      }
    }

    return { hourData, comparisonData, emotionPnL, strategyData, dayFreq, drawdownCurve, riskMetrics, instrumentData, distribution, calendarHeatmap, weeksRange };
  }, [mockTrades]);

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground sm:p-6">Chargement...</div>;
  if (mockTrades.length === 0) return (
    <div className="space-y-2 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
      <p className="text-sm text-muted-foreground">Aucun trade pour l'instant.</p>
    </div>
  );

  // Color scale helper for heatmap (semantic, no high-contrast bg)
  const heatColor = (pnl: number, maxAbs: number) => {
    if (pnl === 0 || maxAbs === 0) return 'hsl(var(--muted) / 0.4)';
    const intensity = Math.min(1, Math.abs(pnl) / maxAbs);
    const alpha = 0.18 + intensity * 0.72;
    return pnl > 0
      ? `hsl(142 70% 45% / ${alpha})`
      : `hsl(0 72% 55% / ${alpha})`;
  };
  const maxAbsDay = Math.max(1, ...calendarHeatmap.map(c => Math.abs(c.pnl)));

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6">
      <h1 className="text-lg sm:text-xl font-semibold text-foreground">Analytics</h1>

      {/* Risk metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Sharpe', value: riskMetrics.sharpe.toFixed(2), icon: Gauge, color: riskMetrics.sharpe >= 1 ? 'text-primary' : 'text-foreground' },
          { label: 'Sortino', value: riskMetrics.sortino.toFixed(2), icon: Activity, color: riskMetrics.sortino >= 1 ? 'text-primary' : 'text-foreground' },
          { label: 'Max Drawdown', value: `-$${riskMetrics.maxDD.toFixed(2)}`, icon: TrendingDown, color: 'text-destructive' },
          { label: 'Avg / Trade', value: `${riskMetrics.avgTrade >= 0 ? '+' : ''}$${riskMetrics.avgTrade.toFixed(2)}`, icon: Activity, color: riskMetrics.avgTrade >= 0 ? 'text-primary' : 'text-destructive' },
        ].map(m => (
          <Card key={m.label} className="bg-card/60 border-border/60 dash-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground truncate">{m.label}</span>
              </div>
              <p className={`text-lg sm:text-xl font-semibold font-mono tabular-nums ${m.color}`}>{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Drawdown curve */}
      <Card className="bg-card/60 border-border/60 dash-card">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm font-medium">Courbe de drawdown</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownCurve} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" stroke="hsl(var(--border))" strokeOpacity={0.6} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} width={40} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  wrapperStyle={tooltipWrapperStyle}
                  cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
                  formatter={(v: number) => [money(v), 'Drawdown']}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Area type="monotone" dataKey="drawdown" stroke="hsl(0, 72%, 55%)" strokeWidth={2} fill="url(#ddGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PnL distribution */}
        <Card className="bg-card/60 border-border/60 dash-card">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-medium">Distribution des résultats</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-44 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} className="recharts-glow" margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} width={30} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    wrapperStyle={tooltipWrapperStyle}
                    cursor={false}
                    formatter={(v: number, _n, p: any) => [`${v} trades`, `≈ ${money(p?.payload?.mid ?? 0)}`]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distribution.map((entry, i) => {
                      const c = entry.mid >= 0 ? 'hsl(142, 70%, 45%)' : 'hsl(0, 72%, 55%)';
                      return <Cell key={i} fill={c} style={{ color: c }} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance par instrument */}
        <Card className="bg-card/60 border-border/60 dash-card">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-medium">Performance par instrument</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-44 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={instrumentData} layout="vertical" className="recharts-glow" margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="instrument" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} width={70} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    wrapperStyle={tooltipWrapperStyle}
                    cursor={false}
                    formatter={(v: number, _n, p: any) => [
                      `${money(v)} · ${p?.payload?.trades} trades · ${p?.payload?.winRate}% WR`,
                      'P&L',
                    ]}
                  />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                    {instrumentData.map((entry, i) => {
                      const c = entry.pnl >= 0 ? 'hsl(142, 70%, 45%)' : 'hsl(0, 72%, 55%)';
                      return <Cell key={i} fill={c} style={{ color: c }} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar heatmap */}
      <Card className="bg-card/60 border-border/60 dash-card">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm font-medium">Heatmap calendrier — 12 dernières semaines</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="flex gap-3 overflow-x-auto pb-2">
            <div className="flex flex-col gap-1 text-[9px] text-muted-foreground pt-0.5 shrink-0">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                <div key={d} className="h-3.5 flex items-center">{d}</div>
              ))}
            </div>
            <div className="flex gap-1">
              {Array.from({ length: weeksRange }).map((_, w) => (
                <div key={w} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((_, d) => {
                    const cell = calendarHeatmap.find(c => c.week === w && c.dow === d);
                    if (!cell) return <div key={d} className="w-3.5 h-3.5 rounded-[3px] bg-transparent" />;
                    return (
                      <div
                        key={d}
                        className="w-3.5 h-3.5 rounded-[3px] border border-border/40 transition-transform hover:scale-125"
                        style={{ backgroundColor: heatColor(cell.pnl, maxAbsDay) }}
                        title={`${cell.date} · ${cell.pnl >= 0 ? '+' : ''}$${cell.pnl.toFixed(2)}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
            <span>Perte</span>
            <div className="flex gap-0.5">
              {[0.9, 0.6, 0.3].map(a => <div key={a} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: `hsl(0 72% 55% / ${a})` }} />)}
              <div className="w-3 h-3 rounded-[3px] bg-muted/40" />
              {[0.3, 0.6, 0.9].map(a => <div key={a} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: `hsl(142 70% 45% / ${a})` }} />)}
            </div>
            <span>Profit</span>
          </div>
        </CardContent>
      </Card>

      {/* Performance by hour */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm font-medium">Performances par heure</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData.filter(h => h.pnl !== 0)} className="recharts-glow" margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 15%)" />
                <XAxis dataKey="hour" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 9 }} width={35} />
                <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {hourData.filter(h => h.pnl !== 0).map((entry, i) => {
                    const c = entry.pnl >= 0 ? 'hsl(142, 70%, 45%)' : 'hsl(0, 72%, 55%)';
                    return <Cell key={i} fill={c} style={{ color: c }} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Valid vs Invalid */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-medium">Valid vs Invalid Trades</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-44 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} className="recharts-glow" margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 15%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} width={35} />
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                  <Bar dataKey="valid" fill="hsl(142, 70%, 45%)" radius={[4, 4, 0, 0]} name="Valid" style={{ color: 'hsl(142, 70%, 45%)' }} />
                  <Bar dataKey="invalid" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} name="Invalid" style={{ color: 'hsl(0, 72%, 55%)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                <span className="text-muted-foreground">Valid</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-destructive" />
                <span className="text-muted-foreground">Invalid</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emotion Analysis */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-medium">Analyse émotionnelle</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-44 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emotionPnL} className="recharts-glow" margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 15%)" />
                  <XAxis dataKey="emotion" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 9 }} angle={-25} textAnchor="end" height={45} interval={0} />
                  <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} width={35} />
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                  <Bar dataKey="avgPnL" radius={[4, 4, 0, 0]} name="Avg P&L">
                    {emotionPnL.map((entry, i) => {
                      const c = entry.avgPnL >= 0 ? 'hsl(142, 70%, 45%)' : 'hsl(0, 72%, 55%)';
                      return <Cell key={i} fill={c} style={{ color: c }} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Performance */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-medium">Performances par stratégie</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="space-y-2 sm:space-y-3">
              {strategyData.map(s => (
                <div key={s.strategy} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{s.strategy}</p>
                    <p className="text-xs text-muted-foreground">{s.trades} trades · {s.winRate}% WR</p>
                  </div>
                  <span className={`font-mono text-sm font-medium shrink-0 ${s.pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {s.pnl >= 0 ? '+' : ''}{s.pnl.toFixed(2)}$
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trade Frequency */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-medium">Fréquence de trading</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-44 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayFreq} className="recharts-glow" margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 15%)" />
                  <XAxis dataKey="day" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                  <Bar dataKey="count" fill="hsl(217, 90%, 55%)" radius={[4, 4, 0, 0]} name="Trades" style={{ color: 'hsl(217, 90%, 55%)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
