import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useCreateLembrete, useUpdateLembrete, useCategorias, LembreteRow } from '@/hooks/useLembretes';
import { useTurmas, useTurmaById } from '@/hooks/useTurmas';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Upload, X, FileText, Image, Music, FolderOpen, Loader2, MessageSquare, CalendarDays, Paperclip, Users, GraduationCap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import AudioRecorder from '@/components/AudioRecorder';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, addMonths, addYears } from 'date-fns';
import EmojiPicker from '@/components/EmojiPicker';

interface StorageFile {
  name: string;
  url: string;
  type: 'image' | 'audio' | 'pdf';
}

interface ReminderFormProps {
  lembreteId?: string;
  initialData?: LembreteRow;
}

interface Sugestao {
  nome: string;
  whatsapp: string;
}

const HORARIOS_FIXOS = ['07:07', '10:10', '13:13', '17:17', '20:20', '22:22'];

// WhatsApp utilities imported from shared module
import { PAISES, detectarDDI, formatWhatsapp } from '@/lib/whatsapp-utils';

function horarioMaisProximo(hora: string): string {
  const [h, m] = hora.split(':').map(Number);
  const mins = h * 60 + m;
  let closest = HORARIOS_FIXOS[0];
  let minDiff = Infinity;
  for (const hf of HORARIOS_FIXOS) {
    const [hh, mm] = hf.split(':').map(Number);
    const diff = Math.abs(hh * 60 + mm - mins);
    if (diff < minDiff) { minDiff = diff; closest = hf; }
  }
  return closest;
}

function substituirVariaveis(texto: string, params: {
  nome?: string; dataContato?: string; horaEnvio?: string;
}): string {
  let result = texto;
  const agora = new Date();
  const spOptions = { timeZone: 'America/Sao_Paulo' as const };

  const formatarDataSP = (date: Date) =>
    new Intl.DateTimeFormat('pt-BR', { ...spOptions, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);

  if (params.nome?.trim()) result = result.replace(/\[NOME\]/gi, params.nome.trim());
  result = result.replace(/\[HOJE\]/gi, formatarDataSP(agora));

  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
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

function calcularRepeticoesFromFim(tipo: string, dataInicio: string, dataFim: string): number {
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

function gerarDatasPreviewForm(tipo: string, dataInicio: string, dataFim: string): Date[] {
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

export default function ReminderForm({ lembreteId, initialData }: ReminderFormProps) {
  const navigate = useNavigate();
  const createLembrete = useCreateLembrete();
  const updateLembrete = useUpdateLembrete();
  const { data: categorias = [] } = useCategorias();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isEditing = !!lembreteId;

  // State for new category dialog
  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCatNome, setNewCatNome] = useState('');
  const [newCatIcone, setNewCatIcone] = useState('📋');
  const [newCatCor, setNewCatCor] = useState('#7C3AED');
  const [savingCat, setSavingCat] = useState(false);

  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [targetType, setTargetType] = useState<'contato' | 'grupo' | 'turma'>('contato');
  const isGrupo = targetType === 'grupo';
  const [codigoPais, setCodigoPais] = useState('55');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null);

  const { data: turmasList = [] } = useTurmas();
  const { data: selectedTurmaData } = useTurmaById(selectedTurmaId);
  const [categoriaId, setCategoriaId] = useState('');
  const [dataContato, setDataContato] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing attachment URLs (edit mode)
  const [existingImagem, setExistingImagem] = useState<string | null>(null);
  const [existingAudio, setExistingAudio] = useState<string | null>(null);
  const [existingPdf, setExistingPdf] = useState<string | null>(null);

  // Autocomplete state
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const nomeRef = useRef<HTMLDivElement>(null);

  // Media library state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState<StorageFile[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryTab, setLibraryTab] = useState<'image' | 'audio' | 'pdf'>('image');

  // Contact registration prompt state
  const [showCadastroPrompt, setShowCadastroPrompt] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);

  const checkContactExists = async () => {
    if (isEditing || targetType !== 'contato' || !user) return;
    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length < 8) return;
    const fullNumber = codigoPais + digits;
    const { data } = await supabase
      .from('lembrai_lembretes')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('status', 'contato')
      .eq('whatsapp', fullNumber)
      .limit(1);
    if (!data || data.length === 0) {
      setShowCadastroPrompt(true);
    } else {
      setShowCadastroPrompt(false);
    }
  };

  const handleCadastrarContato = async () => {
    if (!user || !nome.trim()) {
      toast.error('Preencha o nome antes de cadastrar.');
      return;
    }
    const digits = whatsapp.replace(/\D/g, '');
    const fullNumber = codigoPais + digits;
    setCadastrando(true);
    try {
      const today = new Date();
      const dataHoje = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      await supabase.from('lembrai_lembretes').insert({
        usuario_id: user.id,
        nome: nome.trim(),
        whatsapp: fullNumber,
        status: 'contato' as any,
        mensagem: 'Contato cadastrado',
        data_contato: dataHoje,
        hora_envio: '10:10',
        intervalo_dias: 0,
        recorrente: false,
      });
      queryClient.invalidateQueries({ queryKey: ['lembretes'] });
      queryClient.invalidateQueries({ queryKey: ['all-lembretes'] });
      toast.success('Contato cadastrado com sucesso!');
      setShowCadastroPrompt(false);
    } catch {
      toast.error('Erro ao cadastrar contato.');
    } finally {
      setCadastrando(false);
    }
  };

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
    if (file.type === 'image') {
      setAnexoImagem(null);
      setExistingImagem(file.url);
    } else if (file.type === 'audio') {
      setAnexoAudio(null);
      setExistingAudio(file.url);
    } else {
      setAnexoPdf(null);
      setExistingPdf(file.url);
    }
    toast.success(`${file.type === 'image' ? 'Imagem' : file.type === 'audio' ? 'Áudio' : 'PDF'} selecionado!`);
    setShowLibrary(false);
  };

  // formatWhatsapp is now imported from @/lib/whatsapp-utils

  // Pre-fill fields when editing
  useEffect(() => {
    if (initialData) {
      setNome(initialData.nome);
      const isGroup = initialData.whatsapp.includes('@g.us');
      setTargetType(isGroup ? 'grupo' : 'contato');
      if (isGroup) {
        setWhatsapp(initialData.whatsapp);
      } else {
        const { codigo, resto } = detectarDDI(initialData.whatsapp);
        setCodigoPais(codigo);
        let localNumber = resto;
        // Strip duplicate country code prefix if present (e.g. 5555199936204 → strip extra 55)
        if (localNumber.startsWith(codigo) && localNumber.length > 11) {
          localNumber = localNumber.slice(codigo.length);
        }
        setWhatsapp(codigo === '55' ? formatWhatsapp(localNumber) : localNumber);
      }
      setDataContato(initialData.data_contato);
      setHoraEnvio(horarioMaisProximo(initialData.hora_envio || '10:10'));
      setMensagem(initialData.mensagem);
      setCategoriaId(initialData.categoria_id || '');
      setRecorrente(initialData.recorrente);
      if (initialData.recorrencia_tipo) setRecorrenciaTipo(initialData.recorrencia_tipo);
      // recorrenciaDataFim not stored — leave empty when editing
      setObservacoes(initialData.observacoes || '');
      setExistingImagem(initialData.anexo_imagem_url);
      setExistingAudio(initialData.anexo_audio_url);
      setExistingPdf(initialData.anexo_pdf_url);
    }
  }, [initialData]);

  // Auto-resize textarea when mensagem changes (e.g. template loaded)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(200, textareaRef.current.scrollHeight) + 'px';
    }
  }, [mensagem]);

  // Debounced search for name suggestions
  useEffect(() => {
    if (isEditing || !nome || nome.length < 2 || !user) {
      setSugestoes([]);
      setShowSugestoes(false);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('lembrai_lembretes')
        .select('nome, whatsapp')
        .eq('usuario_id', user.id)
        .ilike('nome', `%${nome}%`)
        .limit(20);

      if (data && data.length > 0) {
        const unique = Array.from(new Map(data.map(d => [d.nome, d])).values()).slice(0, 5);
        setSugestoes(unique);
        setShowSugestoes(true);
      } else {
        setSugestoes([]);
        setShowSugestoes(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [nome, user]);

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('lembrai_media')
      .upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });
    if (error) {
      toast.error(`Erro no upload: ${error.message}`);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from('lembrai_media')
      .getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Turma mode validation
    if (targetType === 'turma') {
      if (!selectedTurmaId || !selectedTurmaData?.membros?.length) {
        toast.error('Selecione uma turma com membros.');
        return;
      }
      if (!mensagem || mensagem.length < 10) {
        toast.error('A mensagem deve ter no mínimo 10 caracteres.');
        return;
      }
    } else {
      if (!nome || !whatsapp || !mensagem) {
        toast.error('Preencha todos os campos obrigatórios.');
        return;
      }
      if (mensagem.length < 10) {
        toast.error('A mensagem deve ter no mínimo 10 caracteres.');
        return;
      }
    }

    try {
      setUploading(true);
      let anexo_imagem_url: string | null = existingImagem;
      let anexo_audio_url: string | null = existingAudio;
      let anexo_pdf_url: string | null = existingPdf;

      if (anexoImagem) anexo_imagem_url = await uploadFile(anexoImagem, 'imagem');
      if (anexoAudio) anexo_audio_url = await uploadFile(anexoAudio, 'audio');
      if (anexoPdf) anexo_pdf_url = await uploadFile(anexoPdf, 'pdf');

      const calcularData = (base: Date, tipo: string, i: number): string => {
        let d: Date;
        switch (tipo) {
          case 'diario': d = addDays(base, i); break;
          case 'semanal': d = addDays(base, i * 7); break;
          case 'quinzenal': d = addDays(base, i * 15); break;
          case 'mensal': d = addMonths(base, i); break;
          case 'anual': d = addYears(base, i); break;
          default: d = addMonths(base, i);
        }
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
      };

      // === TURMA MODE: batch create for each member ===
      if (targetType === 'turma' && selectedTurmaData?.membros) {
        const membros = selectedTurmaData.membros;
        const repeticoes = recorrente && recorrenciaDataFim ? calcularRepeticoesFromFim(recorrenciaTipo, dataContato, recorrenciaDataFim) : 0;
        const baseDate = new Date(dataContato + 'T00:00:00');
        let totalCriados = 0;

        for (const membro of membros) {
          const msgFinal = substituirVariaveis(mensagem, { nome: membro.nome, dataContato, horaEnvio });
          const payload = {
            nome: membro.nome,
            whatsapp: membro.whatsapp,
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
            const first = await createLembrete.mutateAsync({ ...payload, data_contato: calcularData(baseDate, recorrenciaTipo, 0) });
            for (let i = 1; i <= repeticoes; i++) {
              await createLembrete.mutateAsync({ ...payload, data_contato: calcularData(baseDate, recorrenciaTipo, i), recorrencia_pai: first.id });
            }
            totalCriados += repeticoes + 1;
          } else {
            await createLembrete.mutateAsync(payload);
            totalCriados++;
          }
        }

        toast.success(`${totalCriados} lembretes criados para turma "${selectedTurmaData.nome}"!`);
      }
      // === NORMAL MODE ===
      else {
        let digits = whatsapp.replace(/\D/g, '');
        // Prevent double country code prefix (e.g. user typed 55... with DDI already set to 55)
        if (!isGrupo && digits.startsWith(codigoPais) && digits.length > 11) {
          digits = digits.slice(codigoPais.length);
        }
        const whatsappFinal = isGrupo ? whatsapp : codigoPais + digits;
        const payload = {
          nome,
          whatsapp: whatsappFinal,
          data_contato: dataContato,
          intervalo_dias: 0,
          data_envio_especifica: null,
          hora_envio: horaEnvio,
          categoria_id: categoriaId || null,
          mensagem: substituirVariaveis(mensagem, { nome, dataContato, horaEnvio }),
          recorrente,
          recorrencia_tipo: recorrente ? recorrenciaTipo as any : null,
          recorrencia_repeticoes: recorrente ? calcularRepeticoesFromFim(recorrenciaTipo, dataContato, recorrenciaDataFim) : null,
          observacoes: observacoes || null,
          anexo_imagem_url,
          anexo_audio_url,
          anexo_pdf_url,
        };

        if (isEditing) {
          const editPayload: any = { id: lembreteId!, ...payload };
          if (initialData?.status === 'clonado') {
            editPayload.status = 'aguardando';
          }
          await updateLembrete.mutateAsync(editPayload);
          toast.success('Lembrete atualizado com sucesso!');
        } else if (recorrente && recorrenciaDataFim) {
          const repeticoes = calcularRepeticoesFromFim(recorrenciaTipo, dataContato, recorrenciaDataFim);
          const baseDate = new Date(dataContato + 'T00:00:00');
          const first = await createLembrete.mutateAsync({ ...payload, data_contato: calcularData(baseDate, recorrenciaTipo, 0) });
          for (let i = 1; i <= repeticoes; i++) {
            await createLembrete.mutateAsync({ ...payload, data_contato: calcularData(baseDate, recorrenciaTipo, i), recorrencia_pai: first.id });
          }
          toast.success(`${repeticoes + 1} lembretes criados com sucesso!`);
        } else {
          await createLembrete.mutateAsync(payload);
        }
      }
      // Disable blocker before navigating
      isSubmittingRef.current = true;
      setNome(''); setWhatsapp(''); setMensagem(''); setCategoriaId('');
      navigate('/ativos');
    } catch {
      // error handled by mutation
    } finally {
      setUploading(false);
    }
  };

  const selectSugestao = (s: Sugestao) => {
    setNome(s.nome);
    const isGroup = s.whatsapp.includes('@g.us');
    setTargetType(isGroup ? 'grupo' : 'contato');
    if (isGroup) {
      setWhatsapp(s.whatsapp);
    } else {
      const { codigo, resto } = detectarDDI(s.whatsapp);
      setCodigoPais(codigo);
      setWhatsapp(codigo === '55' ? formatWhatsapp(resto) : resto);
    }
    setShowSugestoes(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const type = file.type;
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 10) {
        toast.error(`${file.name} excede 10MB`);
        continue;
      }
      if (type.startsWith('image/')) {
        setAnexoImagem(file);
        setExistingImagem(null);
      } else if (type.startsWith('audio/')) {
        setAnexoAudio(file);
        setExistingAudio(null);
      } else if (type === 'application/pdf') {
        setAnexoPdf(file);
        setExistingPdf(null);
      } else {
        toast.error(`Tipo não suportado: ${file.name}`);
      }
    }
    e.target.value = '';
  };

  const isSubmittingRef = useRef(false);
  const isDirty = !!(nome || whatsapp || mensagem || categoriaId);

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !isSubmittingRef.current && isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  const isPending = isEditing ? updateLembrete.isPending : createLembrete.isPending;

  const anexos = [
    { file: anexoImagem, url: existingImagem, label: 'Imagem', icon: Image, clear: () => { setAnexoImagem(null); setExistingImagem(null); } },
    { file: anexoAudio, url: existingAudio, label: 'Áudio', icon: Music, clear: () => { setAnexoAudio(null); setExistingAudio(null); } },
    { file: anexoPdf, url: existingPdf, label: 'PDF', icon: FileText, clear: () => { setAnexoPdf(null); setExistingPdf(null); } },
  ].filter(a => a.file || a.url);

  return (
    <>
    {blocker.state === 'blocked' && (
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção!</AlertDialogTitle>
            <AlertDialogDescription>
              Se você sair dessa tela, perderá o lembrete que está preenchendo. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="dados" className="flex flex-col gap-1 py-2 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="leading-tight text-center">Dados e<br className="sm:hidden" /> Mensagem</span>
          </TabsTrigger>
          <TabsTrigger value="agendamento" className="flex flex-col gap-1 py-2 text-xs sm:text-sm">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="leading-tight text-center">Agendamento</span>
          </TabsTrigger>
          <TabsTrigger value="midia" className="flex flex-col gap-1 py-2 text-xs sm:text-sm">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span className="leading-tight text-center">Mídia</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== ABA 1: Dados e Mensagem ===== */}
        <TabsContent value="dados" className="space-y-5 mt-4">
          <div className="rounded-xl bg-card border p-5 space-y-5">
            {/* Nome with autocomplete - hidden for turma */}
            {targetType !== 'turma' && (
            <div className="space-y-2 relative" ref={nomeRef}>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onFocus={() => sugestoes.length > 0 && setShowSugestoes(true)}
                onBlur={() => setTimeout(() => setShowSugestoes(false), 200)}
                placeholder="Nome do cliente"
                className="h-[52px] border-2"
                autoComplete="off"
              />
              {showSugestoes && sugestoes.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
                  {sugestoes.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-4 py-2.5 hover:bg-accent text-sm flex justify-between items-center"
                      onMouseDown={() => selectSugestao(s)}
                    >
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-muted-foreground text-xs">{s.whatsapp}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="whatsapp">{targetType === 'turma' ? 'Turma *' : 'WhatsApp *'}</Label>
              {/* Linha 1: Seletor de país + botão Contato/Grupo/Turma */}
              <div className="flex gap-2">
                {targetType === 'contato' && (
                  <Select value={codigoPais} onValueChange={(v) => { setCodigoPais(v); setWhatsapp(''); }}>
                    <SelectTrigger className="h-[52px] border-2 flex-1 sm:flex-none sm:w-[140px]">
                      <SelectValue>
                        {(() => {
                          const p = PAISES.find(p => p.codigo === codigoPais);
                          return p ? `${p.bandeira} +${p.codigo}` : '';
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start">
                      {PAISES.map((p) => (
                        <SelectItem key={p.codigo} value={p.codigo}>
                          {p.bandeira} +{p.codigo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  variant={targetType === 'contato' ? 'default' : 'outline'}
                  className="h-[52px] px-3 border-2 shrink-0 text-xs font-semibold"
                  onClick={() => { setTargetType('contato'); setWhatsapp(''); setSelectedTurmaId(null); }}
                >
                  👤 Contato
                </Button>
                <Button
                  type="button"
                  variant={targetType === 'grupo' ? 'default' : 'outline'}
                  className="h-[52px] px-3 border-2 shrink-0 text-xs font-semibold"
                  onClick={() => { setTargetType('grupo'); setWhatsapp(''); setSelectedTurmaId(null); }}
                >
                  📱 Grupo
                </Button>
                <Button
                  type="button"
                  variant={targetType === 'turma' ? 'default' : 'outline'}
                  className="h-[52px] px-3 border-2 shrink-0 text-xs font-semibold"
                  onClick={() => { setTargetType('turma'); setWhatsapp(''); }}
                >
                  <GraduationCap className="h-4 w-4 mr-1" /> Turma
                </Button>
              </div>
              {/* Linha 2: Input do número ou seletor de turma */}
              {targetType === 'turma' ? (
                <div className="space-y-2">
                  <Select value={selectedTurmaId || ''} onValueChange={setSelectedTurmaId}>
                    <SelectTrigger className="h-[52px] border-2">
                      <SelectValue placeholder="Selecione uma turma..." />
                    </SelectTrigger>
                    <SelectContent>
                      {turmasList.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="inline-block h-2.5 w-2.5 rounded-full mr-2" style={{ backgroundColor: t.cor }} />
                          {t.nome} ({t.membros_count} membro{(t.membros_count || 0) !== 1 ? 's' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTurmaData?.membros && selectedTurmaData.membros.length > 0 && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Membros da turma:</p>
                      {selectedTurmaData.membros.map(m => (
                        <p key={m.id} className="text-sm">{m.nome} · <span className="text-muted-foreground">{m.whatsapp}</span></p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Input
                  id="whatsapp"
                  value={whatsapp}
                  onChange={(e) => {
                    setShowCadastroPrompt(false);
                    if (isGrupo) {
                      setWhatsapp(e.target.value);
                      return;
                    }
                    let raw = e.target.value.replace(/[\s\-\(\)\+]/g, '').replace(/\D/g, '');
                    if (codigoPais === '55') {
                      setWhatsapp(formatWhatsapp(raw));
                    } else {
                      setWhatsapp(raw);
                    }
                  }}
                  onBlur={checkContactExists}
                  placeholder={isGrupo ? '120363417495806856@g.us' : codigoPais === '55' ? '(00) 00000-0000' : 'Número'}
                  className="h-[52px] border-2 w-full"
                />
              )}
              {showCadastroPrompt && targetType === 'contato' && !isEditing && (
                <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Cliente não cadastrado. Deseja cadastrar?
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="h-8 px-3 text-xs"
                      disabled={cadastrando}
                      onClick={handleCadastrarContato}
                    >
                      {cadastrando ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sim'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={() => setShowCadastroPrompt(false)}
                    >
                      Não
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="flex gap-2">
                <Select value={categoriaId} onValueChange={(id) => {
                  setCategoriaId(id);
                  const cat = categorias.find((c: any) => c.id === id);
                  if (cat?.template_mensagem && !mensagem) {
                    setMensagem(substituirVariaveis(cat.template_mensagem, { nome, dataContato, horaEnvio }));
                  }
                }}>
                  <SelectTrigger className="h-[52px] border-2 flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" className="h-[52px] w-[52px] border-2 shrink-0" onClick={() => setShowNewCatDialog(true)} title="Nova categoria">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value.slice(0, 1000))}
                placeholder="Olá [NOME], este é um lembrete..."
                className="min-h-[200px] border-2 text-base resize-none overflow-hidden"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{mensagem.length}/1000 caracteres</span>
                <span>Variáveis: [NOME] [HOJE] [AMANHÃ] [DATA] [DIA] [HORA]</span>
              </div>
              {/\[(NOME|HOJE|AMANHA|AMANHÃ|DATA|DIA|HORA)\]/i.test(mensagem) && (
                <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-1">
                  <p className="text-xs font-medium text-primary">📋 Preview da mensagem:</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {substituirVariaveis(mensagem, { nome: nome || '______', dataContato, horaEnvio })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== ABA 2: Agendamento e Extras ===== */}
        <TabsContent value="agendamento" className="space-y-5 mt-4">
          {/* Recorrência - oculta ao editar */}
          {!isEditing && (
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
                      min={dataContato}
                      value={recorrenciaDataFim}
                      onChange={(e) => setRecorrenciaDataFim(e.target.value)}
                      className="h-10 w-48 border-2"
                    />
                  </div>
                  {recorrenciaDataFim && (() => {
                    const rep = calcularRepeticoesFromFim(recorrenciaTipo, dataContato, recorrenciaDataFim);
                    const datas = gerarDatasPreviewForm(recorrenciaTipo, dataContato, recorrenciaDataFim);
                    return rep > 0 ? (
                      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                        <p className="text-xs font-semibold text-primary">📅 {datas.length} lembrete{datas.length !== 1 ? 's' : ''} serão criados:</p>
                        <p className="text-xs text-muted-foreground flex flex-wrap gap-1">
                          {datas.slice(0, 12).map((d, i) => (
                            <span key={i} className="bg-primary/10 text-primary rounded px-1.5 py-0.5">
                              {`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear().toString().slice(2)}`}
                            </span>
                          ))}
                          {datas.length > 12 && <span className="text-muted-foreground">... e mais {datas.length - 12}</span>}
                        </p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

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
                  <Button
                    key={time}
                    type="button"
                    variant={horaEnvio === time ? 'default' : 'outline'}
                    className="h-12 text-base font-semibold border-2"
                    onClick={() => setHoraEnvio(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="rounded-xl bg-card border p-5 space-y-3">
            <Label className="font-semibold">Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas internas sobre este lembrete..."
              className="min-h-[80px] border-2"
            />
          </div>
        </TabsContent>

        {/* ===== ABA 3: Mídia ===== */}
        <TabsContent value="midia" className="space-y-5 mt-4">
          {/* Anexos */}
          <div className="rounded-xl bg-card border p-5 space-y-3">
            <Label className="font-semibold">Anexos (opcional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,.pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const dt = e.dataTransfer;
                if (dt.files) {
                  const fakeEvent = { target: { files: dt.files, value: '' } } as any;
                  handleFileSelect(fakeEvent);
                }
              }}
            >
              <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
              <p className="text-base">📤 Arraste arquivos ou clique aqui</p>
              <p className="text-sm mt-1">Imagem, Áudio ou PDF (max 10MB)</p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 border-2 font-semibold"
              onClick={() => { setShowLibrary(true); loadLibrary(); }}
            >
              <FolderOpen className="h-5 w-5 mr-2" />
              Selecionar da Biblioteca
            </Button>

            {anexos.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {anexos.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
                    <a.icon className="h-4 w-4 text-primary" />
                    <span className="truncate max-w-[200px]">
                      {a.file ? a.file.name : `${a.label} existente`}
                    </span>
                    <button type="button" onClick={a.clear} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {existingImagem && !anexoImagem && (
              <div className="mt-2">
                <img src={existingImagem} alt="Anexo atual" className="rounded-lg max-h-32 border" />
              </div>
            )}
          </div>

          {/* Gravador de Áudio */}
          <AudioRecorder
            onRecordingComplete={(file) => {
              setAnexoAudio(file);
              setExistingAudio(null);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Botões sempre visíveis */}
      <div className="flex justify-between items-center pt-2">
        <Button type="button" variant="outline" onClick={() => navigate(-1)} className="h-12 px-8">Cancelar</Button>
        <Button type="submit" className="h-12 px-8 font-semibold" disabled={isPending || uploading}>
          {uploading ? 'Enviando arquivos...' : isPending ? 'Salvando...' : isEditing ? 'Atualizar Lembrete' : 'Salvar Lembrete'}
        </Button>
      </div>
    </form>

    <Dialog open={showNewCatDialog} onOpenChange={setShowNewCatDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={newCatNome} onChange={(e) => setNewCatNome(e.target.value)} placeholder="Ex: MANUTENÇÃO" className="h-12 border-2" />
          </div>
          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <Label>Ícone</Label>
              <div className="flex gap-2">
                <Input value={newCatIcone} onChange={(e) => setNewCatIcone(e.target.value)} placeholder="📋" className="h-12 border-2 text-center text-xl flex-1" maxLength={4} />
                <EmojiPicker value={newCatIcone} onChange={setNewCatIcone} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input type="color" value={newCatCor} onChange={(e) => setNewCatCor(e.target.value)} className="h-12 w-16 border-2 cursor-pointer" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewCatDialog(false)}>Cancelar</Button>
          <Button
            disabled={savingCat || !newCatNome.trim()}
            onClick={async () => {
              if (!user) return;
              setSavingCat(true);
              const { data, error } = await supabase
                .from('lembrai_categorias')
                .insert({ usuario_id: user.id, nome: newCatNome.trim().toUpperCase(), icone: newCatIcone, cor: newCatCor })
                .select()
                .single();
              setSavingCat(false);
              if (error) {
                toast.error('Erro ao criar categoria: ' + error.message);
              } else {
                toast.success('Categoria criada!');
                queryClient.invalidateQueries({ queryKey: ['categorias'] });
                setCategoriaId(data.id);
                setNewCatNome('');
                setNewCatIcone('📋');
                setNewCatCor('#7C3AED');
                setShowNewCatDialog(false);
              }
            }}
          >
            {savingCat ? 'Salvando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Media Library Dialog */}
    <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>📁 Biblioteca de Mídia</DialogTitle>
        </DialogHeader>
        <Tabs value={libraryTab} onValueChange={(v) => setLibraryTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="image">🖼️ Imagens</TabsTrigger>
            <TabsTrigger value="audio">🎵 Áudios</TabsTrigger>
            <TabsTrigger value="pdf">📄 PDFs</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[350px] mt-3">
            {libraryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {libraryFiles.filter(f => f.type === libraryTab).length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">Nenhum arquivo encontrado</p>
                ) : libraryTab === 'image' ? (
                  <div className="grid grid-cols-3 gap-2 p-1">
                    {libraryFiles.filter(f => f.type === 'image').map((file) => (
                      <button
                        key={file.name}
                        type="button"
                        className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                        onClick={() => selectFromLibrary(file)}
                      >
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 p-1">
                    {libraryFiles.filter(f => f.type === libraryTab).map((file) => (
                      <button
                        key={file.name}
                        type="button"
                        className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-accent/50 transition-colors text-left"
                        onClick={() => selectFromLibrary(file)}
                      >
                        {libraryTab === 'audio' ? <Music className="h-5 w-5 text-primary shrink-0" /> : <FileText className="h-5 w-5 text-primary shrink-0" />}
                        <span className="truncate text-sm">{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
    </>
  );
}
