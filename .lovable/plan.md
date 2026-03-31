

# Editar Chave Quepasa na aba "Dados da Conta"

## Contexto

A chave Quepasa e guardada na tabela `lembrai_usuarios` (coluna `quepasakey`). Quando um lembrete e criado, ele NAO salva a quepasakey no lembrete -- o sistema de envio busca a chave do usuario na hora de enviar. Isso ja esta correto e nao precisa mudar.

O que falta e permitir ao usuario editar manualmente a chave na aba "Dados da Conta" do perfil.

## Mudancas

### Arquivo: `src/pages/ProfilePage.tsx`

1. **Novos estados**: `editingKey` (boolean), `newQuepasakey` (string), `loadingKey` (boolean)

2. **Funcao `handleSalvarChave`**: Faz update na tabela `lembrai_usuarios` setando `quepasakey = newQuepasakey` onde `id = user.id`. Depois chama `refreshUser()` para atualizar o contexto.

3. **UI na secao "Chave Quepasa"**: Substituir o texto estatico por um layout com botao "Editar" (icone de lapis). Ao clicar:
   - Mostra um Input preenchido com a chave atual
   - Botoes "Salvar" e "Cancelar"
   - Ao salvar, faz o update no banco e fecha o modo edicao

## Sobre os lembretes

Os lembretes NAO armazenam a quepasakey individualmente. A tabela `lembrai_lembretes` nao tem coluna de quepasakey. O sistema de envio (externo) busca a chave do usuario pela tabela `lembrai_usuarios` na hora de enviar. Portanto, ao alterar a chave no perfil, todos os lembretes futuros ja usarao a nova chave automaticamente. Nao ha necessidade de mudanca no fluxo de criacao de lembretes.

