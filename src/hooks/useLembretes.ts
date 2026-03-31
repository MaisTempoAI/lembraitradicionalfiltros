import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type LembreteRow = {
  id: string;
  usuario_id: string;
  nome: string;
  whatsapp: string;
  data_contato: string;
  intervalo_dias: number | null;
  data_envio_especifica: string | null;
  hora_envio: string;
  categoria_id: string | null;
  mensagem: string;
  status: 'aguardando' | 'enviado' | 'erro' | 'cancelado' | 'arquivado' | 'clonado' | 'contato';
  recorrente: boolean;
  recorrencia_tipo: 'diario' | 'semanal' | 'quinzenal' | 'mensal' | 'anual' | null;
  recorrencia_repeticoes: number | null;
  recorrencia_pai: string | null;
  data_envio_realizado: string | null;
  data_arquivamento: string | null;
  motivo_erro: string | null;
  anexo_imagem_url: string | null;
  anexo_audio_url: string | null;
  anexo_pdf_url: string | null;
  observacoes: string | null;
  copiado_de: string | null;
  created_at: string;
  updated_at: string;
  categoria?: {
    id: string;
    nome: string;
    cor: string;
    icone: string;
  } | null;
};

export function useLembretes(statusFilter?: ('aguardando' | 'enviado' | 'erro' | 'cancelado' | 'arquivado' | 'clonado' | 'contato')[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lembretes', statusFilter, user?.id],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('lembrai_lembretes')
        .select('*, categoria:lembrai_categorias(id, nome, cor, icone)')
        .eq('usuario_id', user!.id);
      
      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as LembreteRow[];
    },
  });
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lembrai_dashboard_stats')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useAllLembretes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-lembretes', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lembrai_lembretes')
        .select('*, categoria:lembrai_categorias(id, nome, cor, icone)')
        .eq('usuario_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LembreteRow[];
    },
  });
}

export function useCategorias() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['categorias', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lembrai_categorias')
        .select('*')
        .eq('usuario_id', user!.id)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLembrete() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lembrete: {
      nome: string;
      whatsapp: string;
      data_contato: string;
      intervalo_dias?: number | null;
      data_envio_especifica?: string | null;
      hora_envio: string;
      categoria_id?: string | null;
      mensagem: string;
      recorrente: boolean;
      recorrencia_tipo?: 'diario' | 'semanal' | 'quinzenal' | 'mensal' | 'anual' | null;
      recorrencia_repeticoes?: number | null;
      recorrencia_pai?: string | null;
      observacoes?: string | null;
      anexo_imagem_url?: string | null;
      anexo_audio_url?: string | null;
      anexo_pdf_url?: string | null;
    }) => {
      const insertData: any = { ...lembrete, usuario_id: user!.id };
      const { data, error } = await supabase
        .from('lembrai_lembretes')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lembretes'] });
      queryClient.invalidateQueries({ queryKey: ['all-lembretes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Lembrete criado com sucesso!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao criar lembrete: ' + err.message);
    },
  });
}

export function useUpdateLembrete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('lembrai_lembretes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lembretes'] });
      queryClient.invalidateQueries({ queryKey: ['all-lembretes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useDeleteLembrete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lembrai_lembretes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lembretes'] });
      queryClient.invalidateQueries({ queryKey: ['all-lembretes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Lembrete deletado.');
    },
  });
}

export function useCopiarLembrete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lembreteId: string) => {
      const { data, error } = await supabase.rpc('lembrai_copiar_lembrete', {
        p_lembrete_id: lembreteId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lembretes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Lembrete copiado!');
    },
  });
}

export function useArquivarLembrete() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lembreteId: string) => {
      const { data, error } = await supabase.rpc('lembrai_arquivar_lembrete', {
        p_lembrete_id: lembreteId,
        p_usuario_id: user!.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lembretes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Lembrete arquivado!');
    },
  });
}
