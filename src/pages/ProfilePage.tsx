import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { User, Lock, MessageSquare, Loader2, Pencil, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Tab = 'dados' | 'senha' | 'whatsapp';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dados');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loadingSenha, setLoadingSenha] = useState(false);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState(false);
  const [newQuepasakey, setNewQuepasakey] = useState('');
  const [loadingKey, setLoadingKey] = useState(false);

  const hasQuepasakey = !!user?.quepasakey;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dados', label: 'Dados da Conta', icon: <User className="h-4 w-4" /> },
    { key: 'senha', label: 'Alterar Senha', icon: <Lock className="h-4 w-4" /> },
    { key: 'whatsapp', label: hasQuepasakey ? 'Reconectar WhatsApp' : 'Conectar WhatsApp', icon: <MessageSquare className="h-4 w-4" /> },
  ];

  const handleAlterarSenha = async () => {
    if (!novaSenha || !senhaAtual) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    if (novaSenha.length < 4) {
      toast({ title: 'A nova senha deve ter pelo menos 4 caracteres', variant: 'destructive' });
      return;
    }

    setLoadingSenha(true);
    try {
      const { data, error } = await supabase.rpc('lembrai_alterar_senha', {
        p_usuario_id: user!.id,
        p_senha_antiga: senhaAtual,
        p_senha_nova: novaSenha,
      } as any);

      if (error) throw error;
      if (!data) {
        toast({ title: 'Senha atual incorreta', variant: 'destructive' });
        return;
      }

      toast({ title: 'Senha alterada com sucesso!' });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao alterar senha', variant: 'destructive' });
    } finally {
      setLoadingSenha(false);
    }
  };

  const handleSalvarChave = async () => {
    setLoadingKey(true);
    try {
      const { error } = await supabase
        .from('lembrai_usuarios')
        .update({ quepasakey: newQuepasakey || null })
        .eq('id', user!.id);
      if (error) throw error;
      await refreshUser();
      toast({ title: 'Chave atualizada com sucesso!' });
      setEditingKey(false);
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao salvar chave', variant: 'destructive' });
    } finally {
      setLoadingKey(false);
    }
  };

  const handleConectarWhatsApp = async () => {
    setLoadingWhatsApp(true);
    setQrData(null);
    setQrDialogOpen(true);

    try {
      const response = await supabase.functions.invoke('quepasa-connect', {
        body: { userId: user!.id },
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data?.qrcode) {
        setQrData(data.qrcode);
        await refreshUser();
      } else {
        toast({ title: 'Não foi possível gerar o QR Code', variant: 'destructive' });
        setQrDialogOpen(false);
      }
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao conectar WhatsApp', variant: 'destructive' });
      setQrDialogOpen(false);
    } finally {
      setLoadingWhatsApp(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

        {/* Tabs / Submenu */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dados da Conta */}
        {activeTab === 'dados' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Dados da Conta
              </CardTitle>
              <CardDescription>Informações do seu cadastro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs">Nome</Label>
                <p className="text-foreground font-medium">{user?.nome}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">WhatsApp</Label>
                <p className="text-foreground font-medium">{user?.whatsapp}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Chave Quepasa</Label>
                {editingKey ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={newQuepasakey}
                      onChange={(e) => setNewQuepasakey(e.target.value)}
                      placeholder="Cole a chave aqui"
                      className="font-mono text-sm"
                    />
                    <Button size="icon" onClick={handleSalvarChave} disabled={loadingKey}>
                      {loadingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingKey(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-medium font-mono">
                      {user?.quepasakey || <span className="text-muted-foreground italic">Não conectado</span>}
                    </p>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setNewQuepasakey(user?.quepasakey || ''); setEditingKey(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alterar Senha */}
        {activeTab === 'senha' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha atual</Label>
                <Input
                  id="senhaAtual"
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Digite sua senha atual"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite a nova senha"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Confirme a nova senha"
                />
              </div>
              <Button onClick={handleAlterarSenha} disabled={loadingSenha} className="w-full sm:w-auto">
                {loadingSenha && <Loader2 className="h-4 w-4 animate-spin" />}
                Alterar Senha
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Conexão WhatsApp */}
        {activeTab === 'whatsapp' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                Conexão WhatsApp
              </CardTitle>
              <CardDescription>
                {hasQuepasakey
                  ? 'Seu WhatsApp está conectado. Reconecte se necessário.'
                  : 'Conecte seu WhatsApp para enviar lembretes automaticamente.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasQuepasakey && (
                <div>
                  <Label className="text-muted-foreground text-xs">Chave atual</Label>
                  <p className="text-foreground font-medium font-mono">{user?.quepasakey}</p>
                </div>
              )}
              <Button
                onClick={handleConectarWhatsApp}
                variant={hasQuepasakey ? 'outline' : 'default'}
                disabled={loadingWhatsApp}
              >
                {loadingWhatsApp && <Loader2 className="h-4 w-4 animate-spin" />}
                {hasQuepasakey ? 'Reconecte seu WhatsApp' : 'Conecte seu WhatsApp'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no seu celular, vá em Dispositivos Conectados e escaneie o código abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            {loadingWhatsApp ? (
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            ) : qrData ? (
              <img src={qrData} alt="QR Code WhatsApp" className="w-64 h-64 rounded-lg" />
            ) : (
              <p className="text-muted-foreground">Erro ao gerar QR Code</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
