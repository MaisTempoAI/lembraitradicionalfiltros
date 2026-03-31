import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isSignup) {
      if (!displayName.trim()) {
        toast.error('Informe seu nome.');
        setLoading(false);
        return;
      }
      const { error } = await signup(whatsapp, password, displayName);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Conta criada! Faça login para continuar.');
        setIsSignup(false);
      }
    } else {
      const { error } = await login(whatsapp, password);
      if (error) {
        toast.error('Credenciais inválidas. Tente novamente.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-info/15 text-primary mx-auto">
            <Bell className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">LEMBRA.ai</h1>
          <p className="text-muted-foreground">{isSignup ? 'Crie sua conta' : 'Faça login para continuar'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-card border p-6 shadow-sm">
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome" className="h-12 border-2" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" type="tel" inputMode="numeric" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))} placeholder="19971197988" className="h-12 border-2" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" className="h-12 border-2" />
          </div>
          <Button type="submit" className="w-full h-12 font-semibold gap-2" disabled={loading}>
            {isSignup ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {loading ? (isSignup ? 'Criando...' : 'Entrando...') : (isSignup ? 'Criar Conta' : 'Entrar')}
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </Button>
        </form>
      </div>
    </div>
  );
}
