import { useState } from 'react';
import { useCategorias } from '@/hooks/useLembretes';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import EmojiPicker from '@/components/EmojiPicker';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface CatForm {
  nome: string;
  icone: string;
  cor: string;
  template_mensagem: string;
}

export default function CategoriesPage() {
  const { data: categorias = [], isLoading } = useCategorias();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CatForm>({ nome: '', icone: '📋', cor: '#7C3AED', template_mensagem: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [templateAtivo, setTemplateAtivo] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm({ nome: '', icone: '📋', cor: '#7C3AED', template_mensagem: '' });
    setTemplateAtivo(false);
    setDialogOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditingId(cat.id);
    setForm({ nome: cat.nome, icone: cat.icone, cor: cat.cor, template_mensagem: cat.template_mensagem || '' });
    setTemplateAtivo(!!cat.template_mensagem);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.nome.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('lembrai_categorias')
          .update({ nome: form.nome.trim().toUpperCase(), icone: form.icone, cor: form.cor, template_mensagem: templateAtivo ? form.template_mensagem || null : null })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Categoria atualizada!');
      } else {
        const { error } = await supabase
          .from('lembrai_categorias')
          .insert({ usuario_id: user.id, nome: form.nome.trim().toUpperCase(), icone: form.icone, cor: form.cor, template_mensagem: templateAtivo ? form.template_mensagem || null : null });
        if (error) throw error;
        toast.success('Categoria criada!');
      }
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      setDialogOpen(false);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('lembrai_categorias').delete().eq('id', deleteId);
    if (error) {
      toast.error('Erro ao deletar: ' + error.message);
    } else {
      toast.success('Categoria deletada!');
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
    }
    setDeleteId(null);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Categorias</h1>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Categoria
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : categorias.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma categoria cadastrada.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {categorias.map((cat) => (
              <Card key={cat.id} style={{ borderLeft: `4px solid ${cat.cor}`, backgroundColor: `${cat.cor}0A` }}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: cat.cor + '25' }}
                    >
                      {cat.icone}
                    </div>
                    <div>
                      <p className="font-semibold">{cat.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: cat.cor }} />
                        <span className="text-xs text-muted-foreground">{cat.cor}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(cat.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: MANUTENÇÃO" className="h-12 border-2" />
            </div>
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label>Ícone</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.icone}
                    onChange={(e) => setForm({ ...form, icone: e.target.value })}
                    placeholder="📋"
                    className="h-12 border-2 text-center text-xl flex-1"
                    maxLength={4}
                  />
                  <EmojiPicker value={form.icone} onChange={(emoji) => setForm({ ...form, icone: emoji })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-12 w-16 border-2 cursor-pointer" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="template-switch">Template de mensagem</Label>
                <Switch
                  id="template-switch"
                  checked={templateAtivo}
                  onCheckedChange={(checked) => {
                    setTemplateAtivo(checked);
                    if (!checked) setForm({ ...form, template_mensagem: '' });
                  }}
                />
              </div>
              {templateAtivo && (
                <Textarea
                  value={form.template_mensagem}
                  onChange={(e) => setForm({ ...form, template_mensagem: e.target.value })}
                  placeholder="Digite a mensagem padrão para esta categoria..."
                  className="min-h-[100px] border-2"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button disabled={saving || !form.nome.trim()} onClick={handleSave}>
              {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Lembretes com esta categoria não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
