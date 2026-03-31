import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCreateLembrete, useCategorias } from '@/hooks/useLembretes';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Loader2, AlertTriangle, Phone, User, Package, CheckSquare, Square, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { ClientePdf } from '@/lib/pdf-parser';

const HORARIOS_FIXOS = ['07:07', '10:10', '13:13', '17:17', '20:20', '22:22'];

export default function ImportPdfPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const createLembrete = useCreateLembrete();
  const { data: categorias = [] } = useCategorias();

  const clientesFromState = (location.state?.clientes as ClientePdf[]) || [];

  const [clientes, setClientes] = useState<ClientePdf[]>(clientesFromState);
  const [categoriaId, setCategoriaId] = useState('');
  const [mensagemTemplate, setMensagemTemplate] = useState('');
  const [dataContato, setDataContato] = useState(new Date().toISOString().split('T')[0]);
  const [horaEnvio, setHoraEnvio] = useState('10:10');
  const [intervaloDias, setIntervaloDias] = useState(0);
  const [criando, setCriando] = useState(false);
  const [progress, setProgress] = useState(0);

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
  const semTelefone = clientes.filter(c => !c.telefone);

  const gerarMensagem = (cliente: ClientePdf) => {
    let msg = mensagemTemplate || 'Olá [NOME], seu [ITEM] está na hora de trocar!';
    msg = msg.replace(/\[NOME\]/gi, cliente.nome.trim());
    msg = msg.replace(/\[ITEM\]/gi, cliente.itens.join(', '));
    return msg;
  };

  const handleSubmit = async () => {
    if (selecionados.length === 0) {
      toast.error('Selecione ao menos 1 cliente.');
      return;
    }
    if (!mensagemTemplate && !confirm('Nenhum template de mensagem definido. Usar mensagem padrão?')) return;

    const clientesValidos = selecionados.filter(c => c.telefone.length >= 10);
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

        await createLembrete.mutateAsync({
          nome: cliente.nome,
          whatsapp: cliente.telefone,
          data_contato: dataContato,
          intervalo_dias: intervaloDias,
          data_envio_especifica: null,
          hora_envio: horaEnvio,
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

        {/* Global Config */}
        <div className="rounded-xl bg-card border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Configurações do Lote</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Label>Dias até envio</Label>
              <Input type="number" value={intervaloDias} onChange={e => setIntervaloDias(Number(e.target.value))} min={1} />
            </div>
            <div className="space-y-1.5">
              <Label>Horário de Envio</Label>
              <div className="flex flex-wrap gap-1.5">
                {HORARIOS_FIXOS.map(h => (
                  <Button
                    key={h}
                    type="button"
                    variant={horaEnvio === h ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs px-2 py-1"
                    onClick={() => setHoraEnvio(h)}
                  >
                    {h}
                  </Button>
                ))}
              </div>
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

          <ScrollArea className="max-h-[500px]">
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
          </ScrollArea>
        </div>

        {/* Submit */}
        <div className="rounded-xl bg-card border p-5 space-y-4">
          {criando && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Criando lembretes...</span>
                <span>{progress} / {selecionados.filter(c => c.telefone.length >= 10).length}</span>
              </div>
              <Progress value={(progress / Math.max(selecionados.filter(c => c.telefone.length >= 10).length, 1)) * 100} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selecionados.filter(c => c.telefone.length >= 10).length} lembretes serão criados
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
