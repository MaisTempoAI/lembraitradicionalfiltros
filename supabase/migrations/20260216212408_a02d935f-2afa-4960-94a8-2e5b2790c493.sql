
CREATE OR REPLACE FUNCTION lembrai_arquivar_lembrete(p_lembrete_id uuid, p_usuario_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
BEGIN
  -- Support both custom auth (p_usuario_id) and Supabase auth (auth.uid())
  v_uid := COALESCE(p_usuario_id, auth.uid());
  
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE lembrai_lembretes
  SET 
    status = 'arquivado',
    data_arquivamento = NOW()
  WHERE 
    id = p_lembrete_id AND 
    usuario_id = v_uid AND
    status IN ('enviado', 'cancelado', 'erro');
  
  RETURN FOUND;
END;
$$;
