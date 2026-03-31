import { useState, useMemo } from 'react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import CategoryBadge from '@/components/CategoryBadge';
import ReminderDetailModal from '@/components/ReminderDetailModal';
import { useLembretes, useCopiarLembrete, useDeleteLembrete, LembreteRow } from '@/hooks/useLembretes';
import { useCategorias } from '@/hooks/useLembretes';
import { Reminder } from '@/types/reminder';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Eye, Copy, Search, Trash2, CheckSquare } from 'lucide-react';
import { getRowStatusClass } from '@/lib/status-utils';
import { parseDateLocal } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

function toReminder(r: LembreteRow): Reminder {
  return {
    id: r.id, nome: r.nome, whatsapp: r.whatsapp, data_contato: r.data_contato,
    intervalo_dias: r.intervalo_dias ?? undefined, data_envio_especifica: r.data_envio_especifica ?? undefined,
    hora_envio: r.hora_envio, categoria: r.categoria?.nome || 'Sem categoria', mensagem: r.mensagem,
    status: r.status, recorrente: r.recorrente, recorrencia_tipo: r.recorrencia_tipo ?? undefined,
    recorrencia_repeticoes: r.recorrencia_repeticoes ?? undefined,
    data_envio_realizado: r.data_envio_realizado ?? undefined,
    data_arquivamento: r.data_arquivamento ?? undefined, motivo_erro: r.motivo_erro ?? undefined,
    anexo_imagem_url: r.anexo_imagem_url ?? undefined, anexo_audio_url: r.anexo_audio_url ?? undefined,
    anexo_pdf_url: r.anexo_pdf_url ?? undefined,
    observacoes: r.observacoes ?? undefined, created_at: r.created_at, updated_at: r.updated_at,
  };
}

export default function ArchivedReminders() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  // Batch selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: allLembretes = [], isLoading } = useLembretes(['arquivado']);
  const { data: categorias = [] } = useCategorias();
  const copiar = useCopiarLembrete();
  const deletar = useDeleteLembrete();

  const reminders = useMemo(() => {
    const now = new Date();
    return allLembretes
      .filter((r) => !search || r.nome.toLowerCase().includes(search.toLowerCase()) || r.whatsapp.includes(search))
      .filter((r) => catFilter === 'all' || r.categoria?.nome === catFilter)
      .filter((r) => {
        if (dateFilter === 'all') return true;
        const d = parseDateLocal(r.data_contato);
        if (dateFilter === 'hoje') return isWithinInterval(d, { start: startOfDay(now), end: endOfDay(now) });
        if (dateFilter === 'semana') return isWithinInterval(d, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
        if (dateFilter === 'mes') return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
        return true;
      });
  }, [allLembretes, search, catFilter, dateFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(reminders.map(r => r.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    const count = selectedIds.size;
    for (const id of selectedIds) {
      await deletar.mutateAsync(id);
    }
    toast.success(`${count} lembrete(s) deletado(s).`);
    exitSelectionMode();
    setConfirmDelete(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-4xl font-bold tracking-tight">Lembretes Arquivados <span className="text-muted-foreground text-2xl font-normal">({reminders.length})</span></h1>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectionMode ? 'secondary' : 'outline'}
              className="gap-2 font-semibold border-2"
              onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
            >
              <CheckSquare className="h-4 w-4" /> Selecionar Múltiplos
            </Button>
          </div>
        </div>

        {selectionMode && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/70 border rounded-xl">
            <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
            <Button size="sm" variant="outline" onClick={selectAll}>Selecionar Todos</Button>
            <Button size="sm" variant="outline" onClick={clearSelection}>Limpar</Button>
            <Button size="sm" variant="ghost" onClick={exitSelectionMode}>✕ Cancelar</Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={selectedIds.size === 0}
              onClick={() => setConfirmDelete(true)}
              className="ml-auto"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Deletar ({selectedIds.size})
            </Button>
          </div>
        )}

        <div className="rounded-xl bg-card border p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-10 h-12 border-2" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-40 border-2"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.nome}>{c.icone} {c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40 border-2"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="hoje">📅 Hoje</SelectItem>
                <SelectItem value="semana">📆 Semana</SelectItem>
                <SelectItem value="mes">🗓️ Mês</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearch(''); setCatFilter('all'); setDateFilter('all'); }} className="border-2">Limpar</Button>
          </div>
        </div>

        <div className="rounded-xl bg-card border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {selectionMode && (
                    <th className="p-4 w-10">
                      <Checkbox
                        checked={selectedIds.size === reminders.length && reminders.length > 0}
                        onCheckedChange={(v) => v ? selectAll() : clearSelection()}
                      />
                    </th>
                  )}
                  <th className="text-left p-4 font-semibold">Nome</th>
                  <th className="text-left p-4 font-semibold hidden md:table-cell">WhatsApp</th>
                  <th className="text-left p-4 font-semibold hidden lg:table-cell">Arquivado em</th>
                  <th className="text-left p-4 font-semibold">Status Final</th>
                  <th className="text-left p-4 font-semibold hidden md:table-cell">Categoria</th>
                  <th className="text-right p-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}><td colSpan={selectionMode ? 7 : 6} className="p-4"><Skeleton className="h-10" /></td></tr>
                  ))
                ) : reminders.length === 0 ? (
                  <tr><td colSpan={selectionMode ? 7 : 6} className="text-center py-12 text-muted-foreground">Nenhum lembrete arquivado ainda.</td></tr>
                ) : (
                  reminders.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b hover:bg-muted/30 transition-colors ${getRowStatusClass(r.status)} ${selectionMode && selectedIds.has(r.id) ? 'bg-primary/5' : ''}`}
                      onClick={selectionMode ? () => toggleSelect(r.id) : undefined}
                      style={selectionMode ? { cursor: 'pointer' } : undefined}
                    >
                      {selectionMode && (
                        <td className="p-4 w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(r.id)}
                            onCheckedChange={() => toggleSelect(r.id)}
                          />
                        </td>
                      )}
                      <td className="p-4 font-medium">{r.nome}</td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">{r.whatsapp}</td>
                      <td className="p-4 hidden lg:table-cell text-muted-foreground">
                        {r.data_arquivamento ? format(new Date(r.data_arquivamento), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="p-4"><StatusBadge status="arquivado" /></td>
                      <td className="p-4 hidden md:table-cell"><CategoryBadge categoria={r.categoria?.nome || 'Sem categoria'} /></td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {!selectionMode && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedReminder(toReminder(r))}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copiar.mutate(r.id)}><Copy className="h-4 w-4" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ReminderDetailModal reminder={selectedReminder} open={!!selectedReminder} onClose={() => setSelectedReminder(null)} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ ATENÇÃO: DESEJA EXCLUIR A SELEÇÃO?</AlertDialogTitle>
            <AlertDialogDescription className="font-semibold">
              ESSA AÇÃO NÃO PODERÁ SER DESFEITA.{' '}
              <span className="block mt-1">{selectedIds.size} lembrete(s) serão excluídos permanentemente.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar {selectedIds.size} lembrete(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
