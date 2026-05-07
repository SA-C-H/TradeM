import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface TradingAccount {
  id: string;
  name: string;
  currency: string;
  initial_balance: number | null;
  is_active: boolean;
}

interface AccountCtx {
  accounts: TradingAccount[];
  currentAccount: TradingAccount | null;
  setCurrentAccountId: (id: string) => void;
  refresh: () => Promise<void>;
  loading: boolean;
}

const Ctx = createContext<AccountCtx>({
  accounts: [], currentAccount: null, setCurrentAccountId: () => {}, refresh: async () => {}, loading: true,
});

const STORAGE_KEY = 'tradelab.currentAccountId';

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setAccounts([]); setLoading(false); return; }
    const { data } = await supabase.from('trading_accounts').select('*').order('created_at', { ascending: true });
    const list = (data ?? []) as TradingAccount[];
    setAccounts(list);
    setLoading(false);
    if (list.length && (!currentId || !list.find(a => a.id === currentId))) {
      const fallback = list[0].id;
      setCurrentId(fallback);
      localStorage.setItem(STORAGE_KEY, fallback);
    }
  }, [user, currentId]);

  useEffect(() => { refresh(); }, [user]);

  const setCurrentAccountId = (id: string) => {
    setCurrentId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const currentAccount = accounts.find(a => a.id === currentId) ?? null;

  return (
    <Ctx.Provider value={{ accounts, currentAccount, setCurrentAccountId, refresh, loading }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAccount = () => useContext(Ctx);
