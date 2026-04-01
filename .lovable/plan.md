

# Ordenar Lembretes Ativos por Data de Envio (mais próximo primeiro)

## Problema
Atualmente os lembretes ativos são ordenados por `created_at DESC` (mais recente criado primeiro) via query do Supabase. O usuário quer ver ordenado pela **data de envio** (`data_contato`) do mais próximo ao mais distante — ou seja, ascending.

## Alteração

### `src/pages/ActiveReminders.tsx`
Adicionar `.sort()` no `useMemo` após os filtros, ordenando por `data_contato` ascending (e secundariamente por `hora_envio` ascending):

```ts
.sort((a, b) => {
  const cmp = a.data_contato.localeCompare(b.data_contato);
  if (cmp !== 0) return cmp;
  return a.hora_envio.localeCompare(b.hora_envio);
});
```

Isso garante que o lembrete mais próximo de ser enviado aparece primeiro na lista.

### Arquivo modificado
- `src/pages/ActiveReminders.tsx` — adicionar sort no useMemo

