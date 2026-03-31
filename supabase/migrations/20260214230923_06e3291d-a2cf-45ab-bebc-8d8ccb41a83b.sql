-- Remover constraint legada de email
ALTER TABLE lembrai_usuarios DROP CONSTRAINT IF EXISTS email_valido;

-- Corrigir registro legado que tem email no campo whatsapp
UPDATE lembrai_usuarios 
SET whatsapp = '00000000000' 
WHERE whatsapp !~ '^\d{10,15}$';

-- Adicionar nova constraint para telefone
ALTER TABLE lembrai_usuarios ADD CONSTRAINT whatsapp_valido
  CHECK (whatsapp ~ '^\d{10,15}$');