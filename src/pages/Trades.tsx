import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, X, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTrades, useDeleteTrade } from '@/hooks/use-trades';
import { toast } from 'sonner';

export default function Trades() {
  const navigate = useNavigate();
  const { data: trades = [], isLoading } = useTrades();
  const deleteTrade = useDeleteTrade();
  const [sessionFilter, setSessionFilter] = useState('all');
  const [validFilter, setValidFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');

  const filtered = trades.filter(t => {
    if (sessionFilter !== 'all' && t.session !== sessionFilter) return false;
    if (validFilter === 'valid' && !t.is_valid) return false;
    if (validFilter === 'invalid' && t.is_valid) return false;
    if (directionFilter !== 'all' && t.direction !== directionFilter) return false;
    return true;
  });

  const hasFilters = sessionFilter !== 'all' || validFilter !== 'all' || directionFilter !== 'all';

  const onDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce trade ?')) return;
    try { await deleteTrade.mutateAsync(id); toast.success('Trade supprimé'); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">Trades</h1>
        <Button onClick={() => navigate('/trades/new')} size="sm" className="h-10 w-full gap-1.5 sm:h-9 sm:w-auto">
          <Plus className="h-4 w-4" /> Nouveau Trade
        </Button>
      </div>

      <div className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="h-10 w-[8.5rem] shrink-0 text-xs bg-secondary border-border sm:h-8"><SelectValue placeholder="Direction" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="long">Long</SelectItem>
            <SelectItem value="short">Short</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sessionFilter} onValueChange={setSessionFilter}>
          <SelectTrigger className="h-10 w-[8.5rem] shrink-0 text-xs bg-secondary border-border sm:h-8"><SelectValue placeholder="Session" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="London">London</SelectItem>
            <SelectItem value="New York">New York</SelectItem>
            <SelectItem value="Asian">Asian</SelectItem>
          </SelectContent>
        </Select>
        <Select value={validFilter} onValueChange={setValidFilter}>
          <SelectTrigger className="h-10 w-[8.5rem] shrink-0 text-xs bg-secondary border-border sm:h-8"><SelectValue placeholder="Validity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            <SelectItem value="valid">Valid</SelectItem>
            <SelectItem value="invalid">Invalid</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setSessionFilter('all'); setValidFilter('all'); setDirectionFilter('all'); }}>
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Date', 'Instrument', 'Direction', 'P&L', 'Entry', 'Stop Loss', 'Session', 'Status', ''].map(h => (
                  <th key={h} className="whitespace-nowrap px-2 py-3 text-left text-xs font-medium text-muted-foreground sm:px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} className="px-2 py-8 text-center text-xs text-muted-foreground sm:px-4">Chargement...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={9} className="px-2 py-8 text-center text-xs text-muted-foreground sm:px-4">Aucun trade. Crée ton premier trade.</td></tr>
              )}
              {filtered.map(trade => (
                <tr key={trade.id} className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/trades/${trade.id}/edit`)}>
                  <td className="whitespace-nowrap px-2 py-3 text-muted-foreground sm:px-4">{trade.trade_date}</td>
                  <td className="max-w-[7rem] truncate px-2 py-3 font-medium text-foreground sm:max-w-none sm:px-4">{trade.instrument}</td>
                  <td className="px-2 py-3 sm:px-4">
                    {trade.direction && (
                      <Badge variant="outline" className={cn('text-xs', trade.direction === 'long' ? 'border-primary/50 text-primary' : 'border-destructive/50 text-destructive')}>
                        {trade.direction === 'long' ? 'Long' : 'Short'}
                      </Badge>
                    )}
                  </td>
                  <td className={cn('whitespace-nowrap px-2 py-3 font-mono font-medium sm:px-4', Number(trade.result) >= 0 ? 'text-primary' : 'text-destructive')}>
                    {Number(trade.result) >= 0 ? '+' : ''}{Number(trade.result).toFixed(2)} $
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 font-mono text-muted-foreground sm:px-4">{trade.entry_price ?? '—'}</td>
                  <td className="whitespace-nowrap px-2 py-3 font-mono text-muted-foreground sm:px-4">{trade.stop_loss ?? '—'}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-muted-foreground sm:px-4">{trade.session ?? '—'}</td>
                  <td className="px-2 py-3 sm:px-4">
                    <Badge variant="outline" className={cn('text-xs', trade.is_valid ? 'border-primary/50 text-primary bg-primary/10' : 'border-destructive/50 text-destructive bg-destructive/10')}>
                      {trade.is_valid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </td>
                  <td className="px-2 py-3 sm:px-4">
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <Button variant="ghost" size="icon" className="size-10 sm:h-7 sm:w-7" onClick={(e) => { e.stopPropagation(); navigate(`/trades/${trade.id}/edit`); }}>
                        <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-10 text-destructive sm:h-7 sm:w-7" onClick={(e) => onDelete(trade.id, e)}>
                        <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-2 py-3 text-xs text-muted-foreground sm:px-4">
          <span>{filtered.length} trade(s)</span>
        </div>
      </Card>
    </div>
  );
}
