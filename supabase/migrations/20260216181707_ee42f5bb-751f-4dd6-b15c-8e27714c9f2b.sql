
-- Add 'clonado' to the status enum
ALTER TYPE public.lembrai_status ADD VALUE IF NOT EXISTS 'clonado';

-- Update the copy function to clone everything exactly
CREATE OR REPLACE FUNCTION public.lembrai_copiar_lembrete(p_lembrete_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_novo_id UUID;
  v_lembrete RECORD;
BEGIN
  SELECT * INTO v_lembrete
  FROM lembrai_lembretes
  WHERE id = p_lembrete_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lembrete não encontrado';
  END IF;
  
  INSERT INTO lembrai_lembretes (
    usuario_id, nome, whatsapp, data_contato, intervalo_dias,
    data_envio_especifica, hora_envio, categoria_id, mensagem, status,
    recorrente, recorrencia_tipo, recorrencia_repeticoes,
    observacoes, anexo_imagem_url, anexo_audio_url, anexo_pdf_url,
    copiado_de
  ) VALUES (
    v_lembrete.usuario_id,
    v_lembrete.nome,
    v_lembrete.whatsapp,
    v_lembrete.data_contato,
    v_lembrete.intervalo_dias,
    v_lembrete.data_envio_especifica,
    v_lembrete.hora_envio,
    v_lembrete.categoria_id,
    v_lembrete.mensagem,
    'clonado',
    v_lembrete.recorrente,
    v_lembrete.recorrencia_tipo,
    v_lembrete.recorrencia_repeticoes,
    v_lembrete.observacoes,
    v_lembrete.anexo_imagem_url,
    v_lembrete.anexo_audio_url,
    v_lembrete.anexo_pdf_url,
    p_lembrete_id
  ) RETURNING id INTO v_novo_id;
  
  RETURN v_novo_id;
END;
$function$;
