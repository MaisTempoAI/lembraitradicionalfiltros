# Ignorar telefones fixos na importação de PDF

## Problema

No PDF `VENDA_REFIL_FEV-MAR.26.pdf` há 5 contatos com telefone fixo de 8 dígitos
(ex.: `3935.9377`, `3875.7555`, `2660.0630`, `3825.8801/8812`). Hoje o parser
adiciona DDD 19 e gera `1939359377`, um número sem WhatsApp — o envio falharia.

## Solução

### 1. `src/lib/pdf-parser.ts`

- Ao normalizar, detectar celular: número com 9 dígitos começando em `9` (ou 11 dígitos
  com o 9 após o DDD). Números de 8 dígitos, ou de 9/10 dígitos cujo primeiro dígito do
  assinante seja 2–5, são **fixos**.
- Adicionar campo `telefoneFixo: boolean` em `ClientePdf`.
- Quando for fixo: manter o número visível (para o usuário poder corrigir manualmente),
  marcar `telefoneFixo: true` e `selecionado: false`.
- Caso `3825.8801/8812`: continua pegando apenas o primeiro número; como é fixo, fica
  desmarcado de qualquer forma.

### 2. `src/pages/ImportPdfPage.tsx`

- Na lista, exibir badge **"Fixo — sem WhatsApp"** (tom de alerta) no lugar do check,
  igual ao tratamento de "sem telefone".
- Resumo do topo passa a mostrar: `X encontrados · Y selecionados · Z sem telefone · W fixos`.
- Botão **Importar Contatos** e a geração de lembretes ignoram os fixos (já ficam
  desmarcados; garantir também no filtro para não entrarem em nenhum lote).
- Se o usuário editar o número de um fixo para um celular válido, o item volta a ser
  selecionável normalmente.

## Arquivos modificados
- `src/lib/pdf-parser.ts`
- `src/pages/ImportPdfPage.tsx`
