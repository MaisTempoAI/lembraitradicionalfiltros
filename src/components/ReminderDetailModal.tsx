import { Reminder } from '@/types/reminder';
import StatusBadge from '@/components/StatusBadge';
import CategoryBadge from '@/components/CategoryBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Image, Music, FileText } from 'lucide-react';
import { parseDateLocal } from '@/lib/utils';

interface ReminderDetailModalProps {
  reminder: Reminder | null;
  open: boolean;
  onClose: () => void;
}

export default function ReminderDetailModal({ reminder, open, onClose }: ReminderDetailModalProps) {
  if (!reminder) return null;

  const formatDate = (d?: string) => {
    if (!d) return '—';
    try {
      return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return d;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Detalhes do Lembrete</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{reminder.nome}</h3>
            <StatusBadge status={reminder.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">WhatsApp</span>
              <p className="font-medium mt-0.5">{reminder.whatsapp}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Categoria</span>
              <div className="mt-0.5"><CategoryBadge categoria={reminder.categoria} /></div>
            </div>
            <div>
              <span className="text-muted-foreground">Data de Envio</span>
              <p className="font-medium mt-0.5">{format(parseDateLocal(reminder.data_contato), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Data de Envio</span>
              <p className="font-medium mt-0.5">
                {reminder.data_envio_especifica
                  ? format(new Date(reminder.data_envio_especifica), 'dd/MM/yyyy')
                  : reminder.intervalo_dias
                  ? `${reminder.intervalo_dias} dias após contato`
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Hora do Envio</span>
              <p className="font-medium mt-0.5">{reminder.hora_envio}</p>
            </div>
            {reminder.recorrente && (
              <div>
                <span className="text-muted-foreground">Recorrência</span>
                <p className="font-medium mt-0.5 capitalize">
                  {reminder.recorrencia_tipo} ({reminder.recorrencia_repeticoes}x)
                </p>
              </div>
            )}
          </div>

          <div>
            <span className="text-sm text-muted-foreground">Mensagem</span>
          <p className="mt-1 p-3 bg-muted rounded-lg text-sm leading-relaxed">{reminder.mensagem}</p>
          </div>

          {(reminder.anexo_imagem_url || reminder.anexo_audio_url || reminder.anexo_pdf_url) && (
            <div className="space-y-3">
              <span className="text-sm text-muted-foreground">Anexos</span>
              {reminder.anexo_imagem_url && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium"><Image className="h-4 w-4" /> Imagem</div>
                  <img src={reminder.anexo_imagem_url} alt="Anexo" className="rounded-lg max-h-48 object-contain border" />
                </div>
              )}
              {reminder.anexo_audio_url && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium"><Music className="h-4 w-4" /> Áudio</div>
                  <audio controls src={reminder.anexo_audio_url} className="w-full" />
                </div>
              )}
              {reminder.anexo_pdf_url && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4" /> PDF</div>
                  <a href={reminder.anexo_pdf_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">Abrir PDF</a>
                </div>
              )}
            </div>
          )}

          {reminder.motivo_erro && (
            <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
              <strong>Erro:</strong> {reminder.motivo_erro}
            </div>
          )}

          {reminder.observacoes && (
            <div>
              <span className="text-sm text-muted-foreground">Observações</span>
              <p className="mt-1 text-sm">{reminder.observacoes}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>Criado em: {formatDate(reminder.created_at)}</p>
            {reminder.data_envio_realizado && <p>Enviado em: {formatDate(reminder.data_envio_realizado)}</p>}
            {reminder.data_arquivamento && <p>Arquivado em: {formatDate(reminder.data_arquivamento)}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}