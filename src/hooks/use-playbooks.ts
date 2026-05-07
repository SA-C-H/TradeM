import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlaybookCondition { id: string; label: string; description?: string }
export interface Playbook {
  id: string;
  name: string;
  description: string | null;
  conditions: PlaybookCondition[];
}

export function usePlaybooks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['playbooks', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('playbooks').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(p => ({
        id: p.id, name: p.name, description: p.description,
        conditions: (Array.isArray(p.conditions) ? p.conditions : []) as unknown as PlaybookCondition[],
      })) as Playbook[];
    },
  });
}

export function useUpsertPlaybook() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (pb: { id?: string; name: string; description?: string; conditions: PlaybookCondition[] }) => {
      if (!user) throw new Error('Not authenticated');
      if (pb.id) {
        const { error } = await supabase.from('playbooks').update({
          name: pb.name, description: pb.description ?? null, conditions: pb.conditions as any,
        }).eq('id', pb.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('playbooks').insert({
          user_id: user.id, name: pb.name, description: pb.description ?? null, conditions: pb.conditions as any,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playbooks'] }),
  });
}

export function useDeletePlaybook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('playbooks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playbooks'] }),
  });
}
