import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useTurmas, useCreateTurma, useUpdateTurma, useDeleteTurma, useTurmaById, Turma } from '@/hooks/useTurmas';
import { useAllLembretes } from '@/hooks/useLembretes';
import { Plus, Pencil, Trash2, Users, Search, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatarExibicao } from '@/lib/whatsapp-utils';
import { PAISES, detectarDDI, formatWhatsapp } from '@/lib/whatsapp-utils';

interface TurmasDialogProps {
  open: boolean;
  onClose: () => void;
}

interface MemberDraft {
  nome: string;
  whatsapp: string;
}

export default function TurmasDialog({ open, onClose }: TurmasDialogProps) {
  const { data: turmas = [], isLoading } = useTurmas();
  const createTurma = useCreateTurma();
  const updateTurma = useUpdateTurma();
  const deleteTurma = useDeleteTurma();
  const { data: allLembretes = [] } = useAllLembretes();

  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formCor, setFormCor] = useState('#7C3AED');
  const [formMembros, setFormMembros] = useState<MemberDraft[]>([]);
  
  // Contact picker
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedWas, setSelectedWas] = useState<Set<string>>(new Set());

  // New member inline
  const [newMemberNome, setNewMemberNome] = useState('');
  const [newMemberWhatsapp, setNewMemberWhatsapp] = useState('');

  // Load turma data for editing
  const { data: editingTurma } = useTurmaById(editingId);

  // Build contacts from lembretes
  const availableContacts = useMemo(() => {
    const map = new Map<string, string>();
    allLembretes.forEach(r => {
      if (!map.has(r.whatsapp)) map.set(r.whatsapp, r.nome);
      else if (r.status === 'contato') map.set(r.whatsapp, r.nome);
    });
    return Array.from(map.entries())
      .map(([whatsapp, nome]) => ({ nome, whatsapp }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  }, [allLembretes]);

  const filteredContacts = useMemo(() => {
    if (!pickerSearch) return availableContacts;
    const q = pickerSearch.toLowerCase();
    return availableContacts.filter(c => c.nome.toLowerCase().includes(q) || c.whatsapp.includes(q));
  }, [availableContacts, pickerSearch]);

  const openNewForm = () => {
    setEditingId(null);
    setFormNome('');
    setFormCor('#7C3AED');
    setFormMembros([]);
    setMode('form');
  };

  const openEditForm = (turma: Turma) => {
    setEditingId(turma.id);
    setFormNome(turma.nome);
    setFormCor(turma.cor);
    // Members will be loaded via useTurmaById
    setMode('form');
  };

  // Sync membros when editing turma data loads
  useState(() => {});
  // Use effect-like pattern via key check
  const loadedEditId = editingTurma?.id;
  if (loadedEditId === editingId && editingTurma?.membros && formMembros.length === 0 && mode === 'form' && editingId) {
    // Only set once
    setTimeout(() => {
      setFormMembros(editingTurma.membros!.map(m => ({ nome: m.nome, whatsapp: m.whatsapp })));
    }, 0);
  }

  const openContactPicker = () => {
    setSelectedWas(new Set(formMembros.map(m => m.whatsapp)));
    setPickerSearch('');
    setShowPicker(true);
  };

  const confirmPicker = () => {
    const newMembros: MemberDraft[] = [];
    // Keep existing that are still selected
    formMembros.forEach(m => {
      if (selectedWas.has(m.whatsapp)) newMembros.push(m);
    });
    // Add new from contacts
    selectedWas.forEach(wa => {
      if (!newMembros.find(m => m.whatsapp === wa)) {
        const c = availableContacts.find(c => c.whatsapp === wa);
        if (c) newMembros.push({ nome: c.nome, whatsapp: c.whatsapp });
      }
    });
    // Keep manually added members that aren't in contacts
    formMembros.forEach(m => {
      if (!availableContacts.find(c => c.whatsapp === m.whatsapp) && !newMembros.find(n => n.whatsapp === m.whatsapp)) {
        newMembros.push(m);
      }
    });
    setFormMembros(newMembros);
    setShowPicker(false);
  };

  const addMemberInline = () => {
    if (!newMemberNome.trim() || !newMemberWhatsapp.trim()) {
      toast.error('Preencha nome e WhatsApp');
      return;
    }
    const wa = newMemberWhatsapp.replace(/\D/g, '');
    if (formMembros.find(m => m.whatsapp.replace(/\D/g, '') === wa)) {
      toast.error('Membro já adicionado');
      return;
    }
    setFormMembros(prev => [...prev, { nome: newMemberNome.trim(), whatsapp: '55' + wa }]);
    setNewMemberNome('');
    setNewMemberWhatsapp('');
  };

  const removeMember = (idx: number) => {
    setFormMembros(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!formNome.trim()) { toast.error('Nome da turma é obrigatório'); return; }
    if (formMembros.length === 0) { toast.error('Adicione pelo menos 1 membro'); return; }

    if (editingId) {
      await updateTurma.mutateAsync({ id: editingId, nome: formNome.trim(), cor: formCor, membros: formMembros });
    } else {
      await createTurma.mutateAsync({ nome: formNome.trim(), cor: formCor, membros: formMembros });
    }
    setMode('list');
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteTurma.mutateAsync(id);
  };

  const CORES = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#06B6D4', '#F97316'];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setMode('list'); onClose(); } }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'form' && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMode('list'); setEditingId(null); setFormMembros([]); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Users className="h-5 w-5" />
            {mode === 'list' ? 'Turmas' : editingId ? 'Editar Turma' : 'Nova Turma'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'list' ? (
          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : turmas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma turma cadastrada</p>
              </div>
            ) : (
              turmas.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-card gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: t.cor }}>
                      {t.nome.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.nome}</p>
                      <p className="text-xs text-muted-foreground">{t.membros_count || 0} membro{(t.membros_count || 0) !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)} disabled={deleteTurma.isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
            <Button className="w-full gap-2 mt-2" onClick={openNewForm}>
              <Plus className="h-4 w-4" /> Nova Turma
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="space-y-2">
              <Label>Nome da Turma *</Label>
              <Input value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Ex: Clientes VIP" className="border-2" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {CORES.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${formCor === c ? 'scale-110 border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setFormCor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Membros ({formMembros.length})</Label>
                <Button type="button" variant="outline" size="sm" onClick={openContactPicker} className="gap-1">
                  <Users className="h-3 w-3" /> Selecionar Contatos
                </Button>
              </div>

              {formMembros.length > 0 && (
                <ScrollArea className="max-h-40">
                  <div className="space-y-1">
                    {formMembros.map((m, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded bg-muted/50 text-sm">
                        <span className="truncate">{m.nome} · <span className="text-muted-foreground">{formatarExibicao(m.whatsapp)}</span></span>
                        <button type="button" onClick={() => removeMember(i)} className="text-destructive hover:text-destructive/80 ml-2">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Inline add member */}
              <div className="flex gap-2">
                <Input value={newMemberNome} onChange={e => setNewMemberNome(e.target.value)} placeholder="Nome" className="flex-1" />
                <Input value={newMemberWhatsapp} onChange={e => setNewMemberWhatsapp(formatWhatsapp(e.target.value.replace(/\D/g, '')))} placeholder="(00) 00000-0000" className="flex-1" />
                <Button type="button" variant="outline" size="icon" onClick={addMemberInline} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={createTurma.isPending || updateTurma.isPending}>
              {createTurma.isPending || updateTurma.isPending ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Turma'}
            </Button>
          </div>
        )}

        {/* Contact picker sub-dialog */}
        <Dialog open={showPicker} onOpenChange={setShowPicker}>
          <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Selecionar Contatos</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Buscar..." className="pl-10" />
            </div>
            <ScrollArea className="flex-1 max-h-[50vh]">
              <div className="space-y-1">
                {filteredContacts.map(c => (
                  <label key={c.whatsapp} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selectedWas.has(c.whatsapp)} onCheckedChange={() => {
                      setSelectedWas(prev => {
                        const next = new Set(prev);
                        next.has(c.whatsapp) ? next.delete(c.whatsapp) : next.add(c.whatsapp);
                        return next;
                      });
                    }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{formatarExibicao(c.whatsapp)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Badge variant="secondary">{selectedWas.size} selecionado{selectedWas.size !== 1 ? 's' : ''}</Badge>
              <Button onClick={confirmPicker}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
