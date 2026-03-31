import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, CalendarDays } from 'lucide-react';
import { Bell, Plus, Moon, Sun, LogOut, Menu, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/ativos', label: 'Ativos' },
  { path: '/finalizados', label: 'Finalizados' },
  { path: '/arquivados', label: 'Arquivados' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-card/90 backdrop-blur-md shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary">
              <Bell className="h-5 w-5" />
              LEMBRA.ai
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-accent/20 text-accent-foreground border border-accent/30 font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="ml-3 border-l pl-3 border-border flex items-center">
                <Link
                  to="/agenda"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/agenda'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  title="Agenda"
                >
                  <CalendarDays className="h-4 w-4" />
                  Agenda
                </Link>
                <Link
                  to="/categorias"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/categorias'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  title="Categorias"
                >
                  <Settings className="h-4 w-4" />
                  Categorias
                </Link>
                <Link
                  to="/contatos"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/contatos'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  title="Contatos"
                >
                  <User className="h-4 w-4" />
                  Contatos
                </Link>
              </div>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDark(!dark)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link to="/novo" className="hidden sm:inline-flex">
              <Button size="sm" className="gap-2 font-semibold">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Lembrete</span>
              </Button>
            </Link>
            <div className="hidden md:flex items-center gap-2 ml-1">
              <Link to="/perfil" className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary uppercase hover:bg-primary/30 transition-colors" title="Meu Perfil">
                {user?.nome?.charAt(0) || 'U'}
              </Link>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => logout()} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card p-4 space-y-2 animate-fade-in">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-border pt-2 mt-2">
              <Link
                to="/agenda"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/agenda'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                Agenda
              </Link>
              <Link
                to="/categorias"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/categorias'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Settings className="h-4 w-4" />
                Categorias
              </Link>
              <Link
                to="/contatos"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/contatos'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <User className="h-4 w-4" />
                Contatos
              </Link>
            </div>
            <Link to="/perfil" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <User className="h-4 w-4" />
              Meu Perfil
            </Link>
            <Link to="/novo" onClick={() => setMobileMenuOpen(false)}>
              <Button size="sm" className="w-full gap-2 font-semibold mt-2">
                <Plus className="h-4 w-4" /> Novo Lembrete
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="w-full gap-2 mt-2" onClick={() => logout()}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        )}
      </header>
      <main className="container py-8 animate-fade-in">{children}</main>
    </div>
  );
}
