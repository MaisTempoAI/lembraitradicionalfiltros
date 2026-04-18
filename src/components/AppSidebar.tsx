import { Bell, LayoutDashboard, Inbox, CheckCircle2, Archive, CalendarDays, Settings, Users, Plus, FileUp, LogOut, Moon, Sun, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { parsePdfVendas } from '@/lib/pdf-parser';
import { toast } from 'sonner';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, end: true },
  { title: 'Ativos', url: '/ativos', icon: Inbox },
  { title: 'Finalizados', url: '/finalizados', icon: CheckCircle2 },
  { title: 'Arquivados', url: '/arquivados', icon: Archive },
];

const gestaoItems = [
  { title: 'Agenda', url: '/agenda', icon: CalendarDays },
  { title: 'Categorias', url: '/categorias', icon: Settings },
  { title: 'Contatos', url: '/contatos', icon: Users },
];

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Selecione um arquivo PDF.');
      return;
    }
    setImporting(true);
    try {
      const clientes = await parsePdfVendas(file);
      if (clientes.length === 0) {
        toast.error('Nenhum cliente encontrado no PDF.');
        return;
      }
      toast.success(`${clientes.length} clientes encontrados!`);
      navigate('/importar-pdf', { state: { clientes } });
    } catch (err) {
      toast.error('Erro ao processar PDF.');
      console.error(err);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const linkBase = 'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors';
  const linkInactive = 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';
  const linkActive = 'bg-sidebar-accent text-sidebar-accent-foreground font-medium';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border h-14 px-3 flex items-center justify-center">
        <NavLink to="/" className="flex items-center gap-2 text-sidebar-foreground font-bold">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground shrink-0">
            <Bell className="h-4 w-4" />
          </div>
          {!collapsed && <span className="text-base tracking-tight">LEMBRA.ai</span>}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink to={item.url} end={item.end} className={linkBase + ' ' + linkInactive} activeClassName={linkActive}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Gestão</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {gestaoItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink to={item.url} className={linkBase + ' ' + linkInactive} activeClassName={linkActive}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Ações</SidebarGroupLabel>}
          <SidebarGroupContent className="space-y-1">
            <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfImport} />
            <NavLink to="/novo" className={linkBase + ' ' + 'bg-primary text-primary-foreground hover:bg-primary/90 font-medium'}>
              <Plus className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Novo Lembrete</span>}
            </NavLink>
            <button
              onClick={() => pdfInputRef.current?.click()}
              disabled={importing}
              className={linkBase + ' ' + linkInactive + ' w-full disabled:opacity-50'}
            >
              <FileUp className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{importing ? 'Processando...' : 'Importar PDF'}</span>}
            </button>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Meu Perfil">
              <NavLink to="/perfil" className={linkBase + ' ' + linkInactive} activeClassName={linkActive}>
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary uppercase shrink-0">
                  {user?.nome?.charAt(0) || 'U'}
                </div>
                {!collapsed && <span className="truncate">{user?.nome || 'Perfil'}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={dark ? 'Modo claro' : 'Modo escuro'} onClick={() => setDark(!dark)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {!collapsed && <span>{dark ? 'Modo claro' : 'Modo escuro'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sair" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
