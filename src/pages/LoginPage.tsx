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

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* LADO ESQUERDO — Brand */}
      <aside className="bg-primary text-primary-foreground md:w-1/2 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary-foreground/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-primary-foreground/5 blur-3xl" />

        <div className="hidden md:block" />

        <div className="relative flex flex-col items-center md:items-start gap-4 md:gap-6 py-6 md:py-0">
          <div className="inline-flex items-center justify-center h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm">
            <Bell className="h-8 w-8 md:h-10 md:w-10" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">LEMBRA.ai</h1>
            <p className="mt-2 text-sm md:text-lg text-primary-foreground/80 max-w-sm">
              Lembretes inteligentes via WhatsApp para seus clientes.
            </p>
          </div>
        </div>

        <div className="hidden md:block relative text-xs text-primary-foreground/60">
          © {year} LEMBRA.ai — Todos os direitos reservados.
        </div>
      </aside>

      {/* LADO DIREITO — Form */}
      <main className="flex-1 bg-muted flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              {isSignup ? 'Criar conta' : 'Login'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignup ? 'Preencha os dados para começar.' : 'Acesse sua conta para continuar.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-card border p-6 shadow-sm">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome"
                  className="h-11"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                inputMode="numeric"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                placeholder="19971197988"
                className="h-11"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold gap-2" disabled={loading}>
              {isSignup ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {loading ? (isSignup ? 'Criando...' : 'Entrando...') : (isSignup ? 'Criar Conta' : 'Entrar')}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => setIsSignup(!isSignup)}
            >
              {isSignup ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
            </Button>
          </form>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="md:hidden">© {year} LEMBRA.ai</span>
            <span className="ml-auto">v1.0</span>
          </div>
        </div>
      </main>
    </div>
  );
}
