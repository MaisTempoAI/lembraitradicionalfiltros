import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useCreateLembrete, useUpdateLembrete } from '@/hooks/useLembretes';
import {
  Upload, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle,
  X, FileText, ClipboardList, Users, Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type ContactStatus = 'ok' | 'atencao';

interface ImportedContact {
  id: string;
  nome: string;
  telefone: string;       // raw/display
  whatsappFinal: string;  // 55 + digits
  status: ContactStatus;
  problema?: string;
}

// ─── Parsing helpers ─────────────────────────────────────────────────────────

function normalizarTelefone(raw: string): { whatsapp: string; status: ContactStatus; problema?: string } {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { whatsapp: '', status: 'atencao', problema: 'Telefone vazio ou não numérico' };

  // Remove DDI 55 se já presente e resultar em número longo
  const sem55 = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;

  if (sem55.length < 10) return { whatsapp: '55' + sem55, status: 'atencao', problema: 'Número curto (menos de 10 dígitos)' };
  if (sem55.length > 11) return { whatsapp: '55' + sem55.slice(0, 11), status: 'atencao', problema: 'Número longo — verifique DDI' };

  return { whatsapp: '55' + sem55, status: 'ok' };
}

const CHAR_WARNING_RE = /[$|\\0\x00-\x08\x0E-\x1F\x7F]/;

function parseLine(line: string): { nome: string; telefone: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  for (const sep of [',', ';', '\t']) {
    const parts = trimmed.split(sep);
    if (parts.length >= 2) {
      return { nome: parts[0].trim(), telefone: parts.slice(1).join(sep).trim() };
    }
  }

  // Fallback: last cluster of digit-like chars = phone
  const m = trimmed.match(/^(.+?)\s+([\d\s\(\)\-\+]{7,})$/);
  if (m) return { nome: m[1].trim(), telefone: m[2].trim() };

  return null;
}

function parseText(text: string): ImportedContact[] {
  const lines = text.split(/\r?\n/);
  const contacts: ImportedContact[] = [];

  lines.forEach((line, idx) => {
    const parsed = parseLine(line);
    if (!parsed) return;

    const { nome, telefone } = parsed;
    const { whatsapp, status, problema } = normalizarTelefone(telefone);

    // Char warning on name (non-blocking → status already ok, just append note)
    const nomeProblema = CHAR_WARNING_RE.test(nome) ? 'Nome contém caracteres especiais' : undefined;
    const finalStatus: ContactStatus = status === 'atencao' ? 'atencao' : (nomeProblema ? 'atencao' : 'ok');

    contacts.push({
      id: `${idx}-${Date.now()}`,
      nome,
      telefone,
      whatsappFinal: whatsapp,
      status: finalStatus,
      problema: problema || nomeProblema,
    });
  });

  return contacts;
}

// ─── Contact Row ─────────────────────────────────────────────────────────────

interface ContactRowProps {
  contact: ImportedContact;
  onUpdate: (id: string, field: 'nome' | 'telefone', value: string) => void;
  onRemove: (id: string) => void;
}

function ContactRow({ contact, onUpdate, onRemove }: ContactRowProps) {
  const isOk = contact.status === 'ok';

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-xl border transition-colors',
      isOk
        ? 'bg-[hsl(var(--success,142_76%_96%))] border-[hsl(var(--success-border,142_76%_86%))]'
        : 'bg-[hsl(var(--warning,48_96%_96%))] border-[hsl(var(--warning-border,48_96%_76%))]'
    )}>
      <div className="mt-2 shrink-0">
        {isOk
          ? <CheckCircle2 className="h-5 w-5 text-[hsl(142,72%,35%)]" />
          : <AlertTriangle className="h-5 w-5 text-[hsl(38,92%,40%)]" />
        }
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          value={contact.nome}
          onChange={e => onUpdate(contact.id, 'nome', e.target.value)}
          placeholder="Nome"
          className="h-8 text-sm bg-background"
        />
        <Input
          value={contact.telefone}
          onChange={e => onUpdate(contact.id, 'telefone', e.target.value)}
          placeholder="Telefone"
          className="h-8 text-sm bg-background"
        />
        {contact.problema && (
          <p className="sm:col-span-2 text-xs text-destructive font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {contact.problema}
          </p>
        )}
      </div>

      <button
        onClick={() => onRemove(contact.id)}
        className="mt-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Remover"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportContactsPage() {
  const navigate = useNavigate();
  const createLembrete = useCreateLembrete();
  const updateLembrete = useUpdateLembrete();

  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [texto, setTexto] = useState('');
  const [contacts, setContacts] = useState<ImportedContact[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(txt|csv)$/i)) {
      toast.error('Somente arquivos .txt ou .csv são aceitos.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setTexto((e.target?.result as string) || '');
    reader.readAsText(file, 'UTF-8');
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Step 1 → 2 ─────────────────────────────────────────────────────────────

  const handleContinuar = () => {
    if (!texto.trim()) {
      toast.error('Cole ou faça upload de uma lista de contatos primeiro.');
      return;
    }
    const parsed = parseText(texto);
    if (parsed.length === 0) {
      toast.error('Nenhum contato reconhecido. Verifique o formato.');
      return;
    }
    setContacts(parsed);
    setEtapa(2);
  };

  // ── Row edit / remove ──────────────────────────────────────────────────────

  const handleUpdate = (id: string, field: 'nome' | 'telefone', value: string) => {
    setContacts(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      // Re-validate phone on telefone change
      if (field === 'telefone') {
        const { whatsapp, status, problema } = normalizarTelefone(value);
        const nomeProblema = CHAR_WARNING_RE.test(updated.nome) ? 'Nome contém caracteres especiais' : undefined;
        return {
          ...updated,
          whatsappFinal: whatsapp,
          status: status === 'atencao' ? 'atencao' : (nomeProblema ? 'atencao' : 'ok'),
          problema: problema || nomeProblema,
        };
      }
      // Re-validate name on nome change
      const nomeProblema = CHAR_WARNING_RE.test(value) ? 'Nome contém caracteres especiais' : undefined;
      const phoneResult = normalizarTelefone(updated.telefone);
      return {
        ...updated,
        whatsappFinal: phoneResult.whatsapp,
        status: phoneResult.status === 'atencao' ? 'atencao' : (nomeProblema ? 'atencao' : 'ok'),
        problema: phoneResult.problema || nomeProblema,
      };
    }));
  };

  const handleRemove = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  // ── Import ─────────────────────────────────────────────────────────────────

  const contatsOk = contacts.filter(c => c.status === 'ok');
  const contatosAtencao = contacts.filter(c => c.status === 'atencao');

  const handleImportar = async () => {
    const lista = contacts; // import all (user reviewed)
    if (lista.length === 0) {
      toast.error('Nenhum contato para importar.');
      return;
    }

    setImportando(true);
    setProgresso({ atual: 0, total: lista.length });

    const today = new Date().toISOString().split('T')[0];
    let ok = 0;
    let erros = 0;

    for (const c of lista) {
      try {
        const created = await createLembrete.mutateAsync({
          nome: c.nome.trim(),
          whatsapp: c.whatsappFinal,
          data_contato: today,
          hora_envio: '09:00',
          mensagem: 'Contato',
          recorrente: false,
          intervalo_dias: 0,
        });
        await updateLembrete.mutateAsync({ id: created.id, status: 'contato' });
        ok++;
      } catch {
        erros++;
      }
      setProgresso(p => ({ ...p, atual: p.atual + 1 }));
    }

    setImportando(false);

    if (erros === 0) {
      toast.success(`${ok} contatos importados com sucesso!`);
    } else {
      toast.warning(`${ok} importados · ${erros} com erro`);
    }
    navigate('/contatos');
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => etapa === 1 ? navigate('/contatos') : setEtapa(1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Importar Contatos</h1>
            <p className="text-sm text-muted-foreground">Etapa {etapa} de 2</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2">
          {[1, 2].map(s => (
            <div key={s} className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              etapa >= s ? 'bg-primary' : 'bg-muted'
            )} />
          ))}
        </div>

        {/* ── ETAPA 1 ── */}
        {etapa === 1 && (
          <div className="space-y-5">

            {/* File upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={cn(
                'rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-semibold text-sm">Arraste um arquivo ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">Aceita .txt e .csv (UTF-8)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              <div className="flex-1 h-px bg-border" />
              <span>ou cole abaixo</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <Textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder={"João da Silva, (19) 99229-5114\nMaria Gonçalves; (11) 98765-4321\nPedro Santos 21999998888"}
                className="min-h-[180px] font-mono text-sm resize-none"
              />
            </div>

            {/* Format hints */}
            <div className="rounded-lg bg-muted/40 border p-4 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Formatos aceitos (uma linha por contato)
              </p>
              {[
                'Nome, Telefone',
                'Nome; Telefone',
                'Nome\tTelefone  (tab)',
                'Nome Telefone (espaço)',
              ].map(f => (
                <p key={f} className="text-xs text-muted-foreground font-mono pl-5">• {f}</p>
              ))}
              <p className="text-xs text-muted-foreground pl-5 pt-1">
                Números serão tratados como Brasil (+55). DDI diferente será sinalizado.
              </p>
            </div>

            <Button onClick={handleContinuar} className="w-full gap-2" size="lg">
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── ETAPA 2 ── */}
        {etapa === 2 && (
          <div className="space-y-4">

            {/* Summary bar */}
            <div className="rounded-xl border bg-card p-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{contatsOk.length}</p>
                  <p className="text-xs text-muted-foreground">prontos</p>
                </div>
              </div>
              {contatosAtencao.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{contatosAtencao.length}</p>
                    <p className="text-xs text-muted-foreground">necessitam revisão</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground self-center ml-auto">
                Clique nos campos para editar
              </p>
            </div>

            {/* Contacts list */}
            {contacts.length === 0 ? (
              <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum contato restante.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {/* Attention first */}
                {contatosAtencao.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-destructive flex items-center gap-1 px-1">
                      <AlertTriangle className="h-3 w-3" /> Verificar antes de importar
                    </p>
                    {contatosAtencao.map(c => (
                      <ContactRow key={c.id} contact={c} onUpdate={handleUpdate} onRemove={handleRemove} />
                    ))}
                  </div>
                )}
                {contatsOk.length > 0 && (
                  <div className="space-y-2">
                    {contatosAtencao.length > 0 && (
                      <p className="text-xs font-semibold text-primary flex items-center gap-1 px-1 pt-2">
                        <CheckCircle2 className="h-3 w-3" /> Prontos para importar
                      </p>
                    )}
                    {contatsOk.map(c => (
                      <ContactRow key={c.id} contact={c} onUpdate={handleUpdate} onRemove={handleRemove} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Progress bar during import */}
            {importando && (
              <div className="space-y-1.5">
                <Progress value={(progresso.atual / progresso.total) * 100} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Importando {progresso.atual} de {progresso.total}...
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setEtapa(1)} disabled={importando} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button
                onClick={handleImportar}
                disabled={importando || contacts.length === 0}
                className="flex-1 gap-2"
              >
                <Phone className="h-4 w-4" />
                {importando ? 'Importando...' : `Importar ${contacts.length} contato${contacts.length !== 1 ? 's' : ''}`}
              </Button>
            </div>

            {contatosAtencao.length > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Contatos com ⚠️ serão importados mesmo assim — edite ou remova antes de confirmar.
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
