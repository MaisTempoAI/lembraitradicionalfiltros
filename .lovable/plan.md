# Fix Importação de PDF — Suporte aos 2 layouts + UX robusta

## Diagnóstico

Testando `Lista_Jan.26_-_Filtros.pdf` no parser atual:

- `parsePdfVendas` encontra **70 clientes** corretamente (regex de `Contato:` funciona nos dois layouts).
- Mas o pdf.js extrai o texto numa **ordem de colunas diferente** do PDF antigo. Compare:

```text
# Layout ANTIGO (OUT.25) — código ANTES da descrição
699  REFIL HF ELX PE12 PURE  1,00  37,50  90,00  52,50  139,99

# Layout NOVO (Jan.26) — código DEPOIS da descrição, no meio dos números
REFIL IBBL C+5   1,00   42,84   98,00   128,73 650   55,16
VELA TRADICIONAL 3,00   21,82   37,11   70,08 3   15,29
```

O regex atual exige `CODIGO + DESCRIÇÃO + 4 números` (layout antigo), então no PDF novo **nenhum item é extraído** e tudo cai no fallback `'refil'`.

Além disso, "carrega, trava e volta pra tela principal" tem causa adicional:
- Qualquer navegação direta a `/importar-pdf` (sidebar, F5, back/forward) cai no `useEffect` que faz `navigate('/')` quando `location.state` está vazio. O usuário vê toast "Nenhum dado de PDF encontrado" e é jogado pra home.

## Solução

### 1. `src/lib/pdf-parser.ts` — aceitar AMBOS os layouts

Manter o regex antigo e adicionar um segundo regex pro layout novo. Rodar os dois sobre o bloco do cliente, somar resultados e deduplicar.

```ts
// Layout 1 (antigo): CÓDIGO  DESCRIÇÃO  num num num num
const reCodigoAntes = /(\d{1,4})\s+((?:REFIL|VELA|ELEMENTO|CB\d|REFILHF)[A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇÜa-záéíóúâêôãõçü\s\.\-\+\/"'\(\)]*?)(?:\s+\d+[\.,]\d+){4}/g;

// Layout 2 (novo): DESCRIÇÃO  num num num num CÓDIGO  num
//   capturamos apenas a descrição; ignoramos código que aparece entre números
const reCodigoDepois = /\b((?:REFIL|VELA|ELEMENTO|CB\d|REFILHF)[A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇÜa-záéíóúâêôãõçü\s\.\-\+\/"'\(\)]{2,60}?)\s+\d+[,.]\d+\s+\d+[,.]\d+\s+\d+[,.]\d+\s+\d+[,.]\d+\s+\d{1,4}\s+\d+[,.]\d+/g;
```

Lógica:
1. Para cada bloco de cliente, aplicar **os dois regex**.
2. Normalizar descrição (`trim`, colapsar espaços, remover lixo final tipo "1,00").
3. Deduplicar via `Set` mantendo ordem.
4. Fallback `'refil'` se nenhum dos dois bater.

### 2. `src/pages/ImportPdfPage.tsx` — página auto-suficiente

Hoje a página depende de `location.state.clientes`. Se vazio → bounce pra `/`. Mudar pra:

- **Sem dados**: renderizar um **card de upload** com `<input type="file" accept=".pdf">`, ícone, texto explicativo e botão "Selecionar PDF". Durante o parse, mostrar `Loader2` + texto "Lendo PDF... pode levar alguns segundos".
- **Com dados** (vindos de `location.state` OU do upload local): UI atual de configuração + lista.
- Em caso de erro de parsing, **permanecer na página** com mensagem específica + botão "Tentar outro arquivo". Sem redirect.
- **Remover** o `useEffect` que faz `navigate('/')` quando vazio.

### 3. `src/components/AppSidebar.tsx` — simplificar

- Trocar o botão "Importar PDF" por um **`<NavLink to="/importar-pdf">`** simples.
- Remover `pdfInputRef`, `handlePdfImport`, `importing` e o `<input>` escondido (toda a lógica vai pra `ImportPdfPage`).

### 4. `src/pages/Index.tsx` — limpar

- Remover botão/handler de PDF do dashboard (`pdfInputRef`, `handlePdfImport`, `importingPdf` e imports `parsePdfVendas`/`FileUp`/`Loader2` se ficarem sem uso). Fluxo único: sidebar → `/importar-pdf`.

### Fluxo final

```text
Sidebar "Importar PDF"  ─►  /importar-pdf
                              │
                              ├─ sem state  ──►  Card de upload  ─►  parsePdfVendas (loader)
                              │                                          │
                              │                                          ▼
                              └─ com state  ──►  Configurações + Lista de clientes
```

Ambos os formatos de PDF (OUT.25 e Jan.26) caem no mesmo parser, que cobre os 2 layouts.

## Arquivos modificados
- `src/lib/pdf-parser.ts` — adicionar regex pro layout "código depois", deduplicar itens
- `src/pages/ImportPdfPage.tsx` — adicionar UI de upload + remover redirect
- `src/components/AppSidebar.tsx` — virar link simples
- `src/pages/Index.tsx` — remover botão/handler de PDF
