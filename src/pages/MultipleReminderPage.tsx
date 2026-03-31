import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateLembrete, useCategorias, useAllLembretes, LembreteRow } from '@/hooks/useLembretes';
import { useTurmas } from '@/hooks/useTurmas';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Upload, X, FileText, Image, Music, FolderOpen,
  Loader2, MessageSquare, CalendarDays, Paperclip, Users, Search,
  CheckSquare, Square, ArrowLeft, GraduationCap
} from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';
import EmojiPicker from '@/components/EmojiPicker';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, addMonths, addYears, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PAISES } from '@/lib/whatsapp-utils';
import { formatarExibicao } from '@/lib/whatsapp-utils';

// ===== Types =====
interface StorageFile {
  name: string;
  url: string;
  type: 'image' | 'audio' | 'pdf';
}

interface ContactGroup {
  nome: string;
  whatsapp: string;
}

// ===== Constants =====
const HORARIOS_FIXOS = ['07:07', '10:10', '13:13', '17:17', '20:20', '22:22'];

// ===== Helpers =====
function substituirVariaveis(texto: string, params: { nome?: string; dataContato?: string; horaEnvio?: string }): string {
  let result = texto;
  const agora = new Date();
  const spOptions = { timeZone: 'America/Sao_Paulo' as const };
  const formatarDataSP = (date: Date) =>
    new Intl.DateTimeFormat('pt-BR', { ...spOptions, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);

  if (params.nome?.trim()) result = result.replace(/\[NOME\]/gi, params.nome.trim());
  result = result.replace(/\[HOJE\]/gi, formatarDataSP(agora));
  const amanha = new Date(agora); amanha.setDate(amanha.getDate() + 1);
  result = result.replace(/\[AMANHA\]/gi, formatarDataSP(amanha));
  result = result.replace(/\[AMANHÃ\]/gi, formatarDataSP(amanha));
  if (params.dataContato) {
    const dc = new Date(params.dataContato + 'T12:00:00');
    result = result.replace(/\[DATA\]/gi, formatarDataSP(dc));
    const diaSemana = dc.toLocaleDateString('pt-BR', { ...spOptions, weekday: 'long' });
    result = result.replace(/\[DIA\]/gi, diaSemana);
  }
  if (params.horaEnvio) result = result.replace(/\[HORA\]/gi, params.horaEnvio);
  return result;
}

function calcularRepeticoes(tipo: string, dataInicio: string, dataFim: string): number {
  if (!dataFim || !dataInicio) return 0;
  const inicio = new Date(dataInicio + 'T00:00:00');
  const fim = new Date(dataFim + 'T00:00:00');
  if (fim <= inicio) return 0;
  let count = 0;
  let current = new Date(inicio);
  while (current <= fim) {
    count++;
    switch (tipo) {
      case 'diario': current = addDays(current, 1); break;
      case 'semanal': current = addDays(current, 7); break;
      case 'quinzenal': current = addDays(current, 15); break;
      case 'mensal': current = addMonths(current, 1); break;
      case 'anual': current = addYears(current, 1); break;
      default: current = addMonths(current, 1);
    }
  }
  return Math.max(0, count - 1);
}

function gerarDatasPreview(tipo: string, dataInicio: string, dataFim: string): Date[] {
  if (!dataFim || !dataInicio) return [];
  const inicio = new Date(dataInicio + 'T00:00:00');
  const fim = new Date(dataFim + 'T00:00:00');
  if (fim <= inicio) return [];
  const datas: Date[] = [new Date(inicio)];
  let current = new Date(inicio);
  while (true) {
    switch (tipo) {
      case 'diario': current = addDays(current, 1); break;
      case 'semanal': current = addDays(current, 7); break;
      case 'quinzenal': current = addDays(current, 15); break;
      case 'mensal': current = addMonths(current, 1); break;
      case 'anual': current = addYears(current, 1); break;
      default: current = addMonths(current, 1);
    }
    if (current > fim) break;
    datas.push(new Date(current));
  }
  return datas;
}

function calcularDataRecorrencia(base: Date, tipo: string, i: number): string {
  let d: Date;
  switch (tipo) {
    case 'diario': d = addDays(base, i); break;
    case 'semanal': d = addDays(base, i * 7); break;
    case 'quinzenal': d = addDays(base, i * 15); break;
    case 'mensal': d = addMonths(base, i); break;
    case 'anual': d = addYears(base, i); break;
    default: d = addMonths(base, i);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ===== Main Component =====
export default function MultipleReminderPage() {
  const navigate = useNavigate();
  const createLembrete = useCreateLembrete();
  const { data: categorias = [] } = useCategorias();
  const { data: allLembretes = [] } = useAllLembretes();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: turmasList = [] } = useTurmas();

  // ---- Turmas selection ----
  const [turmasOpen, setTurmasOpen] = useState(false);
  const [selectedTurmaIds, setSelectedTurmaIds] = useState<Set<string>>(new Set());

  const toggleTurma = (id: string) => {
    setSelectedTurmaIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const confirmTurmas = async () => {
    // Add all members from selected turmas to selecionados
    for (const turmaId of selectedTurmaIds) {
      const { data } = await supabase
        .from('lembrai_turma_membros')
        .select('nome, whatsapp')
        .eq('turma_id', turmaId);
      if (data) {
        setSelecionados(prev => {
          const next = new Set(prev);
          data.forEach(m => next.add(m.whatsapp));
          return next;
        });
        // Also ensure contacts map has these
      }
    }
    setTurmasOpen(false);
    setSelectedTurmaIds(new Set());
    toast.success('Membros das turmas adicionados!');
  };

  // ---- Contact selection ----
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // Build unique contacts from allLembretes
  const contacts = useMemo<ContactGroup[]>(() => {
    const map = new Map<string, string>();
    allLembretes.forEach(r => {
      if (!map.has(r.whatsapp)) map.set(r.whatsapp, r.nome);
      else if (r.status === 'contato') map.set(r.whatsapp, r.nome);
    });
    const all = Array.from(map.entries()).map(([whatsapp, nome]) => ({ nome, whatsapp })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    if (!contactSearch) return all;
    const q = contactSearch.toLowerCase();
    return all.filter(c => c.nome.toLowerCase().includes(q) || c.whatsapp.includes(q));
  }, [allLembretes, contactSearch]);

  const selectedContacts = useMemo(
    () => Array.from(selecionados).map(wa => allLembretes.find(r => r.whatsapp === wa)).filter(Boolean).map(r => ({ nome: r!.nome, whatsapp: r!.whatsapp })),
    [selecionados, allLembretes]
  );

  const toggleContato = (whatsapp: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(whatsapp) ? next.delete(whatsapp) : next.add(whatsapp);
      return next;
    });
  };

  const selecionarTodos = () => {
    setSelecionados(new Set(contacts.map(c => c.whatsapp)));
  };

  const limparSelecao = () => {
    setSelecionados(new Set());
  };

  // ---- Form state ----
  const [categoriaId, setCategoriaId] = useState('');
  const [dataContato, setDataContato] = useState(new Date().toISOString().split('T')[0]);
  const [horaEnvio, setHoraEnvio] = useState('10:10');
  const [mensagem, setMensagem] = useState('');
  const [recorrente, setRecorrente] = useState(false);
  const [recorrenciaTipo, setRecorrenciaTipo] = useState<string>('mensal');
  const [recorrenciaDataFim, setRecorrenciaDataFim] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // File upload state
  const [anexoImagem, setAnexoImagem] = useState<File | null>(null);
  const [anexoAudio, setAnexoAudio] = useState<File | null>(null);
  const [anexoPdf, setAnexoPdf] = useState<File | null>(null);
  const [existingImagem, setExistingImagem] = useState<string | null>(null);
  const [existingAudio, setExistingAudio] = useState<string | null>(null);
  const [existingPdf, setExistingPdf] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Media library
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState<StorageFile[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryTab, setLibraryTab] = useState<'image' | 'audio' | 'pdf'>('image');

  // New category dialog
  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCatNome, setNewCatNome] = useState('');
  const [newCatIcone, setNewCatIcone] = useState('📋');
  const [newCatCor, setNewCatCor] = useState('#7C3AED');
  const [savingCat, setSavingCat] = useState(false);

  // Progress state
  const [criando, setCriando] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  // ---- Recurrence preview ----
  const repeticoes = recorrente && recorrenciaDataFim ? calcularRepeticoes(recorrenciaTipo, dataContato, recorrenciaDataFim) : 0;
  const datasPreview = recorrente && recorrenciaDataFim ? gerarDatasPreview(recorrenciaTipo, dataContato, recorrenciaDataFim) : [];

  // ---- Auto-resize textarea ----
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(200, textareaRef.current.scrollHeight) + 'px';
    }
  }, [mensagem]);

  // ---- Helpers ----
  const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const AUDIO_EXTS = ['mp3', 'ogg', 'wav', 'webm', 'opus'];
  const PDF_EXTS = ['pdf'];

  const getFileType = (name: string): StorageFile['type'] | null => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (IMAGE_EXTS.includes(ext)) return 'image';
    if (AUDIO_EXTS.includes(ext)) return 'audio';
    if (PDF_EXTS.includes(ext)) return 'pdf';
    return null;
  };

  const loadLibrary = useCallback(async () => {
    if (!user) return;
    setLibraryLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('lembrai_media')
        .list(user.id, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      const files: StorageFile[] = (data || [])
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => {
          const type = getFileType(f.name);
          if (!type) return null;
          const { data: urlData } = supabase.storage.from('lembrai_media').getPublicUrl(`${user.id}/${f.name}`);
          return { name: f.name, url: urlData.publicUrl, type };
        })
        .filter(Boolean) as StorageFile[];
      setLibraryFiles(files);
    } catch {
      toast.error('Erro ao carregar biblioteca de mídia');
    } finally {
      setLibraryLoading(false);
    }
  }, [user]);

  const selectFromLibrary = (file: StorageFile) => {
    if (file.type === 'image') { setAnexoImagem(null); setExistingImagem(file.url); }
    else if (file.type === 'audio') { setAnexoAudio(null); setExistingAudio(file.url); }
    else { setAnexoPdf(null); setExistingPdf(file.url); }
    toast.success('Arquivo selecionado!');
    setShowLibrary(false);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('lembrai_media').upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
    if (error) { toast.error(`Erro no upload: ${error.message}`); return null; }
    const { data: urlData } = supabase.storage.from('lembrai_media').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 10) { toast.error(`${file.name} excede 10MB`); continue; }
      if (file.type.startsWith('image/')) { setAnexoImagem(file); setExistingImagem(null); }
      else if (file.type.startsWith('audio/')) { setAnexoAudio(file); setExistingAudio(null); }
      else if (file.type === 'application/pdf') { setAnexoPdf(file); setExistingPdf(null); }
      else { toast.error(`Tipo não suportado: ${file.name}`); }
    }
    e.target.value = '';
  };

  // ---- Submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selecionados.size === 0) { toast.error('Selecione ao menos 1 contato.'); return; }
    if (!mensagem || mensagem.length < 10) { toast.error('A mensagem deve ter no mínimo 10 caracteres.'); return; }

    try {
      setCriando(true);
      const total = selecionados.size;
      setProgressTotal(total);
      setProgress(0);

      // Upload attachments once (shared)
      let anexo_imagem_url: string | null = existingImagem;
      let anexo_audio_url: string | null = existingAudio;
      let anexo_pdf_url: string | null = existingPdf;
      if (anexoImagem) anexo_imagem_url = await uploadFile(anexoImagem);
      if (anexoAudio) anexo_audio_url = await uploadFile(anexoAudio);
      if (anexoPdf) anexo_pdf_url = await uploadFile(anexoPdf);

      const baseDate = new Date(dataContato + 'T00:00:00');

      let contatoIdx = 0;
      for (const contato of selectedContacts) {
        const msgFinal = substituirVariaveis(mensagem, { nome: contato.nome, dataContato, horaEnvio });

        const payload = {
          nome: contato.nome,
          whatsapp: contato.whatsapp,
          data_contato: dataContato,
          intervalo_dias: 0,
          data_envio_especifica: null,
          hora_envio: horaEnvio,
          categoria_id: categoriaId || null,
          mensagem: msgFinal,
          recorrente,
          recorrencia_tipo: recorrente ? recorrenciaTipo as any : null,
          recorrencia_repeticoes: recorrente ? repeticoes : null,
          observacoes: observacoes || null,
          anexo_imagem_url,
          anexo_audio_url,
          anexo_pdf_url,
        };

        if (recorrente && repeticoes > 0) {
          // Create first
          const first = await createLembrete.mutateAsync({
            ...payload,
            data_contato: calcularDataRecorrencia(baseDate, recorrenciaTipo, 0),
          });
          // Create remaining
          for (let i = 1; i <= repeticoes; i++) {
            await createLembrete.mutateAsync({
              ...payload,
              data_contato: calcularDataRecorrencia(baseDate, recorrenciaTipo, i),
              recorrencia_pai: first.id,
            });
          }
        } else {
          await createLembrete.mutateAsync(payload);
        }

        contatoIdx++;
        setProgress(contatoIdx);
      }

      const totalLembretes = recorrente && repeticoes > 0
        ? selecionados.size * (repeticoes + 1)
        : selecionados.size;

      toast.success(`${totalLembretes} lembretes criados para ${selecionados.size} contatos!`);
      navigate('/ativos');
    } catch {
      // handled by mutation
    } finally {
      setCriando(false);
    }
  };

  const anexos = [
    { file: anexoImagem, url: existingImagem, label: 'Imagem', icon: Image, clear: () => { setAnexoImagem(null); setExistingImagem(null); } },
    { file: anexoAudio, url: existingAudio, label: 'Áudio', icon: Music, clear: () => { setAnexoAudio(null); setExistingAudio(null); } },
    { file: anexoPdf, url: existingPdf, label: 'PDF', icon: FileText, clear: () => { setAnexoPdf(null); setExistingPdf(null); } },
  ].filter(a => a.file || a.url);

  const totalLembretesPreview = recorrente && repeticoes > 0
    ? selecionados.size * (repeticoes + 1)
    : selecionados.size;

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ativos')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Múltiplo Envio</h1>
            <p className="text-muted-foreground text-sm">Crie lembretes para vários contatos de uma vez</p>
          </div>
        </div>

        {/* Contact selector */}
        <div className="rounded-xl bg-card border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-base">Destinatários *</Label>
            {selecionados.size > 0 && (
              <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
                {selecionados.size} contato{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {selecionados.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedContacts.slice(0, 5).map(c => (
                <div key={c.whatsapp} className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium">
                  <span>{c.nome.split(' ')[0]}</span>
                  <button type="button" onClick={() => toggleContato(c.whatsapp)} className="hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {selectedContacts.length > 5 && (
                <div className="flex items-center bg-muted rounded-full px-3 py-1 text-sm text-muted-foreground">
                  +{selectedContacts.length - 5} mais
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 border-2 font-semibold gap-2"
              onClick={() => setContactsOpen(true)}
            >
              <Users className="h-4 w-4" />
              {selecionados.size === 0 ? 'Selecionar Contatos' : 'Alterar Seleção'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 border-2 font-semibold gap-2"
              onClick={() => setTurmasOpen(true)}
            >
              <GraduationCap className="h-4 w-4" /> Turmas
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1">
              <TabsTrigger value="dados" className="flex flex-col gap-1 py-2 text-xs sm:text-sm">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="leading-tight text-center">Dados e<br className="sm:hidden" /> Mensagem</span>
              </TabsTrigger>
              <TabsTrigger value="agendamento" className="flex flex-col gap-1 py-2 text-xs sm:text-sm">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>Agendamento</span>
              </TabsTrigger>
              <TabsTrigger value="midia" className="flex flex-col gap-1 py-2 text-xs sm:text-sm">
                <Paperclip className="h-4 w-4 shrink-0" />
                <span>Mídia</span>
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: Dados e Mensagem */}
            <TabsContent value="dados" className="space-y-5 mt-4">
              <div className="rounded-xl bg-card border p-5 space-y-5">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <div className="flex gap-2">
                    <Select value={categoriaId} onValueChange={(id) => {
                      setCategoriaId(id);
                      const cat = categorias.find((c: any) => c.id === id);
                      if (cat?.template_mensagem && !mensagem) setMensagem(cat.template_mensagem);
                    }}>
                      <SelectTrigger className="h-[52px] border-2 flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {categorias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="h-[52px] w-[52px] border-2 shrink-0" onClick={() => setShowNewCatDialog(true)}>
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Textarea
                    ref={textareaRef}
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value.slice(0, 1000))}
                    placeholder="Olá [NOME], este é um lembrete para você..."
                    className="min-h-[200px] border-2 text-base resize-none overflow-hidden"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{mensagem.length}/1000 caracteres</span>
                    <span>Variáveis: [NOME] [HOJE] [AMANHÃ] [DATA] [DIA] [HORA]</span>
                  </div>
                  {/\[(NOME|HOJE|AMANHA|AMANHÃ|DATA|DIA|HORA)\]/i.test(mensagem) && (
                    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-1">
                      <p className="text-xs font-medium text-primary">📋 Preview (1º contato selecionado):</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {substituirVariaveis(mensagem, {
                          nome: selectedContacts[0]?.nome || '______',
                          dataContato,
                          horaEnvio
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: Agendamento */}
            <TabsContent value="agendamento" className="space-y-5 mt-4">
              {/* Recorrência */}
              <div className="rounded-xl bg-card border p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Checkbox id="recorrente" checked={recorrente} onCheckedChange={(c) => setRecorrente(!!c)} />
                  <Label htmlFor="recorrente" className="text-base font-semibold cursor-pointer">Lembrete Recorrente</Label>
                </div>
                {recorrente && (
                  <div className="pl-7 space-y-4">
                    <div className="space-y-2">
                      <Label>Repetir a cada</Label>
                      <Select value={recorrenciaTipo} onValueChange={setRecorrenciaTipo}>
                        <SelectTrigger className="h-10 w-40 border-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diario">Diário</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="quinzenal">Quinzenal</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                          <SelectItem value="anual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data de fim da recorrência</Label>
                      <Input
                        type="date"
                        value={recorrenciaDataFim}
                        min={dataContato}
                        onChange={(e) => setRecorrenciaDataFim(e.target.value)}
                        className="h-10 w-48 border-2"
                      />
                    </div>
                    {recorrenciaDataFim && datasPreview.length > 0 && (
                      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                        <p className="text-xs font-semibold text-primary">
                          📅 {datasPreview.length} lembrete{datasPreview.length !== 1 ? 's' : ''} por contato:
                        </p>
                        <p className="text-xs text-muted-foreground flex flex-wrap gap-1">
                          {datasPreview.slice(0, 12).map((d, i) => (
                            <span key={i} className="bg-primary/10 text-primary rounded px-1.5 py-0.5">
                              {format(d, "dd/MM/yy", { locale: ptBR })}
                            </span>
                          ))}
                          {datasPreview.length > 12 && (
                            <span className="text-muted-foreground">... e mais {datasPreview.length - 12}</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Data e Hora */}
              <div className="rounded-xl bg-card border p-5 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="dataContato">Data de Envio *</Label>
                  <Input id="dataContato" type="date" value={dataContato} onChange={(e) => setDataContato(e.target.value)} className="h-[52px] border-2" />
                </div>
                <div className="space-y-2">
                  <Label>Hora do envio</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {HORARIOS_FIXOS.map((time) => (
                      <Button key={time} type="button" variant={horaEnvio === time ? 'default' : 'outline'} className="h-12 text-base font-semibold border-2" onClick={() => setHoraEnvio(time)}>
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="rounded-xl bg-card border p-5 space-y-3">
                <Label className="font-semibold">Observações</Label>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas internas..." className="min-h-[80px] border-2" />
              </div>
            </TabsContent>

            {/* ABA 3: Mídia */}
            <TabsContent value="midia" className="space-y-5 mt-4">
              <div className="rounded-xl bg-card border p-5 space-y-3">
                <Label className="font-semibold">Anexos (opcional)</Label>
                <input ref={fileInputRef} type="file" accept="image/*,audio/*,.pdf" multiple onChange={handleFileSelect} className="hidden" />
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    const dt = e.dataTransfer;
                    if (dt.files) handleFileSelect({ target: { files: dt.files, value: '' } } as any);
                  }}
                >
                  <Upload className="h-7 w-7 mx-auto mb-2" />
                  <p className="text-base">📤 Arraste arquivos ou clique aqui</p>
                  <p className="text-sm mt-1">Imagem, Áudio ou PDF (max 10MB)</p>
                </div>
                <Button type="button" variant="outline" className="w-full h-12 border-2 font-semibold" onClick={() => { setShowLibrary(true); loadLibrary(); }}>
                  <FolderOpen className="h-5 w-5 mr-2" /> Selecionar da Biblioteca
                </Button>
                {anexos.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {anexos.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
                        <a.icon className="h-4 w-4 text-primary" />
                        <span className="truncate max-w-[200px]">{a.file ? a.file.name : `${a.label} existente`}</span>
                        <button type="button" onClick={a.clear} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <AudioRecorder onRecordingComplete={(file) => { setAnexoAudio(file); setExistingAudio(null); }} />
            </TabsContent>
          </Tabs>

          {/* Progress bar during creation */}
          {criando && (
            <div className="rounded-xl bg-card border p-5 space-y-3">
              <p className="text-sm font-semibold">Criando lembretes... {progress} / {progressTotal}</p>
              <Progress value={(progress / progressTotal) * 100} className="h-3" />
            </div>
          )}

          {/* Summary + Submit */}
          <div className="rounded-xl bg-card border p-5 space-y-3">
            {selecionados.size > 0 && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>👥 <strong>{selecionados.size}</strong> contato{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}</p>
                {recorrente && repeticoes > 0 && (
                  <p>🔄 <strong>{datasPreview.length}</strong> lembrete{datasPreview.length !== 1 ? 's' : ''} por contato (recorrência)</p>
                )}
                <p className="text-primary font-semibold">
                  ✅ Total: <strong>{totalLembretesPreview}</strong> lembrete{totalLembretesPreview !== 1 ? 's' : ''} serão criados
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/ativos')} className="h-12 px-6">Cancelar</Button>
              <Button
                type="submit"
                className="h-12 flex-1 font-semibold"
                disabled={criando || selecionados.size === 0 || !mensagem}
              >
                {criando
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Criando...</>
                  : <>
                      <Users className="h-4 w-4 mr-2" />
                      Criar {totalLembretesPreview > 0 ? totalLembretesPreview : ''} Lembrete{totalLembretesPreview !== 1 ? 's' : ''}
                    </>
                }
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* ===== Popup de seleção de contatos ===== */}
      <Dialog open={contactsOpen} onOpenChange={setContactsOpen}>
        <DialogContent className="sm:max-w-lg h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Selecionar Contatos
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="pl-10 border-2"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5 flex-1" onClick={selecionarTodos}>
              <CheckSquare className="h-4 w-4" /> Selecionar todos
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 flex-1" onClick={limparSelecao}>
              <Square className="h-4 w-4" /> Limpar
            </Button>
          </div>

          {selecionados.size > 0 && (
            <p className="text-xs text-center text-muted-foreground font-medium">
              {selecionados.size} contato{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
            </p>
          )}

          <ScrollArea className="flex-1 min-h-0 -mx-1 px-1">
            <div className="space-y-1 py-1">
              {contacts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhum contato encontrado.</p>
              ) : (
                contacts.map(contact => {
                  const isSelected = selecionados.has(contact.whatsapp);
                  return (
                    <button
                      key={contact.whatsapp}
                      type="button"
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-transparent bg-muted/40 hover:bg-muted/80'
                      }`}
                      onClick={() => toggleContato(contact.whatsapp)}
                    >
                      <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isSelected ? '✓' : contact.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{contact.nome}</p>
                        <p className="text-xs text-muted-foreground">{formatarExibicao(contact.whatsapp)}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setContactSearch(''); setContactsOpen(false); }}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => { setContactSearch(''); setContactsOpen(false); }} disabled={selecionados.size === 0}>
              Confirmar {selecionados.size > 0 ? `(${selecionados.size})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Nova Categoria ===== */}
      <Dialog open={showNewCatDialog} onOpenChange={setShowNewCatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={newCatNome} onChange={e => setNewCatNome(e.target.value)} placeholder="Ex: MANUTENÇÃO" className="h-12 border-2" />
            </div>
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label>Ícone</Label>
                <div className="flex gap-2">
                  <Input value={newCatIcone} onChange={e => setNewCatIcone(e.target.value)} placeholder="📋" className="h-12 border-2 text-center text-xl flex-1" maxLength={4} />
                  <EmojiPicker value={newCatIcone} onChange={setNewCatIcone} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <Input type="color" value={newCatCor} onChange={e => setNewCatCor(e.target.value)} className="h-12 w-16 border-2 cursor-pointer" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCatDialog(false)}>Cancelar</Button>
            <Button disabled={savingCat || !newCatNome.trim()} onClick={async () => {
              if (!user) return;
              setSavingCat(true);
              const { data, error } = await supabase.from('lembrai_categorias').insert({ usuario_id: user.id, nome: newCatNome.trim().toUpperCase(), icone: newCatIcone, cor: newCatCor }).select().single();
              setSavingCat(false);
              if (error) { toast.error('Erro ao criar categoria: ' + error.message); }
              else { toast.success('Categoria criada!'); queryClient.invalidateQueries({ queryKey: ['categorias'] }); setCategoriaId(data.id); setNewCatNome(''); setNewCatIcone('📋'); setNewCatCor('#7C3AED'); setShowNewCatDialog(false); }
            }}>
              {savingCat ? 'Salvando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Media Library ===== */}
      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader><DialogTitle>📁 Biblioteca de Mídia</DialogTitle></DialogHeader>
          <Tabs value={libraryTab} onValueChange={(v) => setLibraryTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="image">🖼️ Imagens</TabsTrigger>
              <TabsTrigger value="audio">🎵 Áudios</TabsTrigger>
              <TabsTrigger value="pdf">📄 PDFs</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-[350px] mt-3">
              {libraryLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : libraryFiles.filter(f => f.type === libraryTab).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Nenhum arquivo nesta categoria.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-1">
                  {libraryFiles.filter(f => f.type === libraryTab).map((file, i) => (
                    <button key={i} type="button" onClick={() => selectFromLibrary(file)} className="border-2 rounded-lg overflow-hidden hover:border-primary transition-colors text-left p-2">
                      {file.type === 'image' ? (
                        <img src={file.url} alt={file.name} className="w-full h-24 object-cover rounded" />
                      ) : (
                        <div className="flex items-center gap-2 p-2">
                          {file.type === 'audio' ? <Music className="h-5 w-5 text-primary shrink-0" /> : <FileText className="h-5 w-5 text-primary shrink-0" />}
                          <span className="text-xs truncate">{file.name}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Turmas selection dialog */}
      <Dialog open={turmasOpen} onOpenChange={setTurmasOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Selecionar Turmas
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-2">
              {turmasList.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Nenhuma turma cadastrada. Crie turmas na página de Contatos.</p>
              ) : (
                turmasList.map(t => (
                  <label key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer border">
                    <Checkbox checked={selectedTurmaIds.has(t.id)} onCheckedChange={() => toggleTurma(t.id)} />
                    <div className="h-6 w-6 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t.nome}</p>
                      <p className="text-xs text-muted-foreground">{t.membros_count || 0} membro{(t.membros_count || 0) !== 1 ? 's' : ''}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Badge variant="secondary">{selectedTurmaIds.size} turma{selectedTurmaIds.size !== 1 ? 's' : ''}</Badge>
            <Button onClick={confirmTurmas} disabled={selectedTurmaIds.size === 0}>Adicionar Membros</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
