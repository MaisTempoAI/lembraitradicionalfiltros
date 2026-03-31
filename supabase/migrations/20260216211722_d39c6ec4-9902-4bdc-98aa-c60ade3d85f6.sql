CREATE OR REPLACE FUNCTION lembrai_arquivar_lembrete(p_lembrete_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lembrai_lembretes
  SET 
    status = 'arquivado',
    data_arquivamento = NOW()
  WHERE 
    id = p_lembrete_id AND 
    usuario_id = auth.uid() AND
    status IN ('enviado', 'cancelado', 'erro');
  
  RETURN FOUND;
END;
$$;