
-- Dropar funcoes antigas com assinatura de email
DROP FUNCTION IF EXISTS public.lembrai_login(text, text);
DROP FUNCTION IF EXISTS public.lembrai_registrar_usuario(text, text, text);

-- Recriar funcao de login usando whatsapp
CREATE OR REPLACE FUNCTION public.lembrai_login(p_whatsapp text, p_senha text)
 RETURNS TABLE(id uuid, whatsapp text, nome text, avatar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_usuario RECORD;
BEGIN
  SELECT u.* INTO v_usuario
  FROM lembrai_usuarios u
  WHERE u.whatsapp = TRIM(p_whatsapp)
    AND u.ativo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WhatsApp ou senha inválidos';
  END IF;

  IF v_usuario.senha_hash != crypt(p_senha, v_usuario.senha_hash) THEN
    RAISE EXCEPTION 'WhatsApp ou senha inválidos';
  END IF;

  UPDATE lembrai_usuarios
  SET ultimo_login = NOW()
  WHERE lembrai_usuarios.id = v_usuario.id;

  RETURN QUERY
  SELECT 
    v_usuario.id,
    v_usuario.whatsapp,
    v_usuario.nome,
    v_usuario.avatar_url;
END;
$function$;

-- Recriar funcao de registro usando whatsapp
CREATE OR REPLACE FUNCTION public.lembrai_registrar_usuario(p_whatsapp text, p_senha text, p_nome text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_usuario_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM lembrai_usuarios WHERE whatsapp = TRIM(p_whatsapp)) THEN
    RAISE EXCEPTION 'WhatsApp já cadastrado';
  END IF;

  INSERT INTO lembrai_usuarios (whatsapp, senha_hash, nome, email)
  VALUES (
    TRIM(p_whatsapp),
    crypt(p_senha, gen_salt('bf', 10)),
    TRIM(p_nome),
    NULL
  )
  RETURNING id INTO v_usuario_id;

  INSERT INTO lembrai_categorias (usuario_id, nome, cor, icone) VALUES
    (v_usuario_id, 'SERVIÇO', '#7C3AED', '🔧'),
    (v_usuario_id, 'VISITA', '#10B981', '🏠'),
    (v_usuario_id, 'MANUTENÇÃO', '#F59E0B', '⚙️');

  RETURN v_usuario_id;
END;
$function$;
