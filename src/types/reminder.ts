export type ReminderStatus = 'aguardando' | 'enviado' | 'erro' | 'cancelado' | 'arquivado' | 'clonado' | 'contato';

export interface Reminder {
  id: string;
  nome: string;
  whatsapp: string;
  data_contato: string;
  intervalo_dias?: number;
  data_envio_especifica?: string;
  hora_envio: string;
  categoria: string;
  mensagem: string;
  status: ReminderStatus;
  recorrente: boolean;
  recorrencia_tipo?: 'diario' | 'semanal' | 'quinzenal' | 'mensal' | 'anual';
  recorrencia_repeticoes?: number;
  data_envio_realizado?: string;
  data_arquivamento?: string;
  motivo_erro?: string;
  anexo_imagem_url?: string;
  anexo_audio_url?: string;
  anexo_pdf_url?: string;
  observacoes?: string;
  copiado_de?: string;
  created_at: string;
  updated_at: string;
}

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
  icone: string;
}

export const STATUS_CONFIG: Record<ReminderStatus, { label: string; icon: string; className: string }> = {
  aguardando: { label: 'Aguardando', icon: '⏳', className: 'status-aguardando' },
  enviado: { label: 'Enviado', icon: '✅', className: 'status-enviado' },
  erro: { label: 'Erro', icon: '❌', className: 'status-erro' },
  cancelado: { label: 'Cancelado', icon: '🚫', className: 'status-cancelado' },
  arquivado: { label: 'Arquivado', icon: '📦', className: 'status-arquivado' },
  clonado: { label: 'Clonado', icon: '📋', className: 'status-clonado' },
  contato: { label: 'Contato', icon: '👤', className: 'status-contato' },
};

export const DEFAULT_CATEGORIAS: Categoria[] = [
  { id: '1', nome: 'SERVIÇO', cor: '#5397B9', icone: '🔧' },
  { id: '2', nome: 'VISITA', cor: '#10B981', icone: '🏠' },
  { id: '3', nome: 'MANUTENÇÃO', cor: '#F5D991', icone: '⚙️' },
];