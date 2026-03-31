import { useState, useMemo, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useLembretes, LembreteRow } from '@/hooks/useLembretes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, CalendarDays, Search, Phone, X } from 'lucide-react';
import {
  format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

import { Reminder, ReminderStatus, STATUS_CONFIG } from '@/types/reminder';
import ReminderDetailModal from '@/components/ReminderDetailModal';

type ViewMode = 'dia' | 'semana' | 'mes';

const SLOTS = ['07:07', '10:10', '13:13', '17:17', '20:20', '22:22'];

const STATUS_OPTIONS: { value: ReminderStatus | 'todos'; label: string; icon: string }[] = [
  { value: 'todos', label: 'Todos', icon: '📋' },
  { value: 'aguardando', label: 'Aguardando', icon: STATUS_CONFIG.aguardando.icon },
  { value: 'enviado', label: 'Enviado', icon: STATUS_CONFIG.enviado.icon },
  { value: 'erro', label: 'Erro', icon: STATUS_CONFIG.erro.icon },
  { value: 'cancelado', label: 'Cancelado', icon: STATUS_CONFIG.cancelado.icon },
  { value: 'arquivado', label: 'Arquivado', icon: STATUS_CONFIG.arquivado.icon },
  { value: 'clonado', label: 'Clonado', icon: STATUS_CONFIG.clonado.icon },
  { value: 'contato', label: 'Contato', icon: STATUS_CONFIG.contato.icon },
];

function getSlot(hora_envio: string): string {
  if (hora_envio.startsWith('07')) return '07:07';
  if (hora_envio.startsWith('10')) return '10:10';
  if (hora_envio.startsWith('13')) return '13:13';
  if (hora_envio.startsWith('17')) return '17:17';
  if (hora_envio.startsWith('20')) return '20:20';
  if (hora_envio.startsWith('22')) return '22:22';
  return hora_envio;
}

function getLembreteDate(l: LembreteRow): string {
  return l.data_envio_especifica ?? l.data_contato;
}

function lembreteToReminder(l: LembreteRow): Reminder {
  return {
    id: l.id,
    nome: l.nome,
    whatsapp: l.whatsapp,
    data_contato: l.data_contato,
    intervalo_dias: l.intervalo_dias ?? undefined,
    data_envio_especifica: l.data_envio_especifica ?? undefined,
    hora_envio: l.hora_envio,
    categoria: l.categoria?.nome ?? '',
    mensagem: l.mensagem,
    status: l.status,
    recorrente: l.recorrente,
    recorrencia_tipo: l.recorrencia_tipo as any,
    recorrencia_repeticoes: l.recorrencia_repeticoes ?? undefined,
    data_envio_realizado: l.data_envio_realizado ?? undefined,
    data_arquivamento: l.data_arquivamento ?? undefined,
    motivo_erro: l.motivo_erro ?? undefined,
    anexo_imagem_url: l.anexo_imagem_url ?? undefined,
    anexo_audio_url: l.anexo_audio_url ?? undefined,
    anexo_pdf_url: l.anexo_pdf_url ?? undefined,
    observacoes: l.observacoes ?? undefined,
    copiado_de: l.copiado_de ?? undefined,
    created_at: l.created_at,
    updated_at: l.updated_at,
  };
}

// ─── Reminder Card ───────────────────────────────────────────────────────────
function ReminderChip({ lembrete, onClick, compact = false }: {
  lembrete: LembreteRow;
  onClick: () => void;
  compact?: boolean;
}) {
  const cor = lembrete.categoria?.cor ?? '#6366f1';
  const icone = lembrete.categoria?.icone ?? '📌';

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium truncate w-full text-left transition-opacity hover:opacity-80"
        style={{ backgroundColor: cor + '22', borderLeft: `3px solid ${cor}`, color: cor }}
        title={lembrete.nome}
      >
        <span>{icone}</span>
        <span className="truncate">{lembrete.nome}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium w-full text-left transition-all hover:opacity-90 hover:shadow-md"
      style={{ backgroundColor: cor + '18', borderLeft: `4px solid ${cor}` }}
    >
      <span className="text-base shrink-0">{icone}</span>
      <div className="min-w-0">
        <p className="font-semibold truncate" style={{ color: cor }}>{lembrete.nome}</p>
        <p className="text-xs text-muted-foreground truncate">{lembrete.categoria?.nome ?? '—'}</p>
      </div>
    </button>
  );
}

// ─── Day View ────────────────────────────────────────────────────────────────
function AgendaDayView({
  date, porData, onSelect,
}: {
  date: Date;
  porData: Record<string, Record<string, LembreteRow[]>>;
  onSelect: (l: LembreteRow) => void;
}) {
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayMap = porData[dateKey] ?? {};

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/30 flex items-center gap-3">
        <div className={cn(
          'h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold',
          isToday(date) ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        )}>
          {format(date, 'd')}
        </div>
        <div>
          <p className="font-semibold capitalize">{format(date, 'EEEE', { locale: ptBR })}</p>
          <p className="text-sm text-muted-foreground">{format(date, 'MMMM yyyy', { locale: ptBR })}</p>
        </div>
      </div>

      <div className="divide-y">
        {SLOTS.map((slot) => {
          const lembretes = dayMap[slot] ?? [];
          return (
            <div key={slot} className="flex min-h-[80px]">
              <div className="w-20 shrink-0 flex items-start justify-center pt-4">
                <span className={cn(
                  'text-sm font-bold tabular-nums',
                  lembretes.length > 0 ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {slot}
                </span>
              </div>
              <div className="flex-1 p-3 flex flex-col gap-2 border-l">
                {lembretes.length === 0 ? (
                  <div className="h-full flex items-center">
                    <div className="w-full border-t border-dashed border-border/50" />
                  </div>
                ) : (
                  lembretes.map((l) => (
                    <ReminderChip key={l.id} lembrete={l} onClick={() => onSelect(l)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────
function AgendaWeekView({
  date, porData, onSelect,
}: {
  date: Date;
  porData: Record<string, Record<string, LembreteRow[]>>;
  onSelect: (l: LembreteRow) => void;
}) {
  const weekStart = startOfWeek(date, { locale: ptBR });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="grid border-b" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
        <div className="border-r bg-muted/30" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'py-3 text-center border-r last:border-r-0',
              isToday(day) ? 'bg-primary/10' : 'bg-muted/20'
            )}
          >
            <p className="text-xs text-muted-foreground uppercase font-medium">
              {format(day, 'EEE', { locale: ptBR })}
            </p>
            <div className={cn(
              'mx-auto mt-1 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold',
              isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        {SLOTS.map((slot) => (
          <div key={slot} className="grid border-b last:border-b-0" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
            <div className="flex items-start justify-center pt-3 border-r bg-muted/10">
              <span className="text-xs font-bold text-primary tabular-nums">{slot}</span>
            </div>
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const lembretes = porData[key]?.[slot] ?? [];
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'p-1.5 border-r last:border-r-0 min-h-[72px] flex flex-col gap-1',
                    isToday(day) ? 'bg-primary/5' : ''
                  )}
                >
                  {lembretes.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-full border-t border-dashed border-border/30" />
                    </div>
                  ) : (
                    lembretes.map((l) => (
                      <ReminderChip key={l.id} lembrete={l} onClick={() => onSelect(l)} compact />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Month View ──────────────────────────────────────────────────────────────
function AgendaMonthView({
  date, porData, onSelect, onDayClick,
}: {
  date: Date;
  porData: Record<string, Record<string, LembreteRow[]>>;
  onSelect: (l: LembreteRow) => void;
  onDayClick: (day: Date) => void;
}) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });

  const days: Date[] = [];
  let cur = calStart;
  while (cur <= calEnd) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function getDayLembretes(day: Date): LembreteRow[] {
    const key = format(day, 'yyyy-MM-dd');
    const dayMap = porData[key] ?? {};
    return Object.values(dayMap).flat();
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === date.getMonth();
          const todayDay = isToday(day);
          const lembretes = getDayLembretes(day);
          const visible = lembretes.slice(0, 3);
          const extra = lembretes.length - 3;

          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-[100px] p-2 border-b border-r cursor-pointer transition-colors hover:bg-muted/40',
                !isCurrentMonth && 'bg-muted/10',
                idx % 7 === 6 && 'border-r-0',
                idx >= days.length - 7 && 'border-b-0'
              )}
            >
              <div className="flex justify-center mb-1">
                <span className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-sm font-semibold',
                  todayDay ? 'bg-primary text-primary-foreground' : '',
                  !isCurrentMonth && 'text-muted-foreground',
                  !todayDay && isCurrentMonth && 'text-foreground'
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                {visible.map((l) => (
                  <button
                    key={l.id}
                    onClick={(e) => { e.stopPropagation(); onSelect(l); }}
                    className="flex items-center gap-1 rounded px-1 py-0.5 text-xs truncate w-full text-left hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: (l.categoria?.cor ?? '#6366f1') + '22',
                      color: l.categoria?.cor ?? '#6366f1',
                      borderLeft: `2px solid ${l.categoria?.cor ?? '#6366f1'}`,
                    }}
                    title={l.nome}
                  >
                    <span>{l.categoria?.icone ?? '📌'}</span>
                    <span className="truncate">{l.nome}</span>
                  </button>
                ))}
                {extra > 0 && (
                  <span className="text-xs text-muted-foreground pl-1">+{extra} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<ViewMode>(isMobile ? 'dia' : 'semana');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLembrete, setSelectedLembrete] = useState<LembreteRow | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<ReminderStatus | 'todos'>('todos');
  const [buscaNome, setBuscaNome] = useState('');
  const [buscaTelefone, setBuscaTelefone] = useState('');

  // If resized to mobile while in week view, switch to day
  useEffect(() => {
    if (isMobile && mode === 'semana') {
      setMode('dia');
    }
  }, [isMobile]);

  const viewOptions: ViewMode[] = isMobile ? ['dia', 'mes'] : ['dia', 'semana', 'mes'];

  const { data: lembretes = [] } = useLembretes();

  const lembretesFiltrados = useMemo(() => {
    return lembretes.filter((l) => {
      if (statusFiltro !== 'todos' && l.status !== statusFiltro) return false;
      if (buscaNome && !l.nome.toLowerCase().includes(buscaNome.toLowerCase())) return false;
      if (buscaTelefone && !l.whatsapp.includes(buscaTelefone.replace(/\D/g, ''))) return false;
      return true;
    });
  }, [lembretes, statusFiltro, buscaNome, buscaTelefone]);

  const porData = useMemo(() => {
    const map: Record<string, Record<string, LembreteRow[]>> = {};
    lembretesFiltrados.forEach((l) => {
      const date = getLembreteDate(l);
      const slot = getSlot(l.hora_envio);
      if (!map[date]) map[date] = {};
      if (!map[date][slot]) map[date][slot] = [];
      map[date][slot].push(l);
    });
    return map;
  }, [lembretesFiltrados]);

  const filtroAtivo = statusFiltro !== 'todos' || !!buscaNome || !!buscaTelefone;

  function limparFiltros() {
    setStatusFiltro('todos');
    setBuscaNome('');
    setBuscaTelefone('');
  }

  function navigate(direction: 1 | -1) {
    if (mode === 'dia') setCurrentDate(direction === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1));
    else if (mode === 'semana') setCurrentDate(direction === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(direction === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  }

  function getPeriodLabel() {
    if (mode === 'dia') return format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    if (mode === 'semana') {
      const ws = startOfWeek(currentDate, { locale: ptBR });
      const we = endOfWeek(currentDate, { locale: ptBR });
      if (ws.getMonth() === we.getMonth()) return format(ws, "d") + ' – ' + format(we, "d 'de' MMMM yyyy", { locale: ptBR });
      return format(ws, "d MMM", { locale: ptBR }) + ' – ' + format(we, "d MMM yyyy", { locale: ptBR });
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  }

  const totalDia = useMemo(() => {
    if (mode !== 'dia') return 0;
    const key = format(currentDate, 'yyyy-MM-dd');
    return Object.values(porData[key] ?? {}).flat().length;
  }, [mode, currentDate, porData]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Page title */}
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Agenda</h1>
            <p className="text-sm text-muted-foreground">Visualize seus lembretes no calendário</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none border-r" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-base font-semibold capitalize">
              {getPeriodLabel()}
            </h2>
            {mode === 'dia' && totalDia > 0 && (
              <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                {totalDia} lembrete{totalDia !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center border rounded-lg overflow-hidden">
            {viewOptions.map((v) => (
              <button
                key={v}
                onClick={() => setMode(v)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors capitalize border-r last:border-r-0',
                  mode === v
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                )}
              >
                {v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          {/* Search inputs */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nome..."
                className="pl-9 pr-9"
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
              />
              {buscaNome && (
                <button
                  onClick={() => setBuscaNome('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative flex-1 sm:max-w-[220px]">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Filtrar por telefone..."
                className="pl-9 pr-9"
                value={buscaTelefone}
                onChange={(e) => setBuscaTelefone(e.target.value.replace(/\D/g, ''))}
              />
              {buscaTelefone && (
                <button
                  onClick={() => setBuscaTelefone('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFiltro(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                  statusFiltro === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted text-foreground'
                )}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>

          {/* Active filter indicator */}
          {filtroAtivo && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Exibindo <strong className="text-foreground">{lembretesFiltrados.length}</strong> lembrete{lembretesFiltrados.length !== 1 ? 's' : ''}
                {statusFiltro !== 'todos' && <> • Filtro: <strong className="text-foreground">{STATUS_CONFIG[statusFiltro as ReminderStatus]?.label}</strong></>}
                {buscaNome && <> • "<strong className="text-foreground">{buscaNome}</strong>"</>}
                {buscaTelefone && <> • 📱 <strong className="text-foreground">{buscaTelefone}</strong></>}
              </span>
              <button
                onClick={limparFiltros}
                className="ml-auto text-primary hover:underline font-medium"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* Views */}
        {mode === 'dia' && (
          <AgendaDayView date={currentDate} porData={porData} onSelect={setSelectedLembrete} />
        )}
        {mode === 'semana' && (
          <AgendaWeekView date={currentDate} porData={porData} onSelect={setSelectedLembrete} />
        )}
        {mode === 'mes' && (
          <AgendaMonthView
            date={currentDate}
            porData={porData}
            onSelect={setSelectedLembrete}
            onDayClick={(day) => { setCurrentDate(day); setMode('dia'); }}
          />
        )}
      </div>

      <ReminderDetailModal
        reminder={selectedLembrete ? lembreteToReminder(selectedLembrete) : null}
        open={!!selectedLembrete}
        onClose={() => setSelectedLembrete(null)}
      />
    </Layout>
  );
}
