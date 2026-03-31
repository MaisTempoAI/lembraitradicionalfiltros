import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import StatusBadge from '@/components/StatusBadge';
import CategoryBadge from '@/components/CategoryBadge';
import ReminderDetailModal from '@/components/ReminderDetailModal';
import { useAllLembretes, useLembretes, LembreteRow } from '@/hooks/useLembretes';
import { Clock, Send, AlertTriangle, Archive, Timer, Eye, ChevronLeft, ChevronRight, ChevronDown, CalendarIcon, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, subMonths, isWithinInterval, parseISO, addHours, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { parsePdfVendas } from '@/lib/pdf-parser';
import { toast } from 'sonner';
import { useRef } from 'react';

const chartColors = ['hsl(265, 60%, 55%)', 'hsl(152, 70%, 45%)', 'hsl(54, 90%, 60%)', 'hsl(15, 85%, 58%)', 'hsl(265, 45%, 65%)'];

type FilterMode = 'mes' | 'ano' | 'personalizado';

export default function Dashboard() {
  const [selectedReminder, setSelectedReminder] = useState<LembreteRow | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterMode, setFilterMode] = useState<FilterMode>('mes');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [importingPdf, setImportingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Selecione um arquivo PDF.');
      return;
    }
    setImportingPdf(true);
    try {
      const clientes = await parsePdfVendas(file);
      if (clientes.length === 0) {
        toast.error('Nenhum cliente encontrado no PDF.');
        return;
      }
      toast.success(`${clientes.length} clientes encontrados!`);
      navigate('/importar-pdf', { state: { clientes } });
    } catch (err) {
      toast.error('Erro ao processar PDF.');
      console.error(err);
    } finally {
      setImportingPdf(false);
      e.target.value = '';
    }
  };

  const { data: allLembretes = [], isLoading: allLoading } = useAllLembretes();
  const { data: aguardando = [], isLoading: aguardandoLoading } = useLembretes(['aguardando']);

  const { periodStart, periodEnd } = useMemo(() => {
    if (filterMode === 'mes') {
      return { periodStart: startOfMonth(currentDate), periodEnd: endOfMonth(currentDate) };
    } else if (filterMode === 'ano') {
      return { periodStart: startOfYear(currentDate), periodEnd: endOfYear(currentDate) };
    } else {
      return {
        periodStart: dateFrom || startOfMonth(currentDate),
        periodEnd: dateTo || endOfMonth(currentDate),
      };
    }
  }, [filterMode, currentDate, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const isInPeriod = (dateStr: string | null) => {
      if (!dateStr) return false;
      try {
        const d = parseISO(dateStr);
        return isWithinInterval(d, { start: periodStart, end: periodEnd });
      } catch { return false; }
    };

    const total_aguardando = allLembretes.filter(l => l.status === 'aguardando').length;
    const total_enviados = allLembretes.filter(l => l.status === 'enviado' && isInPeriod(l.data_envio_realizado || l.updated_at)).length;
    const total_erros = allLembretes.filter(l => l.status === 'erro' && isInPeriod(l.created_at)).length;
    const total_arquivados = allLembretes.filter(l => l.status === 'arquivado').length;

    const now = new Date();
    const in24h = addHours(now, 24);
    const proximos_24h = allLembretes.filter(l => {
      if (l.status !== 'aguardando') return false;
      const envioDate = l.data_envio_especifica || l.data_contato;
      if (!envioDate) return false;
      try {
        const d = parseISO(envioDate);
        return !isBefore(d, now) && !isAfter(d, in24h);
      } catch { return false; }
    }).length;

    return { total_aguardando, total_enviados, total_erros, total_arquivados, proximos_24h };
  }, [allLembretes, periodStart, periodEnd]);

  const periodLabel = useMemo(() => {
    if (filterMode === 'mes') {
      return format(currentDate, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
    } else if (filterMode === 'ano') {
      return format(currentDate, "yyyy");
    } else {
      if (dateFrom && dateTo) return `${format(dateFrom, "dd/MM/yy")} - ${format(dateTo, "dd/MM/yy")}`;
      return 'Personalizado';
    }
  }, [filterMode, currentDate, dateFrom, dateTo]);

  const periodDescription = filterMode === 'mes' ? 'Este mês' : filterMode === 'ano' ? 'Este ano' : 'Período';

  const handlePrev = () => {
    if (filterMode === 'mes') setCurrentDate(prev => subMonths(prev, 1));
    else if (filterMode === 'ano') setCurrentDate(prev => new Date(prev.getFullYear() - 1, prev.getMonth()));
  };
  const handleNext = () => {
    if (filterMode === 'mes') setCurrentDate(prev => addMonths(prev, 1));
    else if (filterMode === 'ano') setCurrentDate(prev => new Date(prev.getFullYear() + 1, prev.getMonth()));
  };

  const chartData = useMemo(() => {
    const filtered = allLembretes.filter(l => {
      if (l.status !== 'enviado') return false;
      const dateField = l.data_envio_realizado || l.updated_at;
      if (!dateField) return false;
      try {
        const d = parseISO(dateField);
        return isWithinInterval(d, { start: periodStart, end: periodEnd });
      } catch { return false; }
    });
    if (!filtered.length) return [];
    const cats: Record<string, number> = {};
    filtered.forEach(r => {
      const catName = r.categoria?.nome || 'Sem categoria';
      cats[catName] = (cats[catName] || 0) + 1;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [allLembretes, periodStart, periodEnd]);

  const upcomingReminders = aguardando.slice(0, 5);
  const isLoading = allLoading || aguardandoLoading;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <div>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handlePdfImport}
              />
              <Button
                size="lg"
                className="gap-2"
                onClick={() => pdfInputRef.current?.click()}
                disabled={importingPdf}
              >
                {importingPdf ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                ) : (
                  <><FileUp className="h-5 w-5" /> Importar PDF</>
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filterMode !== 'personalizado' && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-center gap-2">
                  {periodLabel}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 space-y-3" align="center">
                <div className="flex gap-1">
                  {(['mes', 'ano', 'personalizado'] as FilterMode[]).map(mode => (
                    <Button
                      key={mode}
                      variant={filterMode === mode ? 'default' : 'ghost'}
                      size="sm"
                      className="flex-1 capitalize"
                      onClick={() => {
                        setFilterMode(mode);
                        if (mode !== 'personalizado') setPopoverOpen(false);
                      }}
                    >
                      {mode === 'mes' ? 'Mês' : mode === 'ano' ? 'Ano' : 'Personalizado'}
                    </Button>
                  ))}
                </div>
                {filterMode === 'personalizado' && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">De</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("w-full justify-start text-left", !dateFrom && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Até</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("w-full justify-start text-left", !dateTo && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {filterMode !== 'personalizado' && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <StatsCard title="Aguardando" value={stats.total_aguardando} icon={<Clock className="h-5 w-5" />} href="/ativos?status=aguardando" color="#9C99B8" />
              <StatsCard title="Enviados" value={stats.total_enviados} icon={<Send className="h-5 w-5" />} description={periodDescription} href="/finalizados?status=enviado" color="#2E9B6E" />
              <StatsCard title="Próximos 24h" value={stats.proximos_24h} icon={<Timer className="h-5 w-5" />} href="/ativos?status=aguardando" color="#FFBB00" />
              <StatsCard title="Erros" value={stats.total_erros} icon={<AlertTriangle className="h-5 w-5" />} description={periodDescription} href="/ativos?status=erro" color="#E0603E" />
              <StatsCard title="Arquivados" value={stats.total_arquivados} icon={<Archive className="h-5 w-5" />} description="Total" href="/arquivados" color="#474150" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-card border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Envios por Categoria</h2>
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : chartData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum dado ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 13, fontWeight: 600 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl bg-card border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Próximos Lembretes</h2>
              <Link to="/ativos" className="text-sm text-primary font-medium hover:underline">Ver todos</Link>
            </div>
            <div className="space-y-3">
              {aguardandoLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
              ) : upcomingReminders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum lembrete aguardando.</p>
              ) : (
                upcomingReminders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{r.nome}</span>
                        {r.categoria && <CategoryBadge categoria={r.categoria.nome} />}
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Envio: {r.data_envio_especifica || `${r.intervalo_dias}d após contato`} às {r.hora_envio}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedReminder(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedReminder && (
        <ReminderDetailModal
          reminder={{
            id: selectedReminder.id,
            nome: selectedReminder.nome,
            whatsapp: selectedReminder.whatsapp,
            data_contato: selectedReminder.data_contato,
            intervalo_dias: selectedReminder.intervalo_dias ?? undefined,
            data_envio_especifica: selectedReminder.data_envio_especifica ?? undefined,
            hora_envio: selectedReminder.hora_envio,
            categoria: selectedReminder.categoria?.nome || 'Sem categoria',
            mensagem: selectedReminder.mensagem,
            status: selectedReminder.status,
            recorrente: selectedReminder.recorrente,
            recorrencia_tipo: selectedReminder.recorrencia_tipo ?? undefined,
            recorrencia_repeticoes: selectedReminder.recorrencia_repeticoes ?? undefined,
            data_envio_realizado: selectedReminder.data_envio_realizado ?? undefined,
            data_arquivamento: selectedReminder.data_arquivamento ?? undefined,
            motivo_erro: selectedReminder.motivo_erro ?? undefined,
            anexo_imagem_url: selectedReminder.anexo_imagem_url ?? undefined,
            anexo_audio_url: selectedReminder.anexo_audio_url ?? undefined,
            anexo_pdf_url: selectedReminder.anexo_pdf_url ?? undefined,
            observacoes: selectedReminder.observacoes ?? undefined,
            created_at: selectedReminder.created_at,
            updated_at: selectedReminder.updated_at,
          }}
          open={!!selectedReminder}
          onClose={() => setSelectedReminder(null)}
        />
      )}
    </Layout>
  );
}
