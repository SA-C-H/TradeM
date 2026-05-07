import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { EmotionalState } from '@/lib/types';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/contexts/AccountContext';
import { usePlaybooks } from '@/hooks/use-playbooks';
import PhotoUploader, { PendingPhoto } from '@/components/PhotoUploader';
import { uploadTradePhoto, getSignedPhotoUrl, deletePhotoFromStorage } from '@/lib/photo-utils';
import { X } from 'lucide-react';

const emotions: EmotionalState[] = ['calm', 'confident', 'anxious', 'fearful', 'greedy', 'frustrated', 'neutral'];

interface ExistingPhoto { id: string; storage_path: string; kind: string; signedUrl?: string }
interface Props { tradeId?: string }

export default function TradeForm({ tradeId }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const { data: playbooks = [] } = usePlaybooks();
  const isEdit = !!tradeId;

  const [form, setForm] = useState({
    instrument: '', trade_date: new Date().toISOString().slice(0, 10), trade_time: '',
    session: '', direction: '', entry_price: '', stop_loss: '', take_profit: '',
    result: '', risk_percent: '', risk_amount: '', reason: '',
    emotion_before: '', emotion_during: '', emotion_after: '',
  });
  const [playbookId, setPlaybookId] = useState<string>('');
  const [playbookChecks, setPlaybookChecks] = useState<Record<string, boolean>>({});
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [editAccountId, setEditAccountId] = useState<string | null>(null);

  const selectedPlaybook = useMemo(() => playbooks.find(p => p.id === playbookId), [playbooks, playbookId]);

  // Reset checks when playbook changes
  useEffect(() => {
    if (!selectedPlaybook) { setPlaybookChecks({}); return; }
    setPlaybookChecks(prev => {
      const next: Record<string, boolean> = {};
      selectedPlaybook.conditions.forEach(c => { next[c.id] = prev[c.id] ?? false; });
      return next;
    });
  }, [selectedPlaybook]);

  useEffect(() => {
    if (!isEdit || !tradeId) return;
    (async () => {
      const { data: trade } = await supabase.from('trades').select('*').eq('id', tradeId).maybeSingle();
      if (trade) {
        setForm({
          instrument: trade.instrument ?? '',
          trade_date: trade.trade_date ?? '',
          trade_time: trade.trade_time?.slice(0, 5) ?? '',
          session: trade.session ?? '',
          direction: trade.direction ?? '',
          entry_price: trade.entry_price?.toString() ?? '',
          stop_loss: trade.stop_loss?.toString() ?? '',
          take_profit: trade.take_profit?.toString() ?? '',
          result: trade.result?.toString() ?? '',
          risk_percent: trade.risk_percent?.toString() ?? '',
          risk_amount: trade.risk_amount?.toString() ?? '',
          reason: trade.reason ?? '',
          emotion_before: trade.emotion_before ?? '',
          emotion_during: trade.emotion_during ?? '',
          emotion_after: trade.emotion_after ?? '',
        });
        setPlaybookId((trade as any).playbook_id ?? '');
        setEditAccountId((trade as any).account_id ?? null);
        const checks = (trade.playbook_checks as Array<{ conditionId: string; respected: boolean }>) || [];
        const map: Record<string, boolean> = {};
        checks.forEach(c => { map[c.conditionId] = c.respected; });
        setPlaybookChecks(map);
      }
      const { data: photos } = await supabase.from('trade_photos').select('*').eq('trade_id', tradeId);
      if (photos) {
        const withUrls = await Promise.all(photos.map(async p => ({
          id: p.id, storage_path: p.storage_path, kind: p.kind,
          signedUrl: await getSignedPhotoUrl(p.storage_path).catch(() => undefined),
        })));
        setExistingPhotos(withUrls);
      }
      setLoading(false);
    })();
  }, [tradeId, isEdit]);

  const allChecked = selectedPlaybook
    ? selectedPlaybook.conditions.length > 0 && selectedPlaybook.conditions.every(c => playbookChecks[c.id])
    : false;
  const isValid = allChecked;
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const numOrNull = (v: string) => (v === '' ? null : Number(v));
  const computedRiskAmount = useMemo(() => {
    const riskAmount = numOrNull(form.risk_amount);
    if (riskAmount != null) return riskAmount;
    const riskPercent = numOrNull(form.risk_percent);
    const balance = currentAccount?.initial_balance ?? null;
    if (riskPercent == null || balance == null) return null;
    return Math.round(((balance * riskPercent) / 100) * 100) / 100;
  }, [form.risk_amount, form.risk_percent, currentAccount?.initial_balance]);

  const computedRR = useMemo(() => {
    const result = numOrNull(form.result);
    if (result != null && computedRiskAmount != null && computedRiskAmount !== 0) {
      return Math.round((result / computedRiskAmount) * 100) / 100;
    }

    const entry = numOrNull(form.entry_price);
    const sl = numOrNull(form.stop_loss);
    const tp = numOrNull(form.take_profit);
    if (entry == null || sl == null || tp == null) return null;
    const riskDist = Math.abs(entry - sl);
    const rewardDist = Math.abs(tp - entry);
    if (riskDist <= 0) return 0;
    return Math.round((rewardDist / riskDist) * 100) / 100;
  }, [form.entry_price, form.stop_loss, form.take_profit, form.result, computedRiskAmount]);

  const computedGain = useMemo(() => {
    if (computedRiskAmount == null || computedRR == null) return null;
    return Math.round((computedRiskAmount * computedRR) * 100) / 100;
  }, [computedRiskAmount, computedRR]);

  const removeExistingPhoto = async (photo: ExistingPhoto) => {
    await supabase.from('trade_photos').delete().eq('id', photo.id);
    await deletePhotoFromStorage(photo.storage_path);
    setExistingPhotos(prev => prev.filter(p => p.id !== photo.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Non connecté'); return; }
    const accountId = isEdit ? editAccountId : currentAccount?.id;
    if (!accountId) { toast.error('Aucun compte sélectionné'); return; }
    if (!form.instrument || !form.trade_date) { toast.error('Instrument et date requis'); return; }
    if (!playbookId) { toast.error('Sélectionne un playbook'); return; }
    setSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
        account_id: accountId,
        playbook_id: playbookId,
        instrument: form.instrument,
        trade_date: form.trade_date,
        trade_time: form.trade_time || null,
        session: form.session || null,
        direction: form.direction || null,
        entry_price: numOrNull(form.entry_price),
        stop_loss: numOrNull(form.stop_loss),
        take_profit: numOrNull(form.take_profit),
        result: numOrNull(form.result) ?? 0,
        risk_percent: numOrNull(form.risk_percent),
        risk_amount: numOrNull(form.risk_amount),
        strategy: selectedPlaybook?.name ?? null,
        reason: form.reason || null,
        emotion_before: form.emotion_before || null,
        emotion_during: form.emotion_during || null,
        emotion_after: form.emotion_after || null,
        playbook_checks: Object.entries(playbookChecks).map(([conditionId, respected]) => ({ conditionId, respected })),
        is_valid: isValid,
      };

      let savedId = tradeId;
      if (isEdit && tradeId) {
        const { error } = await supabase.from('trades').update(payload).eq('id', tradeId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('trades').insert(payload).select('id').single();
        if (error) throw error;
        savedId = data.id;
      }

      for (const p of pendingPhotos) {
        const { path } = await uploadTradePhoto(p.file, user.id, p.kind);
        await supabase.from('trade_photos').insert({
          user_id: user.id, account_id: accountId, trade_id: savedId, storage_path: path, kind: p.kind,
        });
      }

      toast.success(isEdit ? 'Trade mis à jour' : 'Trade ajouté');
      navigate('/trades');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Chargement...</div>;

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4 md:p-6">
      <h1 className="text-xl font-semibold text-foreground mb-2">{isEdit ? 'Modifier le Trade' : 'Nouveau Trade'}</h1>
      {!isEdit && currentAccount && (
        <p className="text-xs text-muted-foreground mb-6">
          Compte : <span className="text-foreground font-medium">{currentAccount.name}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Stratégie / Playbook</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {playbooks.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                Aucun playbook créé. <Link to="/playbook" className="text-primary underline">Créer un playbook</Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Playbook</Label>
                <Select value={playbookId} onValueChange={setPlaybookId}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Sélectionne un playbook" /></SelectTrigger>
                  <SelectContent>
                    {playbooks.map(pb => (
                      <SelectItem key={pb.id} value={pb.id}>{pb.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Informations générales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Instrument</Label>
              <Input required value={form.instrument} onChange={e => set('instrument', e.target.value)} placeholder="EUR/USD" className="bg-secondary border-border" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Date</Label>
              <Input required type="date" value={form.trade_date} onChange={e => set('trade_date', e.target.value)} className="bg-secondary border-border" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Heure</Label>
              <Input type="time" value={form.trade_time} onChange={e => set('trade_time', e.target.value)} className="bg-secondary border-border" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Session</Label>
              <Select value={form.session} onValueChange={v => set('session', v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="London">London</SelectItem><SelectItem value="New York">New York</SelectItem><SelectItem value="Asian">Asian</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Direction</Label>
              <Select value={form.direction} onValueChange={v => set('direction', v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="long">Long</SelectItem><SelectItem value="short">Short</SelectItem></SelectContent>
              </Select></div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Données du trade</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ['Prix d\'entrée', 'entry_price', '1.12500', 'any'],
              ['Stop Loss', 'stop_loss', '1.12000', 'any'],
              ['Take Profit', 'take_profit', '1.13500', 'any'],
              ['Résultat ($)', 'result', '150.00', 'any'],
              ['Risque (%)', 'risk_percent', '1.0', '0.1'],
              ['Risque ($)', 'risk_amount', '50', 'any'],
            ].map(([label, key, ph, step]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input type="number" step={step} placeholder={ph}
                  value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                  className="bg-secondary border-border font-mono" />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">R:R (auto)</Label>
              <Input
                value={computedRR == null ? '' : String(computedRR)}
                readOnly
                placeholder="—"
                className="bg-secondary/30 border-border font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Gain potentiel ($)</Label>
              <Input
                value={computedGain == null ? '' : String(computedGain)}
                readOnly
                placeholder="—"
                className="bg-secondary/30 border-border font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Contexte</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.reason} onChange={e => set('reason', e.target.value)}
              placeholder="Raison de la prise de position..." className="bg-secondary border-border min-h-[80px]" />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Psychologie</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([['Avant', 'emotion_before'], ['Pendant', 'emotion_during'], ['Après', 'emotion_after']] as const).map(([label, key]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">État émotionnel — {label}</Label>
                <Select value={(form as any)[key]} onValueChange={v => set(key, v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{emotions.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingPhotos.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Photos existantes</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {existingPhotos.map(p => (
                    <div key={p.id} className="relative group rounded-md overflow-hidden border border-border bg-secondary aspect-square">
                      {p.signedUrl && <img src={p.signedUrl} alt="" className="w-full h-full object-cover" />}
                      <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-background/80">{p.kind}</span>
                      <button type="button" onClick={() => removeExistingPhoto(p)} className="absolute top-1 right-1 bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <PhotoUploader photos={pendingPhotos} onChange={setPendingPhotos} />
          </CardContent>
        </Card>

        {selectedPlaybook && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Validation Playbook — {selectedPlaybook.name}
                <span className={`text-xs px-2 py-0.5 rounded-full ${isValid ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                  {isValid ? 'VALID' : 'INVALID'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedPlaybook.conditions.map(condition => (
                <div key={condition.id} className="flex items-start gap-3">
                  <Checkbox id={condition.id} checked={!!playbookChecks[condition.id]}
                    onCheckedChange={(c) => setPlaybookChecks(prev => ({ ...prev, [condition.id]: !!c }))} />
                  <label htmlFor={condition.id} className="text-sm cursor-pointer">
                    <span className="text-foreground">{condition.label}</span>
                    {condition.description && <p className="text-xs text-muted-foreground mt-0.5">{condition.description}</p>}
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="mt-auto -mx-3 sm:-mx-4 md:-mx-6 border-t border-border bg-background/85 backdrop-blur px-3 py-3 sm:px-4 md:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start sm:gap-3">
            <Button type="submit" disabled={submitting} className="gap-1.5 sm:w-auto">
              {submitting ? '...' : isEdit ? 'Mettre à jour' : 'Enregistrer le trade'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/trades')} className="sm:w-auto">
              Annuler
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
