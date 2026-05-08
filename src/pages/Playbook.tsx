import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePlaybooks, useUpsertPlaybook, useDeletePlaybook, type PlaybookCondition, type Playbook } from '@/hooks/use-playbooks';
import { Plus, Trash2, BookOpen, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';

interface EditorState {
  id?: string;
  name: string;
  description: string;
  conditions: PlaybookCondition[];
}

const empty: EditorState = { name: '', description: '', conditions: [] };

export default function Playbook() {
  const { data: playbooks = [], isLoading } = usePlaybooks();
  const upsert = useUpsertPlaybook();
  const remove = useDeletePlaybook();
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(empty);
  const [condLabel, setCondLabel] = useState('');
  const [condDesc, setCondDesc] = useState('');

  const openCreate = () => { setEditor(empty); setOpen(true); };
  const openEdit = (pb: Playbook) => {
    setEditor({ id: pb.id, name: pb.name, description: pb.description ?? '', conditions: pb.conditions });
    setOpen(true);
  };

  const addCond = () => {
    if (!condLabel.trim()) return;
    setEditor(s => ({ ...s, conditions: [...s.conditions, { id: `c${Date.now()}`, label: condLabel, description: condDesc || undefined }] }));
    setCondLabel(''); setCondDesc('');
  };
  const removeCond = (id: string) => setEditor(s => ({ ...s, conditions: s.conditions.filter(c => c.id !== id) }));

  const save = async () => {
    if (!editor.name.trim()) { toast.error('Nom requis'); return; }
    if (editor.conditions.length === 0) { toast.error('Ajoute au moins une condition'); return; }
    await upsert.mutateAsync({
      id: editor.id, name: editor.name.trim(), description: editor.description.trim(), conditions: editor.conditions,
    });
    toast.success(editor.id ? 'Playbook mis à jour' : 'Playbook créé');
    setOpen(false);
  };

  const del = async (id: string) => {
    await remove.mutateAsync(id);
    toast.success('Playbook supprimé');
  };

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Playbooks</h1>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Nouveau playbook
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Crée un playbook par stratégie. Chaque trade sera lié à un playbook et validé contre ses conditions.
      </p>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : playbooks.length === 0 ? (
        <Card className="bg-card border-border p-12 flex flex-col items-center gap-3 text-muted-foreground">
          <BookOpen className="h-10 w-10 opacity-50" />
          <p className="text-sm">Aucun playbook. Crée ton premier !</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {playbooks.map(pb => (
            <Card key={pb.id} className="bg-card border-border">
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-semibold text-foreground">{pb.name}</CardTitle>
                  {pb.description && <p className="text-xs text-muted-foreground mt-1">{pb.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pb)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del(pb.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{pb.conditions.length} conditions</div>
                {pb.conditions.map((c, i) => (
                  <div key={c.id} className="flex items-start gap-2 text-xs py-1">
                    <span className="font-mono text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-foreground">{c.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editor.id ? 'Modifier le playbook' : 'Nouveau playbook'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Nom de la stratégie</label>
              <Input value={editor.name} onChange={e => setEditor(s => ({ ...s, name: e.target.value }))} placeholder="ICT Breakout" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Description</label>
              <Textarea value={editor.description} onChange={e => setEditor(s => ({ ...s, description: e.target.value }))} placeholder="Brève description..." className="min-h-[60px]" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Conditions</label>
              {editor.conditions.length > 0 && (
                <div className="space-y-1 mb-2">
                  {editor.conditions.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-secondary/50">
                      <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{c.label}</p>
                        {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeCond(c.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="Nom de la condition" value={condLabel} onChange={e => setCondLabel(e.target.value)} />
                <Input placeholder="Description (optionnel)" value={condDesc} onChange={e => setCondDesc(e.target.value)} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCond} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Ajouter la condition
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? '...' : 'Sauvegarder'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
