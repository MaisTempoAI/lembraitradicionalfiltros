import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCreateLembrete, useCategorias } from '@/hooks/useLembretes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, AlertTriangle, Phone, User, Package, CheckSquare, Square, Send, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { ClientePdf } from '@/lib/pdf-parser';

const HORARIOS_FIXOS = ['10:10', '13:13', '17:17'];
const MAX_POR_HORARIO = 10;

/** Gera a agenda de envio distribuída: max 10 por slot, avança horários/dias */
function gerarAgendaDistribuida(total: number, dataBase: string): { data: string; hora: string }[] {
  const now = new Date();
  const hojeStr = now.toISOString().split('T')[0];
  const horaAtual = now.getHours() * 60 + now.getMinutes();

  // Parse horários em minutos
  const horariosMin = HORARIOS_FIXOS.map(h => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm;
  });

  // Encontrar primeiro slot disponível
  let diaOffset = 0;
  let slotIndex = 0;

  // Se é hoje, pular horários que já passaram
  if (dataBase === hojeStr) {
    const primeiroFuturo = horariosMin.findIndex(m => m > horaAtual);
    if (primeiroFuturo === -1) {
      // Todos os horários de hoje já passaram, começar amanhã
      diaOffset = 1;
      slotIndex = 0;
    } else {
      slotIndex = primeiroFuturo;
    }
  }

  const agenda: { data: string; hora: string }[] = [];
  let contadorNoSlot = 0;

  for (let i = 0; i < total; i++) {
    const dataEnvio = new Date(dataBase + 'T12:00:00');
    dataEnvio.setDate(dataEnvio.getDate() + diaOffset);
    const dataStr = dataEnvio.toISOString().split('T')[0];

    agenda.push({
      data: dataStr,
      hora: HORARIOS_FIXOS[slotIndex],
    });

    contadorNoSlot++;
    if (contadorNoSlot >= MAX_POR_HORARIO) {
      contadorNoSlot = 0;
      slotIndex++;
      if (slotIndex >= HORARIOS_FIXOS.length) {
        slotIndex = 0;
        diaOffset++;
      }
    }
  }

  return agenda;
}

export default function ImportPdfPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const createLembrete = useCreateLembrete();
  const { data: categorias = [] } = useCategorias();

  const clientesFromState = (location.state?.clientes as ClientePdf[]) || [];

  const [clientes, setClientes] = useState<ClientePdf[]>(clientesFromState);
  const [categoriaId, setCategoriaId] = useState('');
  const [mensagemTemplate, setMensagemTemplate] = useState('');
  const [dataContato, setDataContato] = useState(new Date().toISOString().split('T')[0]);
  const [intervaloDias, setIntervaloDias] = useState(0);
  const [criando, setCriando] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importandoContatos, setImportandoContatos] = useState(false);
  const [contatosImportados, setContatosImportados] = useState(0);

  // Auto-select REFIL category if it exists
  useEffect(() => {
    if (!categoriaId && categorias.length > 0) {
      const refil = categorias.find(c => c.nome.toLowerCase().includes('refil'));
      if (refil) setCategoriaId(refil.id);
    }
  }, [categorias, categoriaId]);

  // Load template when category changes
  useEffect(() => {
    if (categoriaId) {
      const cat = categorias.find(c => c.id === categoriaId);
      if (cat && (cat as any).template_mensagem) {
        setMensagemTemplate((cat as any).template_mensagem);
      }
    }
  }, [categoriaId, categorias]);

  // Redirect if no data
  useEffect(() => {
    if (clientesFromState.length === 0) {
      navigate('/');
      toast.error('Nenhum dado de PDF encontrado.');
    }
  }, [clientesFromState, navigate]);

  const toggleCliente = (index: number) => {
    setClientes(prev => prev.map((c, i) => i === index ? { ...c, selecionado: !c.selecionado } : c));
  };

  const selecionarTodos = () => {
    setClientes(prev => prev.map(c => ({ ...c, selecionado: c.telefone.length > 0 })));
  };

  const desmarcarTodos = () => {
    setClientes(prev => prev.map(c => ({ ...c, selecionado: false })));
  };

  const updateTelefone = (index: number, value: string) => {
    setClientes(prev => prev.map((c, i) => i === index ? { ...c, telefone: value } : c));
  };

  const updateItens = (index: number, value: string) => {
    setClientes(prev => prev.map((c, i) => i === index ? { ...c, itens: [value] } : c));
  };

  const selecionados = clientes.filter(c => c.selecionado);
  const clientesComTelefone = clientes.filter(c => c.telefone.length >= 10);
  const semTelefone = clientes.filter(c => !c.telefone);

  const gerarMensagem = (cliente: ClientePdf) => {
    let msg = mensagemTemplate || 'Olá [NOME], seu [ITEM] está na hora de trocar!';
    msg = msg.replace(/\[NOME\]/gi, cliente.nome.trim());
    msg = msg.replace(/\[ITEM\]/gi, cliente.itens.join(', '));
    return msg;
  };

  // Agenda preview
  const clientesValidos = useMemo(() => selecionados.filter(c => c.telefone.length >= 10), [selecionados]);
  const agenda = useMemo(() => gerarAgendaDistribuida(clientesValidos.length, dataContato), [clientesValidos.length, dataContato]);

  // Summary of schedule distribution
  const agendaResumo = useMemo(() => {
    const map = new Map<string, number>();
    agenda.forEach(a => {
      const key = `${a.data} às ${a.hora}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([slot, count]) => ({ slot, count }));
  }, [agenda]);

  const handleImportarContatos = async () => {
    if (!user) return;
    const comTelefone = clientes.filter(c => c.telefone.length >= 10);
    if (comTelefone.length === 0) {
      toast.error('Nenhum cliente com telefone válido.');
      return;
    }

    setImportandoContatos(true);
    let importados = 0;
    try {
      for (const cliente of comTelefone) {
        await supabase.from('lembrai_lembretes').insert({
          usuario_id: user.id,
          nome: cliente.nome,
          whatsapp: cliente.telefone,
          data_contato: dataContato,
          intervalo_dias: 0,
          hora_envio: '10:10',
          mensagem: '',
          status: 'contato',
          recorrente: false,
          observacoes: `Importado via PDF - Itens: ${cliente.itens.join(', ')}`,
        });
        importados++;
      }
      setContatosImportados(importados);
      toast.success(`${importados} contatos importados com sucesso!`);
    } catch {
      toast.error('Erro ao importar contatos.');
    } finally {
      setImportandoContatos(false);
    }
  };

  const handleSubmit = async () => {
    if (selecionados.length === 0) {
      toast.error('Selecione ao menos 1 cliente.');
      return;
    }
    if (!mensagemTemplate && !confirm('Nenhum template de mensagem definido. Usar mensagem padrão?')) return;

    if (clientesValidos.length === 0) {
      toast.error('Nenhum cliente selecionado tem telefone válido.');
      return;
    }

    setCriando(true);
    setProgress(0);

    try {
      for (let i = 0; i < clientesValidos.length; i++) {
        const cliente = clientesValidos[i];
        const msgFinal = gerarMensagem(cliente);
        const slot = agenda[i];

        await createLembrete.mutateAsync({
          nome: cliente.nome,
          whatsapp: cliente.telefone,
          data_contato: slot.data,
          intervalo_dias: intervaloDias,
          data_envio_especifica: null,
          hora_envio: slot.hora,
          categoria_id: categoriaId || null,
          mensagem: msgFinal,
          recorrente: false,
          recorrencia_tipo: null,
          recorrencia_repeticoes: null,
          observacoes: `Importado via PDF - Itens: ${cliente.itens.join(', ')}`,
        });

        setProgress(i + 1);
      }

      toast.success(`${clientesValidos.length} lembretes criados com sucesso!`);
      navigate('/ativos');
    } catch (err) {
      toast.error('Erro ao criar lembretes.');
    } finally {
      setCriando(false);
    }
  };

  if (clientes.length === 0) return null;

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Importar PDF</h1>
              <p className="text-muted-foreground text-sm">
                {clientes.length} clientes encontrados · {selecionados.length} selecionados
                {semTelefone.length > 0 && (
                  <span className="text-destructive ml-2">· {semTelefone.length} sem telefone</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button
              variant="outline"
              onClick={handleImportarContatos}
              disabled={importandoContatos || clientesComTelefone.length === 0}
              className="gap-2"
            >
              {importandoContatos ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
              ) : (
                <><UserPlus className="h-4 w-4" /> Importar Contatos ({clientesComTelefone.length})</>
              )}
            </Button>
            {contatosImportados > 0 && (
              <Badge variant="secondary" className="text-xs">
                ✓ {contatosImportados} contatos importados
              </Badge>
            )}
          </div>
        </div>

        {/* Global Config */}
        <div className="rounded-xl bg-card border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Configurações do Lote</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categorias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data de Contato</Label>
              <Input type="date" value={dataContato} onChange={e => setDataContato(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Horários de Envio</Label>
              <div className="flex flex-wrap gap-1.5">
                {HORARIOS_FIXOS.map(h => (
                  <Badge key={h} variant="secondary" className="text-xs px-2 py-1">
                    {h}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Máx. {MAX_POR_HORARIO} envios por horário (distribuição automática)</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Template da Mensagem</Label>
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">[NOME]</code> e <code className="bg-muted px-1 rounded">[ITEM]</code> como variáveis
            </p>
            <Textarea
              value={mensagemTemplate}
              onChange={e => setMensagemTemplate(e.target.value)}
              placeholder="Olá [NOME], seu [ITEM] está na hora de trocar! Entre em contato conosco."
              className="min-h-[100px]"
            />
          </div>

          {/* Schedule preview */}
          {agendaResumo.length > 0 && (
            <div className="space-y-1.5">
              <Label>Distribuição de Envios</Label>
              <div className="flex flex-wrap gap-2">
                {agendaResumo.map(({ slot, count }) => (
                  <Badge key={slot} variant="outline" className="text-xs gap-1">
                    📅 {slot} — {count} envio{count > 1 ? 's' : ''}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Client List */}
        <div className="rounded-xl bg-card border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Clientes Extraídos</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selecionarTodos}>
                <CheckSquare className="h-3.5 w-3.5 mr-1" /> Selecionar todos
              </Button>
              <Button variant="outline" size="sm" onClick={desmarcarTodos}>
                <Square className="h-3.5 w-3.5 mr-1" /> Desmarcar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {clientes.map((cliente, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 transition-colors ${
                  cliente.selecionado ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                } ${!cliente.telefone ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={cliente.selecionado}
                    onCheckedChange={() => toggleCliente(index)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{cliente.nome}</span>
                      {!cliente.telefone && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" /> Sem telefone
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          value={cliente.telefone}
                          onChange={e => updateTelefone(index, e.target.value)}
                          placeholder="Telefone"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          value={cliente.itens.join(', ')}
                          onChange={e => updateItens(index, e.target.value)}
                          placeholder="Item(ns)"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    {mensagemTemplate && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-1">
                        <span className="font-medium">Preview:</span> {gerarMensagem(cliente).substring(0, 120)}
                        {gerarMensagem(cliente).length > 120 && '...'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="rounded-xl bg-card border p-5 space-y-4">
          {criando && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Criando lembretes...</span>
                <span>{progress} / {clientesValidos.length}</span>
              </div>
              <Progress value={(progress / Math.max(clientesValidos.length, 1)) * 100} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {clientesValidos.length} lembretes serão criados (distribuídos em {agendaResumo.length} slot{agendaResumo.length > 1 ? 's' : ''})
            </p>
            <Button
              onClick={handleSubmit}
              disabled={criando || selecionados.length === 0}
              className="gap-2"
              size="lg"
            >
              {criando ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Criando...</>
              ) : (
                <><Send className="h-4 w-4" /> Criar Lembretes</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
