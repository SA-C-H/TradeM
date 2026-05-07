import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, ShieldAlert, Maximize2, Minimize2 } from 'lucide-react';

export default function FxReplay() {
  const [loaded, setLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const frameWrapRef = useRef<HTMLDivElement | null>(null);
  const url = useMemo(() => {
    const fromEnv = (import.meta.env.VITE_FX_REPLAY_URL as string | undefined) ?? '';
    return fromEnv.trim() || 'https://app.fxreplay.com/';
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await frameWrapRef.current?.requestFullscreen();
    } catch {
      // Some browsers block fullscreen without user gesture or in certain contexts.
    }
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">FX Replay</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Intégration par iframe (si FX Replay l’autorise).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            Plein écran
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <a href={url} target="_blank" rel="noreferrer">
              Ouvrir <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {!loaded && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Si tu vois un écran vide
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>
              FX Replay peut bloquer l’affichage dans un iframe (sécurité). Dans ce cas, utilise le bouton{' '}
              <span className="text-foreground font-medium">Ouvrir</span>.
            </div>
          </CardContent>
        </Card>
      )}

      <div ref={frameWrapRef} className="rounded-md border border-border overflow-hidden bg-background/30">
        <iframe
          title="FX Replay"
          src={url}
          className="w-full h-[80vh] min-h-[640px]"
          onLoad={() => setLoaded(true)}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
}

