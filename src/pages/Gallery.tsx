import { useEffect, useMemo, useState } from 'react';
import { useAllPhotos } from '@/hooks/use-trades';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSignedPhotoUrl } from '@/lib/photo-utils';
import { Image as ImageIcon, X, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Period = 'all' | 'day' | 'week' | 'month';

function startOf(period: Period): Date | null {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === 'day') return d;
  if (period === 'week') { d.setDate(d.getDate() - 7); return d; }
  if (period === 'month') { d.setMonth(d.getMonth() - 1); return d; }
  return null;
}

interface PhotoCardProps {
  p: any;
  url?: string;
  onOpen: (url: string) => void;
  onNavigate: (id: string) => void;
}

function PhotoCard({ p, url, onOpen, onNavigate }: PhotoCardProps) {
  const trade = p.trades;
  return (
    <div className="group relative aspect-square rounded-md overflow-hidden border border-border bg-secondary cursor-pointer"
      onClick={() => url && onOpen(url)}>
      {url ? <img src={url} alt="" className="w-full h-full object-cover transition group-hover:scale-105" /> : <div className="w-full h-full" />}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-2">
        {trade && (
          <button onClick={(e) => { e.stopPropagation(); onNavigate(p.trade_id); }}
            className="text-xs text-foreground font-medium hover:text-primary text-left">
            {trade.instrument} • {trade.trade_date}
          </button>
        )}
      </div>
      <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-background/80">{p.kind}</span>
    </div>
  );
}

export default function Gallery() {
  const navigate = useNavigate();
  const { data: photos, isLoading } = useAllPhotos();
  const [period, setPeriod] = useState<Period>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'before' | 'after'>('all');
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!photos) return [];
    const since = startOf(period);
    return photos.filter(p => {
      if (kindFilter !== 'all' && p.kind !== kindFilter) return false;
      if (since && new Date(p.taken_at) < since) return false;
      return true;
    });
  }, [photos, period, kindFilter]);

  const validPhotos = useMemo(
    () => filtered.filter(p => (p as any).trades?.is_valid === true),
    [filtered]
  );
  const invalidPhotos = useMemo(
    () => filtered.filter(p => (p as any).trades?.is_valid !== true),
    [filtered]
  );

  useEffect(() => {
    (async () => {
      const next: Record<string, string> = { ...urls };
      const missing = filtered.filter(p => !next[p.storage_path]);
      await Promise.all(missing.map(async p => {
        try { next[p.storage_path] = await getSignedPhotoUrl(p.storage_path); } catch {}
      }));
      if (missing.length) setUrls(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-foreground">Gallery</h1>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={v => setPeriod(v as Period)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs">Tout</TabsTrigger>
              <TabsTrigger value="day" className="text-xs">Jour</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Semaine</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Mois</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={kindFilter} onValueChange={v => setKindFilter(v as any)}>
            <SelectTrigger className="w-32 h-8 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="before">Avant</SelectItem>
              <SelectItem value="after">Après</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border p-12 flex flex-col items-center gap-3 text-muted-foreground">
          <ImageIcon className="h-10 w-10 opacity-50" />
          <p className="text-sm">Aucune photo pour cette période</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* VALID */}
          <section className="space-y-3">
            <header className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Trades valides</h2>
                <span className="text-xs text-muted-foreground">— playbook respecté</span>
              </div>
              <span className="text-xs font-mono text-primary">{validPhotos.length}</span>
            </header>
            {validPhotos.length === 0 ? (
              <div className="text-xs text-muted-foreground py-8 text-center border border-dashed border-border rounded-md">
                Aucune photo de trade valide
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {validPhotos.map(p => (
                  <PhotoCard key={p.id} p={p} url={urls[p.storage_path]}
                    onOpen={setLightbox}
                    onNavigate={(id) => navigate(`/trades/${id}/edit`)} />
                ))}
              </div>
            )}
          </section>

          {/* INVALID */}
          <section className="space-y-3">
            <header className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <h2 className="text-sm font-semibold text-foreground">Trades invalides</h2>
                <span className="text-xs text-muted-foreground">— playbook non respecté</span>
              </div>
              <span className="text-xs font-mono text-destructive">{invalidPhotos.length}</span>
            </header>
            {invalidPhotos.length === 0 ? (
              <div className="text-xs text-muted-foreground py-8 text-center border border-dashed border-border rounded-md">
                Aucune photo de trade invalide
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {invalidPhotos.map(p => (
                  <PhotoCard key={p.id} p={p} url={urls[p.storage_path]}
                    onOpen={setLightbox}
                    onNavigate={(id) => navigate(`/trades/${id}/edit`)} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {lightbox && (
        <div className={cn("fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4")} onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-foreground p-2"><X className="h-6 w-6" /></button>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
