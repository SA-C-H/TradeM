import { useState, useMemo } from 'react';
import { useTradesAdapted } from '@/hooks/use-trades-adapted';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CalendarView() {
  const { trades: mockTrades } = useTradesAdapted();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = (firstDay.getDay() + 6) % 7; // Monday-based
  const daysInMonth = lastDay.getDate();

  const tradesByDate = useMemo(() => {
    const map: Record<string, typeof mockTrades> = {};
    mockTrades.forEach(t => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [mockTrades]);

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      <h1 className="text-xl font-semibold text-foreground">Calendrier des performances</h1>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base font-medium">{monthNames[month]} {year}</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <div className="px-4 pb-4">
          {/* Header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day, di) => {
                if (day === null) return <div key={di} className="aspect-square rounded-md bg-muted/30" />;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayTrades = tradesByDate[dateStr] || [];
                const dayPnL = dayTrades.reduce((s, t) => s + t.result, 0);
                const hasTrades = dayTrades.length > 0;
                return (
                  <div
                    key={di}
                    className={cn(
                      'aspect-square rounded-md border border-border/50 p-1.5 flex flex-col justify-between transition-colors',
                      hasTrades && dayPnL >= 0 && 'bg-primary/15 border-primary/30',
                      hasTrades && dayPnL < 0 && 'bg-destructive/15 border-destructive/30',
                      !hasTrades && 'bg-muted/20'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      {hasTrades && <span className="text-[10px] text-muted-foreground">{dayTrades.length} trades</span>}
                      <span className="text-xs font-medium text-foreground ml-auto">{day}</span>
                    </div>
                    {hasTrades && (
                      <span className={cn('text-xs font-mono font-medium', dayPnL >= 0 ? 'text-primary' : 'text-destructive')}>
                        {dayPnL >= 0 ? '+' : ''}{dayPnL.toFixed(2)}$
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
