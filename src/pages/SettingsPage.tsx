import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Settings as SettingsIcon, Plus, Trash2, LogOut, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount, TradingAccount } from '@/contexts/AccountContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsPage() {
  const { user, signOut } = useAuth() as any;
  const { accounts, refresh } = useAccount();
  const { theme, setTheme } = useTheme();

  // ----- Profile -----
  const [displayName, setDisplayName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      setDisplayName(data?.display_name ?? '');
      setProfileLoading(false);
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('profiles')
          .update({ display_name: displayName }).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles')
          .insert({ user_id: user.id, display_name: displayName });
        if (error) throw error;
      }
      toast.success('Profil mis à jour');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setProfileSaving(false);
    }
  };

  // ----- Accounts -----
  const [newAccount, setNewAccount] = useState({ name: '', currency: 'USD', initial_balance: '' });
  const [creating, setCreating] = useState(false);

  const createAccount = async () => {
    if (!user) return;
    if (!newAccount.name.trim()) { toast.error('Nom du compte requis'); return; }
    setCreating(true);
    try {
      const { error } = await supabase.from('trading_accounts').insert({
        user_id: user.id,
        name: newAccount.name.trim(),
        currency: newAccount.currency,
        initial_balance: newAccount.initial_balance === '' ? 0 : Number(newAccount.initial_balance),
        is_active: true,
      });
      if (error) throw error;
      setNewAccount({ name: '', currency: 'USD', initial_balance: '' });
      await refresh();
      toast.success('Compte créé');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const updateAccount = async (id: string, patch: Partial<TradingAccount>) => {
    const { error } = await supabase.from('trading_accounts').update(patch).eq('id', id);
    if (error) { toast.error(error.message); return; }
    await refresh();
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from('trading_accounts').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    await refresh();
    toast.success('Compte supprimé');
  };

  const handleSignOut = async () => {
    try {
      if (signOut) await signOut();
      else await supabase.auth.signOut();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Paramètres</h1>
      </div>

      {/* Profile */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={user?.email ?? ''} disabled className="bg-secondary border-border font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nom d'affichage</Label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Votre nom"
              className="bg-secondary border-border"
              disabled={profileLoading}
            />
          </div>
          <Button size="sm" onClick={saveProfile} disabled={profileSaving || profileLoading}>
            {profileSaving ? '...' : 'Sauvegarder'}
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Apparence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm text-foreground">Thème</Label>
              <p className="text-xs text-muted-foreground">Bascule entre clair et sombre</p>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={c => setTheme(c ? 'dark' : 'light')}
              />
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading accounts */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Comptes de trading</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun compte. Crée ton premier compte ci-dessous.</p>
          )}

          {accounts.map(acc => (
            <div key={acc.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 rounded-md border border-border bg-secondary/30">
              <div className="md:col-span-4 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nom</Label>
                <Input
                  defaultValue={acc.name}
                  onBlur={e => e.target.value !== acc.name && updateAccount(acc.id, { name: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Devise</Label>
                <Select value={acc.currency} onValueChange={v => updateAccount(acc.id, { currency: v })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Capital initial</Label>
                <Input
                  type="number"
                  defaultValue={acc.initial_balance ?? 0}
                  onBlur={e => {
                    const v = Number(e.target.value);
                    if (v !== Number(acc.initial_balance ?? 0)) updateAccount(acc.id, { initial_balance: v });
                  }}
                  className="bg-secondary border-border font-mono"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Switch
                  checked={acc.is_active}
                  onCheckedChange={c => updateAccount(acc.id, { is_active: c })}
                />
                <span className="text-xs text-muted-foreground">{acc.is_active ? 'Actif' : 'Inactif'}</span>
              </div>
              <div className="md:col-span-1 flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le compte « {acc.name} » sera supprimé. Les trades associés resteront mais ne seront plus rattachés à un compte actif.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteAccount(acc.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}

          {/* New account */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end pt-4 border-t border-border">
            <div className="md:col-span-4 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nouveau compte</Label>
              <Input
                value={newAccount.name}
                onChange={e => setNewAccount(s => ({ ...s, name: e.target.value }))}
                placeholder="Ex: FTMO 100k"
                className="bg-secondary border-border"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Devise</Label>
              <Select value={newAccount.currency} onValueChange={v => setNewAccount(s => ({ ...s, currency: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Capital initial</Label>
              <Input
                type="number"
                value={newAccount.initial_balance}
                onChange={e => setNewAccount(s => ({ ...s, initial_balance: e.target.value }))}
                placeholder="10000"
                className="bg-secondary border-border font-mono"
              />
            </div>
            <div className="md:col-span-3">
              <Button onClick={createAccount} disabled={creating} className="w-full gap-1.5">
                <Plus className="h-4 w-4" />
                {creating ? '...' : 'Créer'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account / sign out */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Compte</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut} className="gap-1.5">
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
