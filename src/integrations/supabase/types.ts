export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          categoria: Database["public"]["Enums"]["activity_category"]
          completed_at: string | null
          created_at: string
          description: string | null
          frequencia: Database["public"]["Enums"]["activity_frequency"]
          horario: string | null
          id: string
          status: Database["public"]["Enums"]["activity_status"]
          tipo_animacao: Database["public"]["Enums"]["completion_type"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria: Database["public"]["Enums"]["activity_category"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          frequencia: Database["public"]["Enums"]["activity_frequency"]
          horario?: string | null
          id?: string
          status?: Database["public"]["Enums"]["activity_status"]
          tipo_animacao?: Database["public"]["Enums"]["completion_type"]
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["activity_category"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          frequencia?: Database["public"]["Enums"]["activity_frequency"]
          horario?: string | null
          id?: string
          status?: Database["public"]["Enums"]["activity_status"]
          tipo_animacao?: Database["public"]["Enums"]["completion_type"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          cor: string | null
          created_at: string | null
          icone: string | null
          id: string
          nome: string
          padrao: boolean | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome: string
          padrao?: boolean | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome?: string
          padrao?: boolean | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contas: {
        Row: {
          ativa: boolean | null
          cor: string | null
          created_at: string | null
          icone: string | null
          id: string
          nome: string
          saldo: number
          tipo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativa?: boolean | null
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome: string
          saldo?: number
          tipo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativa?: boolean | null
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome?: string
          saldo?: number
          tipo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contatoslapalmaantigo: {
        Row: {
          created_at: string
          id: number
          nome: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          nome?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      daily_progress: {
        Row: {
          concluidas: number
          created_at: string
          date: string
          id: string
          percentual: number
          total: number
          user_id: string
        }
        Insert: {
          concluidas?: number
          created_at?: string
          date: string
          id?: string
          percentual?: number
          total?: number
          user_id: string
        }
        Update: {
          concluidas?: number
          created_at?: string
          date?: string
          id?: string
          percentual?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      frasesbiblicas: {
        Row: {
          created_at: string
          dia: string | null
          frase: string | null
          id: number
          user: string | null
          versiculo: string | null
        }
        Insert: {
          created_at?: string
          dia?: string | null
          frase?: string | null
          id?: number
          user?: string | null
          versiculo?: string | null
        }
        Update: {
          created_at?: string
          dia?: string | null
          frase?: string | null
          id?: number
          user?: string | null
          versiculo?: string | null
        }
        Relationships: []
      }
      "INSTA-BOT-config": {
        Row: {
          botativo: string | null
          contexto: string | null
          created_at: string
          descempresa: string | null
          descprodutos_servicos: string | null
          emojireact: string | null
          endereco: string | null
          exemplos: string | null
          faq: string | null
          horarioatendimento: string | null
          id: number
          idclient: string | null
          N8NFLUX: string | null
          N8NHOK: string | null
          nomeempresa: string | null
          objetivo: string | null
          persona: string | null
          produtos_servicos: string | null
          regras: string | null
          roteiro: string | null
          status: string | null
          substituicoes: string | null
          TOKEN: string | null
        }
        Insert: {
          botativo?: string | null
          contexto?: string | null
          created_at: string
          descempresa?: string | null
          descprodutos_servicos?: string | null
          emojireact?: string | null
          endereco?: string | null
          exemplos?: string | null
          faq?: string | null
          horarioatendimento?: string | null
          id?: number
          idclient?: string | null
          N8NFLUX?: string | null
          N8NHOK?: string | null
          nomeempresa?: string | null
          objetivo?: string | null
          persona?: string | null
          produtos_servicos?: string | null
          regras?: string | null
          roteiro?: string | null
          status?: string | null
          substituicoes?: string | null
          TOKEN?: string | null
        }
        Update: {
          botativo?: string | null
          contexto?: string | null
          created_at?: string
          descempresa?: string | null
          descprodutos_servicos?: string | null
          emojireact?: string | null
          endereco?: string | null
          exemplos?: string | null
          faq?: string | null
          horarioatendimento?: string | null
          id?: number
          idclient?: string | null
          N8NFLUX?: string | null
          N8NHOK?: string | null
          nomeempresa?: string | null
          objetivo?: string | null
          persona?: string | null
          produtos_servicos?: string | null
          regras?: string | null
          roteiro?: string | null
          status?: string | null
          substituicoes?: string | null
          TOKEN?: string | null
        }
        Relationships: []
      }
      "INSTA-BOT-conversation": {
        Row: {
          criadoem: string
          fromme: string | null
          id: number
          idclient: string | null
          login: string | null
          nomecli: string | null
          pergunta: string | null
          resposta: string | null
          username: string | null
        }
        Insert: {
          criadoem: string
          fromme?: string | null
          id?: number
          idclient?: string | null
          login?: string | null
          nomecli?: string | null
          pergunta?: string | null
          resposta?: string | null
          username?: string | null
        }
        Update: {
          criadoem?: string
          fromme?: string | null
          id?: number
          idclient?: string | null
          login?: string | null
          nomecli?: string | null
          pergunta?: string | null
          resposta?: string | null
          username?: string | null
        }
        Relationships: []
      }
      investimentos: {
        Row: {
          created_at: string | null
          data_aplicacao: string
          id: string
          nome: string
          rendimento: number | null
          tipo: string
          updated_at: string | null
          user_id: string
          valor_atual: number | null
          valor_investido: number
        }
        Insert: {
          created_at?: string | null
          data_aplicacao: string
          id?: string
          nome: string
          rendimento?: number | null
          tipo: string
          updated_at?: string | null
          user_id: string
          valor_atual?: number | null
          valor_investido: number
        }
        Update: {
          created_at?: string | null
          data_aplicacao?: string
          id?: string
          nome?: string
          rendimento?: number | null
          tipo?: string
          updated_at?: string | null
          user_id?: string
          valor_atual?: number | null
          valor_investido?: number
        }
        Relationships: []
      }
      lembrai_categorias: {
        Row: {
          cor: string
          created_at: string
          icone: string
          id: string
          nome: string
          template_mensagem: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome: string
          template_mensagem?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome?: string
          template_mensagem?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembrai_categorias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "lembrai_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      lembrai_lembretes: {
        Row: {
          anexo_audio_url: string | null
          anexo_imagem_url: string | null
          anexo_pdf_url: string | null
          categoria_id: string | null
          copiado_de: string | null
          created_at: string
          data_arquivamento: string | null
          data_contato: string
          data_envio_especifica: string | null
          data_envio_realizado: string | null
          hora_envio: string
          id: string
          intervalo_dias: number | null
          mensagem: string
          motivo_erro: string | null
          nome: string
          observacoes: string | null
          recorrencia_pai: string | null
          recorrencia_repeticoes: number | null
          recorrencia_tipo:
            | Database["public"]["Enums"]["lembrai_recorrencia_tipo"]
            | null
          recorrente: boolean
          status: Database["public"]["Enums"]["lembrai_status"]
          updated_at: string
          usuario_id: string
          whatsapp: string
        }
        Insert: {
          anexo_audio_url?: string | null
          anexo_imagem_url?: string | null
          anexo_pdf_url?: string | null
          categoria_id?: string | null
          copiado_de?: string | null
          created_at?: string
          data_arquivamento?: string | null
          data_contato: string
          data_envio_especifica?: string | null
          data_envio_realizado?: string | null
          hora_envio?: string
          id?: string
          intervalo_dias?: number | null
          mensagem: string
          motivo_erro?: string | null
          nome: string
          observacoes?: string | null
          recorrencia_pai?: string | null
          recorrencia_repeticoes?: number | null
          recorrencia_tipo?:
            | Database["public"]["Enums"]["lembrai_recorrencia_tipo"]
            | null
          recorrente?: boolean
          status?: Database["public"]["Enums"]["lembrai_status"]
          updated_at?: string
          usuario_id: string
          whatsapp: string
        }
        Update: {
          anexo_audio_url?: string | null
          anexo_imagem_url?: string | null
          anexo_pdf_url?: string | null
          categoria_id?: string | null
          copiado_de?: string | null
          created_at?: string
          data_arquivamento?: string | null
          data_contato?: string
          data_envio_especifica?: string | null
          data_envio_realizado?: string | null
          hora_envio?: string
          id?: string
          intervalo_dias?: number | null
          mensagem?: string
          motivo_erro?: string | null
          nome?: string
          observacoes?: string | null
          recorrencia_pai?: string | null
          recorrencia_repeticoes?: number | null
          recorrencia_tipo?:
            | Database["public"]["Enums"]["lembrai_recorrencia_tipo"]
            | null
          recorrente?: boolean
          status?: Database["public"]["Enums"]["lembrai_status"]
          updated_at?: string
          usuario_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembrai_lembretes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "lembrai_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembrai_lembretes_copiado_de_fkey"
            columns: ["copiado_de"]
            isOneToOne: false
            referencedRelation: "lembrai_lembretes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembrai_lembretes_recorrencia_pai_fkey"
            columns: ["recorrencia_pai"]
            isOneToOne: false
            referencedRelation: "lembrai_lembretes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembrai_lembretes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "lembrai_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      lembrai_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lembrai_turma_membros: {
        Row: {
          created_at: string
          id: string
          nome: string
          turma_id: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          turma_id: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          turma_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembrai_turma_membros_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "lembrai_turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      lembrai_turmas: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      lembrai_usuarios: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          created_at: string
          email: string | null
          email_valido: string | null
          id: string
          nome: string
          quepasakey: string | null
          senha_hash: string
          ultimo_login: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_valido?: string | null
          id?: string
          nome: string
          quepasakey?: string | null
          senha_hash: string
          ultimo_login?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_valido?: string | null
          id?: string
          nome?: string
          quepasakey?: string | null
          senha_hash?: string
          ultimo_login?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      metas: {
        Row: {
          categoria: string | null
          concluida: boolean | null
          created_at: string | null
          data_alvo: string | null
          data_inicio: string | null
          id: string
          id_categoria: string | null
          nome: string
          updated_at: string | null
          user_id: string
          valor_alvo: number
          valor_atual: number | null
        }
        Insert: {
          categoria?: string | null
          concluida?: boolean | null
          created_at?: string | null
          data_alvo?: string | null
          data_inicio?: string | null
          id?: string
          id_categoria?: string | null
          nome: string
          updated_at?: string | null
          user_id: string
          valor_alvo: number
          valor_atual?: number | null
        }
        Update: {
          categoria?: string | null
          concluida?: boolean | null
          created_at?: string | null
          data_alvo?: string | null
          data_inicio?: string | null
          id?: string
          id_categoria?: string | null
          nome?: string
          updated_at?: string | null
          user_id?: string
          valor_alvo?: number
          valor_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      modoaovivo: {
        Row: {
          created_at: string
          data: string | null
          id: number
          idsession: string | null
          listadegols: string | null
          placarfinal: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          data?: string | null
          id?: number
          idsession?: string | null
          listadegols?: string | null
          placarfinal?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          data?: string | null
          id?: number
          idsession?: string | null
          listadegols?: string | null
          placarfinal?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          forma_pagamento_preferida: string | null
          id: string
          onboarding_completed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          forma_pagamento_preferida?: string | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          forma_pagamento_preferida?: string | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transacoes: {
        Row: {
          categoria_id: string | null
          conta_id: string
          created_at: string | null
          data: string
          descricao: string | null
          forma_pagamento: string | null
          id: string
          pago: boolean | null
          tipo: string
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          conta_id: string
          created_at?: string | null
          data?: string
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          pago?: boolean | null
          tipo: string
          updated_at?: string | null
          user_id: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          conta_id?: string
          created_at?: string | null
          data?: string
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          pago?: boolean | null
          tipo?: string
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activatecode: number | null
          created_at: string
          enablesessionshare: boolean | null
          id: number
          nickname: string | null
          plan: string | null
          session: string | null
          timesgerados: number | null
          ultimologin: string | null
          whatsapp: string | null
        }
        Insert: {
          activatecode?: number | null
          created_at?: string
          enablesessionshare?: boolean | null
          id?: number
          nickname?: string | null
          plan?: string | null
          session?: string | null
          timesgerados?: number | null
          ultimologin?: string | null
          whatsapp?: string | null
        }
        Update: {
          activatecode?: number | null
          created_at?: string
          enablesessionshare?: boolean | null
          id?: number
          nickname?: string | null
          plan?: string | null
          session?: string | null
          timesgerados?: number | null
          ultimologin?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      lembrai_dashboard_stats: {
        Row: {
          proximos_24h: number | null
          total_aguardando: number | null
          total_arquivados: number | null
          total_enviados_mes: number | null
          total_erros_mes: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lembrai_lembretes_usuario_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "lembrai_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_sample_activities: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      lembrai_alterar_senha: {
        Args: {
          p_senha_antiga: string
          p_senha_nova: string
          p_usuario_id: string
        }
        Returns: boolean
      }
      lembrai_arquivar_lembrete:
        | { Args: { p_lembrete_id: string }; Returns: boolean }
        | {
            Args: { p_lembrete_id: string; p_usuario_id?: string }
            Returns: boolean
          }
      lembrai_calcular_data_envio: {
        Args: {
          p_data_contato: string
          p_data_especifica: string
          p_intervalo_dias: number
        }
        Returns: string
      }
      lembrai_copiar_lembrete: {
        Args: { p_lembrete_id: string }
        Returns: string
      }
      lembrai_login: {
        Args: { p_senha: string; p_whatsapp: string }
        Returns: {
          avatar_url: string
          id: string
          nome: string
          whatsapp: string
        }[]
      }
      lembrai_registrar_usuario: {
        Args: { p_nome: string; p_senha: string; p_whatsapp: string }
        Returns: string
      }
    }
    Enums: {
      activity_category: "obrigatoria" | "opcional" | "meta"
      activity_frequency: "diaria" | "semanal" | "mensal" | "anual"
      activity_status: "pendente" | "concluida" | "pausada" | "cancelada"
      completion_type: "riscar" | "sumir" | "check" | "explodir"
      lembrai_recorrencia_tipo: "semanal" | "mensal" | "anual"
      lembrai_status:
        | "aguardando"
        | "enviado"
        | "erro"
        | "cancelado"
        | "arquivado"
        | "clonado"
        | "contato"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_category: ["obrigatoria", "opcional", "meta"],
      activity_frequency: ["diaria", "semanal", "mensal", "anual"],
      activity_status: ["pendente", "concluida", "pausada", "cancelada"],
      completion_type: ["riscar", "sumir", "check", "explodir"],
      lembrai_recorrencia_tipo: ["semanal", "mensal", "anual"],
      lembrai_status: [
        "aguardando",
        "enviado",
        "erro",
        "cancelado",
        "arquivado",
        "clonado",
        "contato",
      ],
    },
  },
} as const
