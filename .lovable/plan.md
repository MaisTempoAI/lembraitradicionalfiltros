
# Nova Tela de Login — Layout Dividido

## Mudanças em `src/pages/LoginPage.tsx`

Transformar o layout atual (centralizado) em um split-screen de 2 colunas, inspirado no mockup ERPOS mas usando a identidade visual do LEMBRA.ai.

### Estrutura

```text
┌─────────────────────┬─────────────────────┐
│                     │                     │
│   LADO ESQUERDO     │   LADO DIREITO      │
│   (bg primary roxo) │   (bg muted claro)  │
│                     │                     │
│   [LOGO LEMBRA.ai]  │   Login             │
│                     │   ┌──────────────┐  │
│                     │   │ WhatsApp     │  │
│                     │   │ [input]      │  │
│                     │   │ Senha        │  │
│                     │   │ [input]      │  │
│                     │   │ [Entrar]     │  │
│                     │   └──────────────┘  │
│                     │                     │
│   © LEMBRA.ai 2026  │   v1.0              │
└─────────────────────┴─────────────────────┘
```

### Detalhes visuais

- **Esquerda (50%)**: Fundo `bg-primary` (roxo escuro #474150 da identidade do projeto, NÃO laranja). Logo grande centralizado verticalmente com ícone `Bell` + texto "LEMBRA.ai" em branco. Footer com copyright em opacity reduzida.
- **Direita (50%)**: Fundo `bg-muted` (off-white). Card branco centralizado com título "Login", inputs (WhatsApp, Senha), botão "Entrar" full-width, link "Não tem conta? Cadastre-se" abaixo. Versão "v1.0" no rodapé.
- **Mobile (<md)**: Empilhado — header compacto roxo no topo com logo, formulário ocupa o resto da tela.

### Logo
Verificar se há logo em `src/assets/` ou `public/`. Se não houver imagem, usar o ícone `Bell` (lucide) + texto "LEMBRA.ai" como já está hoje, em tamanho grande (text-5xl).

### Manter funcionalidades
- Toggle login/signup (campo Nome aparece quando signup)
- Validações e toasts existentes
- Mesma lógica de `useAuth`

### Arquivo modificado
- `src/pages/LoginPage.tsx` — reescrever layout para split-screen
