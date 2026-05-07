import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/contexts/AccountContext';

export function useTrades() {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  return useQuery({
    queryKey: ['trades', user?.id, currentAccount?.id],
    enabled: !!user && !!currentAccount,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('account_id', currentAccount!.id)
        .order('trade_date', { ascending: false })
        .order('trade_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTrade(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['trade', id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('trades').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTradePhotos(tradeId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['trade-photos', tradeId],
    enabled: !!user && !!tradeId,
    queryFn: async () => {
      const { data, error } = await supabase.from('trade_photos').select('*').eq('trade_id', tradeId!).order('taken_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllPhotos() {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  return useQuery({
    queryKey: ['all-photos', user?.id, currentAccount?.id],
    enabled: !!user && !!currentAccount,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_photos')
        .select('*, trades(instrument, trade_date, direction, is_valid)')
        .eq('account_id', currentAccount!.id)
        .order('taken_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trades').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades'] }),
  });
}
