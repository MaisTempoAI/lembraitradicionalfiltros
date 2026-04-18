
# Refatoração UX — Sidebar Lateral + Layout Compacto

## Objetivo
Substituir o menu top-nav atual por uma sidebar lateral colapsível (estilo Taskplus), reduzir tamanhos de cards/espaçamentos e aplicar consistentemente em dark e light em TODAS as telas do sistema.

## Mudanças

### 1. Novo `AppSidebar` lateral (substitui top-nav do `Layout.tsx`)

Sidebar colapsível usando o componente shadcn `Sidebar` (`collapsible="icon"`).

**Estrutura** (inspirada na referência Taskplus):
```text
┌──────────────────┐
│ 🔔 LEMBRA.ai     │ ← Logo + nome (esconde em colapso)
├──────────────────┤
│ NAVEGAÇÃO        │
│ ▢ Dashboard      │
│ ▢ Ativos         │
│ ▢ Finalizados    │
│ ▢ Arquivados     │
│                  │
│ GESTÃO           │
│ 📅 Agenda        │
│ ⚙️ Categorias    │
│ 👤 Contatos      │
├──────────────────┤
│ + Novo Lembrete  │ ← CTA destacado
│ 📥 Importar PDF  │
├──────────────────┤
│ 🌓 Tema  👤 Sair │ ← Footer
└──────────────────┘
```

- **Largura**: `w-60` expandida, `w-14` colapsada (mini icon).
- **Rota ativa**: usar `NavLink` com `activeClassName="bg-sidebar-accent text-primary font-medium"`.
- **Trigger** (`SidebarTrigger`) sempre visível no header da página.
- **Mobile**: vira off-canvas (Sheet) — comportamento padrão do shadcn sidebar.

### 2. `Layout.tsx` reescrito

```tsx
<SidebarProvider>
  <div className="min-h-screen flex w-full">
    <AppSidebar />
    <div className="flex-1 flex flex-col">
      <header className="h-12 flex items-center justify-between border-b px-4">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  </div>
</SidebarProvider>
```

### 3. Compactação visual global

Aplicar em todas as páginas (Dashboard, Ativos, Finalizados, Arquivados, Agenda, Categorias, Contatos, Novo Lembrete, etc.):

| Elemento | Antes | Depois |
|---|---|---|
| StatsCard padding | `p-6` | `p-4` |
| StatsCard valor | `text-3xl` | `text-2xl` |
| StatsCard ícone box | `h-10 w-10` | `h-8 w-8` |
| Page title | `text-4xl` | `text-3xl` |
| Section gap | `space-y-8` | `space-y-6` |
| Card interno | `p-6` | `p-4` |
| Botões padrão | `size="lg"` para CTAs principais | `size="default"` |
| Container main | sem padding controlado | `p-6` |

### 4. Tokens de cor — sidebar em dark/light

Os tokens `--sidebar-*` já existem em `index.css` para os dois temas. Verificar contraste e ajustar se necessário (ex: estado hover/active mais visível no dark).

### 5. Refinamentos no Dashboard (referência da imagem enviada)

- Header: título + filtro de período em uma linha mais compacta.
- Botão "Importar PDF" movido para a sidebar (CTA secundário).
- Botão "Novo Lembrete" movido para a sidebar como CTA primário destacado.
- Grid de stats: manter 5 colunas em desktop mas com cards menores.

## Arquivos modificados

- `src/components/AppSidebar.tsx` — **novo** (sidebar lateral)
- `src/components/Layout.tsx` — reescrito (SidebarProvider + main wrapper)
- `src/components/StatsCard.tsx` — versão compacta (padding/tamanhos menores)
- `src/pages/Index.tsx` (Dashboard) — remover botão Importar PDF do header (agora na sidebar), reduzir título e espaçamentos
- `src/pages/ActiveReminders.tsx` — compactar headers/espaçamentos
- `src/pages/FinishedReminders.tsx` — idem
- `src/pages/ArchivedReminders.tsx` — idem
- `src/pages/AgendaPage.tsx` — idem
- `src/pages/CategoriesPage.tsx` — idem
- `src/pages/ContactsPage.tsx` — idem
- `src/pages/NewReminder.tsx` / `MultipleReminderPage.tsx` / `ImportPdfPage.tsx` / `ImportContactsPage.tsx` — ajuste de header/padding
- `src/index.css` — pequeno ajuste em `--sidebar-accent` no dark se necessário para contraste

## Notas técnicas

- Login (`LoginPage.tsx`) **não é envolvido** pelo `Layout`, então fica intocado.
- Manter rota ativa via `useLocation` + `NavLink` (componente `@/components/NavLink` já existe no projeto).
- Logo do sidebar: ícone `Bell` + texto "LEMBRA.ai" (mesmo padrão atual).
- Persistência do estado colapsado: usar `defaultOpen={true}` do `SidebarProvider` (já cobre cookie automaticamente).
