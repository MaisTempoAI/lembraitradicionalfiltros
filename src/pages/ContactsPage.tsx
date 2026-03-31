import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAllLembretes, useCreateLembrete, useUpdateLembrete, useDeleteLembrete, LembreteRow } from '@/hooks/useLembretes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, User, Phone, Trash2, Bell, Upload, Pencil, Globe, Users, UserPlus, GraduationCap } from 'lucide-react';
import TurmasDialog from '@/components/TurmasDialog';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/StatusBadge';
import { format } from 'date-fns';
import { parseDateLocal } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { PAISES, detectarDDI, formatWhatsapp, formatarExibicao } from '@/lib/whatsapp-utils';

type ContactType = 'grupo' | 'internacional' | 'contato' | 'lembrete';
type TypeFilter = 'todos' | ContactType;

function getContactType(whatsapp: string, hasContactId: boolean): ContactType {
  if (whatsapp.includes('@g.us')) return 'grupo';
  const { codigo } = detectarDDI(whatsapp);
  if (codigo !== '55') return 'internacional';
  if (hasContactId) return 'contato';
  return 'lembrete';
}

const TYPE_CONFIG: Record<ContactType, { label: string; icon: React.ReactNode; className: string; activeClass: string }> = {
  grupo: {
    label: 'Grupo',
    icon: <Users className="h-3 w-3" />,
    className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    activeClass: 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700',
  },
  internacional: {
    label: 'Internacional',
    icon: <Globe className="h-3 w-3" />,
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    activeClass: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
  },
  contato: {
    label: 'Contato',
    icon: <User className="h-3 w-3" />,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700',
  },
  lembrete: {
    label: 'Sem cadastro',
    icon: <Bell className="h-3 w-3" />,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    activeClass: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600',
  },
};

interface ContactGroup {
  nome: string;
  whatsapp: string;
  contactId: string | null;
  totalLembretes: number;
  lembretes: LembreteRow[];
  latestCreatedAt: string;
}

export default function ContactsPage() {
  const navigate = useNavigate();
  const { data: allLembretes = [], isLoading } = useAllLembretes();
  const createLembrete = useCreateLembrete();
  const updateLembrete = useUpdateLembrete();
  const deleteLembrete = useDeleteLembrete();

  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'alpha' | 'recent'>('alpha');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactGroup | null>(null);
  const [newNome, setNewNome] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newCodigoPais, setNewCodigoPais] = useState('55');
  const [newIsGrupo, setNewIsGrupo] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactGroup | null>(null);
  const [turmasOpen, setTurmasOpen] = useState(false);

  const openEditDialog = (contact: ContactGroup) => {
    setEditingContact(contact);
    setNewNome(contact.nome);
    const isGrupo = contact.whatsapp.includes('@g.us');
    setNewIsGrupo(isGrupo);
    if (!isGrupo) {
      const { codigo, resto } = detectarDDI(contact.whatsapp);
      setNewCodigoPais(codigo);
      setNewWhatsapp(codigo === '55' ? formatWhatsapp(resto) : resto);
    } else {
      setNewWhatsapp(contact.whatsapp);
      setNewCodigoPais('55');
    }
    setDialogOpen(true);
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingContact(null);
    setNewNome('');
    setNewWhatsapp('');
    setNewCodigoPais('55');
    setNewIsGrupo(false);
  };

  const contacts = useMemo(() => {
    const map = new Map<string, ContactGroup>();

    allLembretes.forEach(r => {
      // Normalize key: strip non-digits for phone numbers, keep @g.us as-is
      const key = r.whatsapp.includes('@g.us') ? r.whatsapp : r.whatsapp.replace(/\D/g, '');

      const existing = map.get(key);
      if (!existing) {
        const isContact = r.status === 'contato';
        map.set(key, {
          nome: r.nome,
          whatsapp: r.whatsapp,
          contactId: isContact ? r.id : null,
          totalLembretes: isContact ? 0 : 1,
          lembretes: isContact ? [] : [r],
          latestCreatedAt: r.created_at,
        });
      } else {
        if (r.status === 'contato') {
          existing.contactId = r.id;
          existing.nome = r.nome;
          // Prefer the contato record's whatsapp (cleaner format)
          existing.whatsapp = r.whatsapp;
        } else {
          existing.totalLembretes += 1;
          existing.lembretes.push(r);
        }
        if (r.created_at > existing.latestCreatedAt) {
          existing.latestCreatedAt = r.created_at;
        }
      }
    });

    let groups = Array.from(map.values());

    if (search) {
      const q = search.toLowerCase();
      groups = groups.filter(g => g.nome.toLowerCase().includes(q) || g.whatsapp.includes(q));
    }

    if (typeFilter !== 'todos') {
      groups = groups.filter(g => getContactType(g.whatsapp, !!g.contactId) === typeFilter);
    }

    if (sortMode === 'alpha') {
      groups.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    } else {
      groups.sort((a, b) => b.latestCreatedAt.localeCompare(a.latestCreatedAt));
    }

    return groups;
  }, [allLembretes, search, sortMode, typeFilter]);

  const handleQuickSaveContact = async (contact: ContactGroup) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const created = await createLembrete.mutateAsync({
        nome: contact.nome,
        whatsapp: contact.whatsapp,
        data_contato: today,
        hora_envio: '09:00',
        mensagem: 'Contato',
        recorrente: false,
        intervalo_dias: 0,
      });
      await updateLembrete.mutateAsync({ id: created.id, status: 'contato' });
      toast.success(`${contact.nome} salvo como contato!`);
    } catch {
      // errors handled by hooks
    }
  };

  const handleAddContact = async () => {
    if (!newNome.trim() || !newWhatsapp.trim()) {
      toast.error('Preencha nome e WhatsApp.');
      return;
    }

    try {
      const whatsappFinal = newIsGrupo ? newWhatsapp.trim() : newCodigoPais + newWhatsapp.replace(/\D/g, '');

      if (editingContact) {
        if (editingContact.contactId) {
          await updateLembrete.mutateAsync({
            id: editingContact.contactId,
            nome: newNome.trim(),
            whatsapp: whatsappFinal,
          });
          for (const r of editingContact.lembretes) {
            await updateLembrete.mutateAsync({ id: r.id, nome: newNome.trim(), whatsapp: whatsappFinal });
          }
          toast.success('Contato atualizado!');
        } else {
          const today = new Date().toISOString().split('T')[0];
          const created = await createLembrete.mutateAsync({
            nome: newNome.trim(),
            whatsapp: whatsappFinal,
            data_contato: today,
            hora_envio: '09:00',
            mensagem: 'Contato',
            recorrente: false,
            intervalo_dias: 0,
          });
          await updateLembrete.mutateAsync({ id: created.id, status: 'contato' });
          for (const r of editingContact.lembretes) {
            await updateLembrete.mutateAsync({ id: r.id, nome: newNome.trim(), whatsapp: whatsappFinal });
          }
          toast.success('Contato salvo!');
        }
      } else {
        const today = new Date().toISOString().split('T')[0];
        const created = await createLembrete.mutateAsync({
          nome: newNome.trim(),
          whatsapp: whatsappFinal,
          data_contato: today,
          hora_envio: '09:00',
          mensagem: 'Contato',
          recorrente: false,
          intervalo_dias: 0,
        });
        await updateLembrete.mutateAsync({ id: created.id, status: 'contato' });
        toast.success('Contato salvo!');
      }

      resetDialog();
    } catch {
      // errors handled by hooks
    }
  };

  const handleDeleteContact = async (id: string) => {
    await deleteLembrete.mutateAsync(id);
  };

  // Count per type for filter badges
  const allGroups = useMemo(() => {
    const map = new Map<string, ContactGroup>();
    allLembretes.forEach(r => {
      const key = r.whatsapp.includes('@g.us') ? r.whatsapp : r.whatsapp.replace(/\D/g, '');
      const existing = map.get(key);
      if (!existing) {
        const isContact = r.status === 'contato';
        map.set(key, {
          nome: r.nome,
          whatsapp: r.whatsapp,
          contactId: isContact ? r.id : null,
          totalLembretes: isContact ? 0 : 1,
          lembretes: isContact ? [] : [r],
          latestCreatedAt: r.created_at,
        });
      } else {
        if (r.status === 'contato') {
          existing.contactId = r.id;
          existing.nome = r.nome;
          existing.whatsapp = r.whatsapp;
        } else {
          existing.totalLembretes += 1;
          existing.lembretes.push(r);
        }
      }
    });
    return Array.from(map.values());
  }, [allLembretes]);

  const typeCounts = useMemo(() => {
    const counts: Record<TypeFilter, number> = { todos: allGroups.length, contato: 0, lembrete: 0, grupo: 0, internacional: 0 };
    allGroups.forEach(g => {
      counts[getContactType(g.whatsapp, !!g.contactId)] += 1;
    });
    return counts;
  }, [allGroups]);

  const filterButtons: { key: TypeFilter; label: string; icon?: React.ReactNode }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'contato', label: TYPE_CONFIG.contato.label, icon: TYPE_CONFIG.contato.icon },
    { key: 'lembrete', label: TYPE_CONFIG.lembrete.label, icon: TYPE_CONFIG.lembrete.icon },
    { key: 'grupo', label: TYPE_CONFIG.grupo.label, icon: TYPE_CONFIG.grupo.icon },
    { key: 'internacional', label: TYPE_CONFIG.internacional.label, icon: TYPE_CONFIG.internacional.icon },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold tracking-tight">
            Contatos <span className="text-muted-foreground text-2xl font-normal">({contacts.length})</span>
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTurmasOpen(true)} className="gap-2">
              <GraduationCap className="h-4 w-4" /> Turmas
            </Button>
            <Button variant="outline" onClick={() => navigate('/contatos/importar')} className="gap-2">
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2 font-semibold">
              <Plus className="h-4 w-4" /> Novo Contato
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-card border p-4 space-y-3">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contato..." className="pl-10 h-10 border-2" />
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant={sortMode === 'alpha' ? 'default' : 'outline'} onClick={() => setSortMode('alpha')}>A→Z</Button>
              <Button size="sm" variant={sortMode === 'recent' ? 'default' : 'outline'} onClick={() => setSortMode('recent')}>Recente</Button>
            </div>
          </div>

          {/* Type filter buttons */}
          <div className="flex gap-1.5 flex-wrap">
            {filterButtons.map(fb => {
              const isActive = typeFilter === fb.key;
              const cfg = fb.key !== 'todos' ? TYPE_CONFIG[fb.key as ContactType] : null;
              return (
                <button
                  key={fb.key}
                  onClick={() => setTypeFilter(fb.key)}
                  className={[
                    'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
                    isActive
                      ? (cfg ? cfg.activeClass : 'bg-foreground text-background border-foreground')
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted',
                  ].join(' ')}
                >
                  {fb.icon}
                  {fb.label}
                  <span className={[
                    'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    isActive ? 'bg-white/20' : 'bg-muted text-muted-foreground',
                  ].join(' ')}>
                    {typeCounts[fb.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : contacts.length === 0 ? (
            <div className="rounded-xl bg-card border p-12 text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Nenhum contato encontrado</p>
              <p className="text-sm mt-1">Tente outro filtro ou clique em "Novo Contato".</p>
            </div>
          ) : (
            contacts.map(contact => {
              const type = getContactType(contact.whatsapp, !!contact.contactId);
              const cfg = TYPE_CONFIG[type];
              return (
                <div key={contact.whatsapp} className="rounded-xl bg-card border shadow-sm flex items-center justify-between p-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-semibold text-sm uppercase border ${cfg.className}`}>
                      {contact.nome.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{contact.nome}</p>
                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border font-medium ${cfg.className}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" /> {formatarExibicao(contact.whatsapp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      variant="secondary"
                      className="cursor-pointer gap-1 hover:bg-secondary/60 transition-colors"
                      onClick={() => setSelectedContact(contact)}
                    >
                      <Bell className="h-3 w-3" /> {contact.totalLembretes}
                    </Badge>
                    {/* Quick save for unregistered contacts */}
                    {type === 'lembrete' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => handleQuickSaveContact(contact)}
                        title="Salvar como contato"
                        disabled={createLembrete.isPending || updateLembrete.isPending}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(contact)}
                      title="Editar contato"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {contact.contactId ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteContact(contact.contactId!)}
                        title="Excluir contato"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={async () => {
                          for (const r of contact.lembretes) {
                            await deleteLembrete.mutateAsync(r.id);
                          }
                        }}
                        title="Excluir todos os lembretes deste contato"
                        disabled={deleteLembrete.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Popup de lembretes do contato */}
      <Dialog open={!!selectedContact} onOpenChange={(open) => { if (!open) setSelectedContact(null); }}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Lembretes de {selectedContact?.nome}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-2">
            {selectedContact?.lembretes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum lembrete para este contato.</p>
            ) : (
              selectedContact?.lembretes.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge status={r.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.mensagem.substring(0, 60)}{r.mensagem.length > 60 ? '...' : ''}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseDateLocal(r.data_contato), 'dd/MM/yyyy')} · {r.hora_envio}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog novo/editar contato */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contact-nome">Nome</Label>
              <Input id="contact-nome" value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Nome do contato ou grupo" />
            </div>
            <div>
              <Label htmlFor="contact-whatsapp">WhatsApp</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={newIsGrupo ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => { setNewIsGrupo(false); setNewWhatsapp(''); }}
                >
                  <User className="h-3 w-3 mr-1" /> Contato
                </Button>
                <Button
                  type="button"
                  variant={newIsGrupo ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setNewIsGrupo(true); setNewWhatsapp(''); }}
                >
                  Grupo
                </Button>
              </div>
              {newIsGrupo ? (
                <Input
                  id="contact-whatsapp"
                  value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(e.target.value)}
                  placeholder="ID do grupo (ex: 120363417495806856@g.us)"
                />
              ) : (
                <div className="flex gap-2">
                  <Select value={newCodigoPais} onValueChange={setNewCodigoPais}>
                    <SelectTrigger className="w-[110px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start">
                      {PAISES.map((p) => (
                        <SelectItem key={p.codigo} value={p.codigo}>
                          {p.bandeira} +{p.codigo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="contact-whatsapp"
                    value={newWhatsapp}
                    onChange={(e) => {
                      let raw = e.target.value.replace(/[\s\-\(\)\+]/g, '').replace(/\D/g, '');
                      if (newCodigoPais === '55') {
                        setNewWhatsapp(formatWhatsapp(raw));
                      } else {
                        setNewWhatsapp(raw);
                      }
                    }}
                    placeholder={newCodigoPais === '55' ? '(00) 00000-0000' : 'Número'}
                    className="flex-1"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>Cancelar</Button>
            <Button onClick={handleAddContact} disabled={createLembrete.isPending || updateLembrete.isPending}>
              {updateLembrete.isPending ? 'Salvando...' : editingContact ? 'Salvar alterações' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TurmasDialog open={turmasOpen} onClose={() => setTurmasOpen(false)} />
    </Layout>
  );
}
