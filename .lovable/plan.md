

# Melhorias na Importação de PDF — 3 funcionalidades

## 1. Badges de distribuição clicáveis com popup de edição (data + hora)

Cada badge da "Distribuição de Envios" se torna clicável. Ao clicar, abre um Popover com:
- Um input `type="date"` para alterar a data do lote
- Botões com os 3 horários fixos (10:10, 13:13, 17:17) para alterar a hora

A exibição das datas muda de `2026-04-02` para `02/04/2026` (formato dd/MM/yyyy).

Para isso, a agenda deixa de ser derivada automaticamente e passa a ser editável: o state armazena overrides por slot. Ao editar um slot, todos os lembretes daquele grupo são atualizados.

**Implementação**: Transformar `agendaResumo` em state editável. Cada badge vira um `Popover` com `Calendar` (do shadcn) + seletor de hora. Ao confirmar, atualiza a agenda correspondente.

## 2. Usar apenas primeiro nome na variável [NOME]

Na função `gerarMensagem`, ao substituir `[NOME]`, pegar apenas o primeiro token do nome (split por espaço, posição 0).

Exemplo: "AFONSO COSTA JUNIOR" → "AFONSO"

## 3. Detecção de contatos já existentes ao reimportar

Na função `handleImportarContatos`, antes de inserir, consultar quais WhatsApp já existem na tabela `lembrai_lembretes` com `status = 'contato'` do mesmo usuário. Mostrar contagem de "já existentes" e só inserir os novos.

Badge atualizada: `✓ 63 contatos importados · ♥ 12 já existiam`

Adicionar state `contatosExistentes` para exibir essa informação.

---

### Arquivos modificados
- `src/pages/ImportPdfPage.tsx` — todas as 3 alterações

### Detalhes técnicos

**Agenda editável**: Manter um state `agendaOverrides` como `Map<number, {data: string, hora: string}>` indexado pelo índice do slot no resumo. A agenda base é gerada automaticamente, mas os overrides aplicam-se por grupo.

**Formato de data**: Função helper `formatarDataBR(iso: string)` que converte `2026-04-02` → `02/04/2026`.

**Primeiro nome**: `cliente.nome.split(' ')[0]` na substituição de `[NOME]`.

**Verificação de existentes**: Query `supabase.from('lembrai_lembretes').select('whatsapp').eq('usuario_id', user.id).eq('status', 'contato').in('whatsapp', phones)` antes do loop de inserção.

