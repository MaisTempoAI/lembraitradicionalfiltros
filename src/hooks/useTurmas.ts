import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TurmaMembro {
  id: string;
  nome: string;
  whatsapp: string;
  turma_id: string;
  created_at: string;
}

export interface Turma {
  id: string;
  usuario_id: string;
  nome: string;
  cor: string;
  created_at: string;
  updated_at: string;
  membros?: TurmaMembro[];
  membros_count?: number;
}

export function useTurmas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['turmas', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('lembrai_turmas')
        .select('*, lembrai_turma_membros(id)')
        .eq('usuario_id', user.id)
        .order('nome');
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        membros_count: t.lembrai_turma_membros?.length || 0,
        lembrai_turma_membros: undefined,
      })) as Turma[];
    },
    enabled: !!user,
  });
}

export function useTurmaById(id: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['turma', id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from('lembrai_turmas')
        .select('*, lembrai_turma_membros(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return {
        ...data,
        membros: data.lembrai_turma_membros || [],
      } as Turma;
    },
    enabled: !!id && !!user,
  });
}

export function useCreateTurma() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nome, cor, membros }: { nome: string; cor: string; membros: { nome: string; whatsapp: string }[] }) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('lembrai_turmas')
        .insert({ usuario_id: user.id, nome, cor })
        .select()
        .single();
      if (error) throw error;
      if (membros.length > 0) {
        const { error: mError } = await supabase
          .from('lembrai_turma_membros')
          .insert(membros.map(m => ({ turma_id: data.id, nome: m.nome, whatsapp: m.whatsapp })));
        if (mError) throw mError;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turmas'] });
      toast.success('Turma criada com sucesso!');
    },
    onError: () => toast.error('Erro ao criar turma'),
  });
}

export function useUpdateTurma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nome, cor, membros }: { id: string; nome: string; cor: string; membros: { nome: string; whatsapp: string }[] }) => {
      const { error } = await supabase
        .from('lembrai_turmas')
        .update({ nome, cor })
        .eq('id', id);
      if (error) throw error;
      // Replace members: delete all then insert
      const { error: dError } = await supabase
        .from('lembrai_turma_membros')
        .delete()
        .eq('turma_id', id);
      if (dError) throw dError;
      if (membros.length > 0) {
        const { error: mError } = await supabase
          .from('lembrai_turma_membros')
          .insert(membros.map(m => ({ turma_id: id, nome: m.nome, whatsapp: m.whatsapp })));
        if (mError) throw mError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turmas'] });
      qc.invalidateQueries({ queryKey: ['turma'] });
      toast.success('Turma atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar turma'),
  });
}

export function useDeleteTurma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lembrai_turmas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turmas'] });
      toast.success('Turma excluída!');
    },
    onError: () => toast.error('Erro ao excluir turma'),
  });
}
