import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccount } from '@/contexts/AccountContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountSwitcher() {
  const { user } = useAuth();
  const { accounts, currentAccount, setCurrentAccountId, refresh } = useAccount();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [balance, setBalance] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('trading_accounts').insert({
      user_id: user.id, name: name.trim(), currency,
      initial_balance: balance ? Number(balance) : 0,
    }).select('id').single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refresh();
    if (data) setCurrentAccountId(data.id);
    toast.success('Compte créé');
    setOpen(false); setName(''); setBalance('');
  };

  return (
    <div className="px-2 space-y-1">
      <div className="hidden lg:flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground px-2">
        <Wallet className="h-3 w-3" /> Compte
      </div>
      <div className="flex items-center gap-1">
        <Select value={currentAccount?.id ?? ''} onValueChange={setCurrentAccountId}>
          <SelectTrigger className="h-8 text-xs bg-secondary border-border flex-1 min-w-0">
            <SelectValue placeholder="Compte" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map(a => (
              <SelectItem key={a.id} value={a.id} className="text-xs">
                {a.name} <span className="text-muted-foreground ml-1">({a.currency})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><Plus className="h-3.5 w-3.5" /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau compte de trading</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Nom</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Prop firm FTMO" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Devise</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Balance initiale</Label>
                  <Input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="10000" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={create} disabled={saving || !name.trim()}>{saving ? '...' : 'Créer'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
