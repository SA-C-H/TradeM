import { useState, useMemo } from 'react';
import { useTradesAdapted } from '@/hooks/use-trades-adapted';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, LineChart, Line, ReferenceLine, ReferenceDot, Brush } from 'recharts';
import { TrendingUp, TrendingDown, Target, BarChart3, CheckCircle2, XCircle, Info } from 'lucide-react';

const tooltipStyle = { background: 'hsl(220, 12%, 8%)', border: '1px solid hsl(220, 10%, 15%)', borderRadius: '8px', color: 'hsl(210, 20%, 92%)', boxShadow: 'none' };
const tooltipWrapperStyle = { outline: 'none', border: 'none', boxShadow: 'none' };
const money = (v: number) => `$${Math.abs(Number(v)).toFixed(2)}`;

function DayPerfTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  const profit = Number(row.profit ?? 0);
  const loss = Number(row.loss ?? 0);
  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2 shadow-none">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <div className="mt-1 space-y-0.5 text-xs">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Profit</span>
          <span className="font-mono tabular-nums text-primary">{money(profit)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Perte</span>
          <span className="font-mono tabular-nums text-destructive">-{money(loss)}</span>
        </div>
      </div>
    </div>
  );
}

function DirectionTooltip({ active, payload, totalTrades }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  const name = String(row.name ?? '');
  const value = Number(row.value ?? 0);
  const pct = totalTrades ? (value / totalTrades) * 100 : 0;
  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2 shadow-none">
      <div className="text-xs font-semibold text-foreground">{name}</div>
      <div className="mt-1 flex items-center justify-between gap-6 text-xs">
        <span className="text-muted-foreground">Trades</span>
        <span className="font-mono tabular-nums text-foreground">
          {value} <span className="text-muted-foreground">({pct.toFixed(1)}%)</span>
        </span>
      </div>
    </div>
  );
}

function SessionRadarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0] ?? {};
  const name = String(entry.name ?? 'Valeur');
  const v = Number(entry.value ?? 0);

  let formatted = String(v);
  if (/win rate|taux/i.test(name)) formatted = `${Math.round(v)}%`;
  else if (/rr/i.test(name)) formatted = Number(v).toFixed(2);
  else if (/profit|p&l|\$/i.test(name)) formatted = `$${Number(v).toFixed(2)}`;

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2 shadow-none">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-6 text-xs">
        <span className="text-muted-foreground">{name}</span>
        <span className="font-mono tabular-nums text-foreground">{formatted}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [pnlTab, setPnlTab] = useState<'all' | 'day' | '1h' | '15m'>('all');
  const { trades: mockTrades, isLoading } = useTradesAdapted();

  const stats = useMemo(() => {
    const totalTrades = mockTrades.length;
    const wins = mockTrades.filter(t => t.result > 0);
    const losses = mockTrades.filter(t => t.result <= 0);
    const winRate = totalTrades ? ((wins.length / totalTrades) * 100).toFixed(1) : '0';
    const totalPnL = mockTrades.reduce((sum, t) => sum + t.result, 0);
    const avgRR = totalTrades ? (mockTrades.reduce((sum, t) => sum + t.rrRatio, 0) / totalTrades).toFixed(2) : '0';
    const maxRR = totalTrades ? Math.max(...mockTrades.map(t => t.rrRatio)).toFixed(2) : '0';
    const validTrades = mockTrades.filter(t => t.isValid).length;
    const disciplineScore = totalTrades ? ((validTrades / totalTrades) * 100).toFixed(1) : '0';

    const sortedTrades = [...mockTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const equityCurve = sortedTrades.reduce<{ date: string; pnl: number; idx: number }[]>((acc, t, i) => {
      const prev = acc.length ? acc[acc.length - 1].pnl : 0;
      acc.push({ date: t.date, pnl: Number((prev + t.result).toFixed(2)), idx: i });
      return acc;
    }, []);

    // Compute max equity, max drawdown trough
    let runningMax = 0;
    let maxDD = 0;
    let maxDDPoint: { date: string; pnl: number; idx: number } | null = null;
    let peakPoint: { date: string; pnl: number; idx: number } | null = null;
    equityCurve.forEach(p => {
      if (p.pnl > runningMax) { runningMax = p.pnl; peakPoint = p; }
      const dd = runningMax - p.pnl;
      if (dd > maxDD) { maxDD = dd; maxDDPoint = p; }
    });
    const maxEquity = runningMax;
    const initialBalance = 1000;
    const targetLevel = initialBalance * 0.10; // +10% target
    const riskLevel = -initialBalance * 0.05;  // -5% risk threshold

    // Signed gradient offset (where pnl crosses 0)
    const allPnls = equityCurve.map(d => d.pnl);
    const dataMax = Math.max(...allPnls, 0);
    const dataMin = Math.min(...allPnls, 0);
    const gradientOffset = dataMax + Math.abs(dataMin) === 0 ? 0.5 : dataMax / (dataMax - dataMin);

    const rrSparkline = sortedTrades.map((t, i) => ({ i, rr: t.rrRatio }));

    const avgWin = wins.length ? wins.reduce((s, t) => s + t.result, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.result, 0) / losses.length) : 0;
    const expectancy = (Number(winRate) / 100) * avgWin - (1 - Number(winRate) / 100) * avgLoss;
    const profitFactor = avgLoss > 0 ? (wins.reduce((s, t) => s + t.result, 0) / Math.abs(losses.reduce((s, t) => s + t.result, 0))) : 0;
    const profitFactorPct = Math.min(profitFactor / 15 * 100, 100);

    const kpis = [
      { label: 'Total Trades', value: totalTrades, icon: BarChart3, color: 'text-accent' },
      { label: 'Win Rate', value: `${winRate}%`, icon: Target, color: 'text-primary' },
      { label: 'Total P&L', value: `$${totalPnL.toFixed(2)}`, icon: totalPnL >= 0 ? TrendingUp : TrendingDown, color: totalPnL >= 0 ? 'text-primary' : 'text-destructive' },
      { label: 'Avg RR', value: avgRR, icon: TrendingUp, color: 'text-accent' },
      { label: 'Valid Trades', value: `${validTrades}/${totalTrades}`, icon: CheckCircle2, color: 'text-primary' },
      { label: 'Discipline', value: `${disciplineScore}%`, icon: Number(disciplineScore) >= 70 ? CheckCircle2 : XCircle, color: Number(disciplineScore) >= 70 ? 'text-primary' : 'text-destructive' },
    ];

    const directionData = [
      { name: 'Long', value: mockTrades.filter(t => t.direction === 'long').length, fill: 'hsl(217, 90%, 55%)' },
      { name: 'Short', value: mockTrades.filter(t => t.direction === 'short').length, fill: 'hsl(142, 70%, 45%)' },
    ];

    const sessionData = ['London', 'New York', 'Asian'].map(s => {
      const sessionTrades = mockTrades.filter(t => t.session === s);
      const sessionWins = sessionTrades.filter(t => t.result > 0);
      return {
        session: s,
        trades: sessionTrades.length,
        winRate: sessionTrades.length ? Math.round((sessionWins.length / sessionTrades.length) * 100) : 0,
        avgRR: sessionTrades.length ? Number((sessionTrades.reduce((s, t) => s + t.rrRatio, 0) / sessionTrades.length).toFixed(2)) : 0,
        profit: Number(sessionTrades.reduce((s, t) => s + t.result, 0).toFixed(2)),
      };
    });

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const dayPerf = days.map(d => {
      const dayTrades = mockTrades.filter(t => {
        const date = new Date(t.date);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return dayNames[date.getDay()] === d;
      });
      const profit = dayTrades.reduce((s, t) => s + t.result, 0);
      const loss = dayTrades.filter(t => t.result < 0).reduce((s, t) => s + t.result, 0);
      return { day: d, profit: Number(Math.max(profit, 0).toFixed(2)), loss: Number(Math.min(loss, 0).toFixed(2)) };
    });

    const missedBE = mockTrades.filter(t => t.result < 0 && t.result > -t.riskAmount * 0.3).length;
    const idealAvgRR = wins.length ? (wins.reduce((s, t) => s + t.rrRatio, 0) / wins.length).toFixed(2) : '0';
    const idealMaxRR = wins.length ? Math.max(...wins.map(t => t.rrRatio)).toFixed(2) : '0';

    return { totalTrades, wins, losses, winRate, totalPnL, avgRR, maxRR, validTrades, disciplineScore,
      equityCurve, rrSparkline, avgWin, avgLoss, expectancy, profitFactor, profitFactorPct,
      kpis, directionData, sessionData, dayPerf, missedBE, idealAvgRR, idealMaxRR,
      maxEquity, maxDD, maxDDPoint, peakPoint, targetLevel, riskLevel, gradientOffset };
  }, [mockTrades]);

  const { totalTrades, wins, losses, winRate, totalPnL, avgRR, maxRR, validTrades,
    equityCurve, rrSparkline, avgWin, avgLoss, expectancy, profitFactor, profitFactorPct,
    kpis, directionData, sessionData, dayPerf, missedBE, idealAvgRR, idealMaxRR,
    maxEquity, maxDD, maxDDPoint, peakPoint, targetLevel, riskLevel, gradientOffset } = stats;

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground sm:p-6">Chargement...</div>;
  if (totalTrades === 0) return (
    <div className="space-y-2 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-foreground">Performances</h1>
      <p className="text-sm text-muted-foreground">Aucun trade pour l'instant. Crée ton premier trade pour voir tes performances.</p>
    </div>
  );

  return (
    <div className="dash-fade-in space-y-5 p-3 sm:space-y-8 sm:p-4 md:p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Performances</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Vue d'ensemble de votre activité de trading</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="bg-card/60 border-border/60 dash-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <kpi.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${kpi.color}`} />
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground truncate">{kpi.label}</span>
              </div>
              <p className={`text-lg sm:text-xl font-semibold font-mono tabular-nums ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profits et pertes - Equity Curve */}
      <Card className="bg-card/60 border-border/60 dash-card">
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-foreground tracking-tight">Profits et pertes</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Évolution dans le temps</p>
            </div>
            <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg border border-border/60 p-0.5 w-full sm:w-auto">
              {(['all', 'day', '1h', '15m'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setPnlTab(tab)}
                  className={`dash-tab flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md ${
                    pnlTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'all' ? 'Tout' : tab === 'day' ? 'Jour' : tab === '1h' ? '1H' : '15M'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {/* P&L KPIs row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-border/50 px-1 sm:px-0">
            <div className="space-y-1">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">Total P&L <Info className="h-3 w-3" /></p>
              <p className={`text-base sm:text-xl font-semibold font-mono tabular-nums ${totalPnL >= 0 ? 'text-primary' : 'text-destructive'}`}>
                ${totalPnL.toFixed(2)}
              </p>
              <span className="text-[10px] sm:text-xs text-primary">⬆ {((totalPnL / 1000) * 100).toFixed(2)}%</span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">Solde <Info className="h-3 w-3" /></p>
              <p className="text-base sm:text-xl font-semibold font-mono tabular-nums text-foreground">${(1000 + totalPnL).toFixed(2)}</p>
              <span className="text-[10px] sm:text-xs text-primary">⬆ {((totalPnL / 1000) * 100).toFixed(2)}%</span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">Taux gain <Info className="h-3 w-3" /></p>
              <p className="text-base sm:text-xl font-semibold font-mono tabular-nums text-foreground">{winRate}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">Opérations <Info className="h-3 w-3" /></p>
              <p className="text-base sm:text-xl font-semibold font-mono tabular-nums text-foreground">{totalTrades} <span className="text-xs sm:text-sm text-muted-foreground">{wins.length}/{losses.length}</span></p>
            </div>
            <div className="space-y-1 hidden lg:block">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">Seuil de rentabilité <Info className="h-3 w-3" /></p>
              <p className="text-xl font-semibold font-mono tabular-nums text-foreground">{mockTrades.filter(t => Math.abs(t.result) < 5).length}</p>
            </div>
          </div>
          {/* Legend chips */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3 px-1 sm:px-0 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary/80" /><span className="text-muted-foreground">Profit</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-destructive/80" /><span className="text-muted-foreground">Perte</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-primary" /><span className="text-muted-foreground">Objectif (+10%)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-destructive" /><span className="text-muted-foreground">Risque (-5%)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 border-t border-dotted border-accent" /><span className="text-muted-foreground">Equity max ${maxEquity.toFixed(2)}</span></div>
            {maxDD > 0 && (
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive ring-2 ring-destructive/30" /><span className="text-muted-foreground">Max DD -${maxDD.toFixed(2)}</span></div>
            )}
          </div>
          {/* Equity curve */}
          <div className="h-60 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve} margin={{ top: 8, right: 12, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlSplitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.55} />
                    <stop offset={`${gradientOffset * 100}%`} stopColor="hsl(142, 70%, 45%)" stopOpacity={0.05} />
                    <stop offset={`${gradientOffset * 100}%`} stopColor="hsl(0, 72%, 55%)" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="pnlStrokeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 70%, 50%)" />
                    <stop offset={`${gradientOffset * 100}%`} stopColor="hsl(210, 15%, 60%)" />
                    <stop offset="100%" stopColor="hsl(0, 72%, 60%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" stroke="hsl(var(--border))" strokeOpacity={0.6} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} width={40} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  wrapperStyle={tooltipWrapperStyle}
                  cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
                  formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'P&L']}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                <ReferenceLine y={targetLevel} stroke="hsl(142, 70%, 45%)" strokeDasharray="5 4" strokeOpacity={0.7} label={{ value: `+$${targetLevel.toFixed(2)}`, position: 'right', fill: 'hsl(142, 70%, 45%)', fontSize: 9 }} />
                <ReferenceLine y={riskLevel} stroke="hsl(0, 72%, 55%)" strokeDasharray="5 4" strokeOpacity={0.7} label={{ value: `-$${Math.abs(riskLevel).toFixed(2)}`, position: 'right', fill: 'hsl(0, 72%, 55%)', fontSize: 9 }} />
                {maxEquity > 0 && (
                  <ReferenceLine y={maxEquity} stroke="hsl(var(--accent))" strokeDasharray="2 4" strokeOpacity={0.6} />
                )}
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="url(#pnlStrokeGrad)"
                  strokeWidth={2.5}
                  fill="url(#pnlSplitGrad)"
                  activeDot={{ r: 5, fill: 'hsl(var(--background))', stroke: 'hsl(var(--accent))', strokeWidth: 2 }}
                  dot={false}
                  isAnimationActive
                  animationDuration={700}
                />
                {peakPoint && (
                  <ReferenceDot x={peakPoint.date} y={peakPoint.pnl} r={4} fill="hsl(142, 70%, 50%)" stroke="hsl(var(--background))" strokeWidth={2} />
                )}
                {maxDDPoint && maxDD > 0 && (
                  <ReferenceDot x={maxDDPoint.date} y={maxDDPoint.pnl} r={4} fill="hsl(0, 72%, 55%)" stroke="hsl(var(--background))" strokeWidth={2} />
                )}
                {equityCurve.length > 8 && (
                  <Brush dataKey="date" height={22} travellerWidth={8} stroke="hsl(var(--border))" fill="hsl(var(--muted) / 0.3)" tickFormatter={() => ''} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* RR Metrics Cards with sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-card/60 border-border/60 dash-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between mb-3 gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">R/R moyen <Info className="h-3 w-3" /></p>
                <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-foreground">{avgRR}</p>
              </div>
              <div className="text-right space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 justify-end">R/R max. <Info className="h-3 w-3" /></p>
                <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-foreground">{maxRR}</p>
              </div>
            </div>
            <div className="h-12 sm:h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rrSparkline}>
                  <Line type="monotone" dataKey="rr" stroke="hsl(217, 90%, 55%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/60 dash-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between mb-3 gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">R/R moyen idéal <Info className="h-3 w-3" /></p>
                <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-foreground">{idealAvgRR}</p>
              </div>
              <div className="text-right space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 justify-end">R/R max. idéal <Info className="h-3 w-3" /></p>
                <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-foreground">{idealMaxRR}</p>
              </div>
            </div>
            <div className="h-12 sm:h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rrSparkline.filter((_, i) => mockTrades[i]?.result > 0)}>
                  <Line type="monotone" dataKey="rr" stroke="hsl(217, 90%, 55%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/60 dash-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between mb-3 gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Profits/SR manqués</p>
                <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-foreground">{missedBE}</p>
              </div>
              <div className="text-right space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 justify-end">R/R max. idéal <Info className="h-3 w-3" /></p>
                <p className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-foreground">{idealMaxRR}</p>
              </div>
            </div>
            <div className="h-12 sm:h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rrSparkline}>
                  <Line type="monotone" dataKey="rr" stroke="hsl(217, 90%, 55%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expectancy & Profit Factor */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2 tracking-tight">
          Expectancy & Profit Factor <Info className="h-4 w-4 text-muted-foreground" />
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-card/60 border-border/60 dash-card">
            <CardContent className="p-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">Expectancy <Info className="h-3 w-3" /></p>
              <p className={`text-2xl font-semibold font-mono tabular-nums mb-4 ${expectancy >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                ${expectancy.toFixed(2)}
              </p>
              {/* Expectancy bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2.5 rounded-full bg-muted/40 overflow-hidden flex">
                  <div className="h-full bg-primary rounded-l-full transition-all duration-500" style={{ width: `${avgWin > 0 ? (avgWin / (avgWin + avgLoss)) * 100 : 50}%` }} />
                  <div className="h-full bg-destructive rounded-r-full transition-all duration-500" style={{ width: `${avgLoss > 0 ? (avgLoss / (avgWin + avgLoss)) * 100 : 50}%` }} />
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-primary font-mono tabular-nums">${avgWin.toFixed(2)}</span>
                <span className="text-xs text-destructive font-mono tabular-nums">-${avgLoss.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/60 dash-card">
            <CardContent className="p-5 flex items-center gap-6">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">Profit factor <Info className="h-3 w-3" /></p>
                <p className="text-2xl font-semibold font-mono tabular-nums text-foreground">{profitFactor.toFixed(2)}</p>
              </div>
              {/* Donut ring */}
              <div className="ml-auto">
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="28" fill="none" stroke="hsl(220, 10%, 15%)" strokeWidth="6" />
                  <circle
                    cx="36" cy="36" r="28" fill="none"
                    stroke="hsl(217, 90%, 55%)" strokeWidth="6"
                    strokeDasharray={`${profitFactorPct * 1.76} 176`}
                    strokeLinecap="round"
                    transform="rotate(-90 36 36)"
                    style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                  />
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Direction Pie */}
        <Card className="bg-card/60 border-border/60 dash-card">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold text-foreground tracking-tight">Performances par type d'opération</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="h-44 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={directionData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none" paddingAngle={2}>
                    {directionData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<DirectionTooltip totalTrades={totalTrades} />} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-3">
              {directionData.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-mono tabular-nums text-foreground">{((d.value / totalTrades) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Day Performance */}
        <Card className="bg-card/60 border-border/60 dash-card">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold text-foreground tracking-tight">Performances par jour</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayPerf} layout="vertical" className="recharts-glow" margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 15%)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} />
                  <YAxis type="category" dataKey="day" tick={{ fill: 'hsl(215, 12%, 55%)', fontSize: 10 }} width={32} axisLine={false} tickLine={false} />
                  <Tooltip content={<DayPerfTooltip />} cursor={{ fill: 'hsl(220, 10%, 12% / 0.4)' }} />
                  <Bar dataKey="profit" fill="hsl(142, 70%, 45%)" radius={[0, 4, 4, 0]} style={{ color: 'hsl(142, 70%, 45%)' }} />
                  <Bar dataKey="loss" fill="hsl(0, 72%, 55%)" radius={[0, 4, 4, 0]} style={{ color: 'hsl(0, 72%, 55%)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performances par session - 4 radar charts */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 tracking-tight">Performances par session</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { title: 'Taux de gain', dataKey: 'winRate' },
            { title: 'Total des opérations', dataKey: 'trades' },
            { title: 'R/R moyen', dataKey: 'avgRR' },
            { title: 'Profit', dataKey: 'profit' },
          ].map((chart) => (
            <Card key={chart.dataKey} className="bg-card/60 border-border/60 dash-card">
              <CardHeader className="pb-0 pt-3 sm:pt-4 px-3 sm:px-4">
                <CardTitle className="text-sm font-semibold text-foreground tracking-tight">{chart.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-40 sm:h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={sessionData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="hsl(220, 10%, 22%)" />
                      <PolarAngleAxis dataKey="session" tick={{ fill: 'hsl(215, 12%, 60%)', fontSize: 10 }} />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Radar
                        name={chart.title}
                        dataKey={chart.dataKey}
                        stroke="hsl(217, 90%, 55%)"
                        fill="hsl(217, 90%, 55%)"
                        fillOpacity={0.35}
                        dot={{ r: 4, fill: 'hsl(217, 90%, 55%)', stroke: 'hsl(217, 90%, 55%)' }}
                      />
                      <Tooltip content={<SessionRadarTooltip />} cursor={false} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}