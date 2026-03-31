

# Melhorias na Tela de Importar PDF

## Problemas Identificados
1. **Scroll quebrado** — A página usa `ScrollArea` com `max-h-[500px]` mas o container pai não permite scroll da página inteira
2. **DDD faltando** — Telefones com 9 dígitos (ex: 980778772) precisam receber DDD "19" na frente
3. **"Dias até envio"** — Deve ser 0 por padrão e ficar oculto na interface
4. **"Item não identificado"** — Quando o parser não encontra item, deve usar "refil" em vez de "Item não identificado"

## Alterações

### 1. Fix do Scroll (`ImportPdfPage.tsx`)
- Remover o `ScrollArea` com `max-h-[500px]` da lista de clientes — deixar a lista renderizar naturalmente e a página inteira rolar via scroll do browser (o `Layout` já permite isso com `min-h-screen`)

### 2. DDD padrão 19 (`pdf-parser.ts`)
- Na função `normalizarTelefone`, quando o número tem 8-9 dígitos (sem DDD), adicionar "19" antes
- Fluxo: 9 dígitos → adiciona "19" → fica 11 dígitos → adiciona "55" → resultado: 5519980778772

### 3. Ocultar "Dias até envio" (`ImportPdfPage.tsx`)
- Mudar `intervaloDias` default de 180 para 0
- Remover o campo "Dias até envio" do grid de configurações (mantém o state por baixo)

### 4. Fallback de item para "refil" (`pdf-parser.ts`)
- Trocar `'Item não identificado'` por `'refil'` na linha 92
- Isso faz com que o template gere "O refil do seu filtro está no prazo de troca" automaticamente

### Arquivos modificados
- `src/pages/ImportPdfPage.tsx` — scroll fix, ocultar campo dias, default 0
- `src/lib/pdf-parser.ts` — DDD 19 padrão, fallback "refil"

