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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      atividades_externas: {
        Row: {
          carga_horaria_horas: number | null
          created_at: string
          credibilidade_status: Database["public"]["Enums"]["atividade_credibilidade_status"]
          criado_por: string
          crianca_id: string
          data: string
          data_fim: string | null
          duracao_minutos: number
          evidencia_tipo: string | null
          evidencia_url: string | null
          fotos_urls: string[] | null
          frequencia_semanal: number | null
          id: string
          local_atividade: string
          local_id: string | null
          metodologia: string | null
          objetivos: string[] | null
          observacoes: string | null
          organizador: string | null
          origem: string
          profissionais_envolvidos: string[] | null
          profissional_id: string | null
          profissional_instituicao: string
          slug_publico: string | null
          tipo: Database["public"]["Enums"]["atividade_externa_tipo"]
          tipo_outro_descricao: string | null
          tornar_publico: boolean | null
          torneio_abrangencia:
            | Database["public"]["Enums"]["torneio_abrangencia"]
            | null
          torneio_id: string | null
          torneio_nome: string | null
          updated_at: string
          validado_em: string | null
          validado_por: string | null
          visibilidade: string
        }
        Insert: {
          carga_horaria_horas?: number | null
          created_at?: string
          credibilidade_status?: Database["public"]["Enums"]["atividade_credibilidade_status"]
          criado_por: string
          crianca_id: string
          data: string
          data_fim?: string | null
          duracao_minutos: number
          evidencia_tipo?: string | null
          evidencia_url?: string | null
          fotos_urls?: string[] | null
          frequencia_semanal?: number | null
          id?: string
          local_atividade: string
          local_id?: string | null
          metodologia?: string | null
          objetivos?: string[] | null
          observacoes?: string | null
          organizador?: string | null
          origem?: string
          profissionais_envolvidos?: string[] | null
          profissional_id?: string | null
          profissional_instituicao: string
          slug_publico?: string | null
          tipo: Database["public"]["Enums"]["atividade_externa_tipo"]
          tipo_outro_descricao?: string | null
          tornar_publico?: boolean | null
          torneio_abrangencia?:
            | Database["public"]["Enums"]["torneio_abrangencia"]
            | null
          torneio_id?: string | null
          torneio_nome?: string | null
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
          visibilidade?: string
        }
        Update: {
          carga_horaria_horas?: number | null
          created_at?: string
          credibilidade_status?: Database["public"]["Enums"]["atividade_credibilidade_status"]
          criado_por?: string
          crianca_id?: string
          data?: string
          data_fim?: string | null
          duracao_minutos?: number
          evidencia_tipo?: string | null
          evidencia_url?: string | null
          fotos_urls?: string[] | null
          frequencia_semanal?: number | null
          id?: string
          local_atividade?: string
          local_id?: string | null
          metodologia?: string | null
          objetivos?: string[] | null
          observacoes?: string | null
          organizador?: string | null
          origem?: string
          profissionais_envolvidos?: string[] | null
          profissional_id?: string | null
          profissional_instituicao?: string
          slug_publico?: string | null
          tipo?: Database["public"]["Enums"]["atividade_externa_tipo"]
          tipo_outro_descricao?: string | null
          tornar_publico?: boolean | null
          torneio_abrangencia?:
            | Database["public"]["Enums"]["torneio_abrangencia"]
            | null
          torneio_id?: string | null
          torneio_nome?: string | null
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
          visibilidade?: string
        }
        Relationships: []
      }
      atividades_externas_whitelist: {
        Row: {
          ativo: boolean
          created_at: string
          expires_at: string | null
          id: string
          motivo: string
          tipo_isencao: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          motivo?: string
          tipo_isencao?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          motivo?: string
          tipo_isencao?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      atleta_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_perfil_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_perfil_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_perfil_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atleta_follows_following_perfil_id_fkey"
            columns: ["following_perfil_id"]
            isOneToOne: false
            referencedRelation: "perfil_atleta"
            referencedColumns: ["id"]
          },
        ]
      }
      carreira_assinaturas: {
        Row: {
          cancelada_em: string | null
          created_at: string
          crianca_id: string
          expira_em: string | null
          gateway: string | null
          gateway_subscription_id: string | null
          id: string
          inicio_em: string
          plano: string
          status: string
          updated_at: string
          user_id: string
          valor: number | null
        }
        Insert: {
          cancelada_em?: string | null
          created_at?: string
          crianca_id: string
          expira_em?: string | null
          gateway?: string | null
          gateway_subscription_id?: string | null
          id?: string
          inicio_em?: string
          plano?: string
          status?: string
          updated_at?: string
          user_id: string
          valor?: number | null
        }
        Update: {
          cancelada_em?: string | null
          created_at?: string
          crianca_id?: string
          expira_em?: string | null
          gateway?: string | null
          gateway_subscription_id?: string | null
          id?: string
          inicio_em?: string
          plano?: string
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number | null
        }
        Relationships: []
      }
      carreira_experiencias: {
        Row: {
          atual: boolean
          bairro: string | null
          cidade: string | null
          created_at: string
          crianca_id: string
          data_fim: string | null
          data_inicio: string
          escolinha_id: string | null
          estado: string | null
          id: string
          nome_escola: string
          observacoes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          atual?: boolean
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          crianca_id: string
          data_fim?: string | null
          data_inicio: string
          escolinha_id?: string | null
          estado?: string | null
          id?: string
          nome_escola: string
          observacoes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          atual?: boolean
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          crianca_id?: string
          data_fim?: string | null
          data_inicio?: string
          escolinha_id?: string | null
          estado?: string | null
          id?: string
          nome_escola?: string
          observacoes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perfil_atleta: {
        Row: {
          atleta_app_id: string | null
          atleta_id_sync_at: string | null
          atleta_id_vinculado: boolean
          banner_url: string | null
          bio: string | null
          categoria: string | null
          cidade: string | null
          conexoes_count: number
          cor_destaque: string | null
          cpf_cnpj: string | null
          created_at: string
          crianca_id: string | null
          dados_publicos: Json
          estado: string | null
          followers_count: number
          foto_url: string | null
          id: string
          instagram_url: string | null
          is_public: boolean
          modalidade: string
          modalidades: string[] | null
          nome: string
          origem: string
          slug: string
          status_conta: string | null
          telefone_whatsapp: string | null
          tema: string | null
          tipo_documento: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          atleta_app_id?: string | null
          atleta_id_sync_at?: string | null
          atleta_id_vinculado?: boolean
          banner_url?: string | null
          bio?: string | null
          categoria?: string | null
          cidade?: string | null
          conexoes_count?: number
          cor_destaque?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          crianca_id?: string | null
          dados_publicos?: Json
          estado?: string | null
          followers_count?: number
          foto_url?: string | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean
          modalidade?: string
          modalidades?: string[] | null
          nome: string
          origem?: string
          slug: string
          status_conta?: string | null
          telefone_whatsapp?: string | null
          tema?: string | null
          tipo_documento?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          atleta_app_id?: string | null
          atleta_id_sync_at?: string | null
          atleta_id_vinculado?: boolean
          banner_url?: string | null
          bio?: string | null
          categoria?: string | null
          cidade?: string | null
          conexoes_count?: number
          cor_destaque?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          crianca_id?: string | null
          dados_publicos?: Json
          estado?: string | null
          followers_count?: number
          foto_url?: string | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean
          modalidade?: string
          modalidades?: string[] | null
          nome?: string
          origem?: string
          slug?: string
          status_conta?: string | null
          telefone_whatsapp?: string | null
          tema?: string | null
          tipo_documento?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perfis_rede: {
        Row: {
          bio: string | null
          convite_codigo: string | null
          cpf_cnpj: string | null
          created_at: string
          dados_perfil: Json
          foto_url: string | null
          id: string
          instagram: string | null
          nome: string
          slug: string | null
          status_conta: string | null
          telefone_whatsapp: string | null
          tema: string | null
          tipo: string
          tipo_documento: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          convite_codigo?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          dados_perfil?: Json
          foto_url?: string | null
          id?: string
          instagram?: string | null
          nome: string
          slug?: string | null
          status_conta?: string | null
          telefone_whatsapp?: string | null
          tema?: string | null
          tipo: string
          tipo_documento?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          convite_codigo?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          dados_perfil?: Json
          foto_url?: string | null
          id?: string
          instagram?: string | null
          nome?: string
          slug?: string | null
          status_conta?: string | null
          telefone_whatsapp?: string | null
          tema?: string | null
          tipo?: string
          tipo_documento?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comentarios: {
        Row: {
          created_at: string
          id: string
          post_id: string
          texto: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          texto: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          texto?: string
          user_id?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      posts_atleta: {
        Row: {
          autor_id: string | null
          comments_count: number
          created_at: string
          id: string
          imagens_urls: string[] | null
          likes_count: number
          link_preview: Json | null
          perfil_rede_id: string | null
          texto: string
          updated_at: string
          visibilidade: string
        }
        Insert: {
          autor_id?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          imagens_urls?: string[] | null
          likes_count?: number
          link_preview?: Json | null
          perfil_rede_id?: string | null
          texto: string
          updated_at?: string
          visibilidade?: string
        }
        Update: {
          autor_id?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          imagens_urls?: string[] | null
          likes_count?: number
          link_preview?: Json | null
          perfil_rede_id?: string | null
          texto?: string
          updated_at?: string
          visibilidade?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nome: string
          password_needs_change: boolean | null
          provider: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          password_needs_change?: boolean | null
          provider?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          password_needs_change?: boolean | null
          provider?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rede_conexoes: {
        Row: {
          created_at: string
          destinatario_id: string
          id: string
          solicitante_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destinatario_id: string
          id?: string
          solicitante_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destinatario_id?: string
          id?: string
          solicitante_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      saas_config: {
        Row: {
          chave: string
          created_at: string
          id: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          id?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          id?: string
          valor?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_carreira_atividade_limit: {
        Args: { p_crianca_id: string; p_user_id: string }
        Returns: Json
      }
      crianca_has_public_profile: {
        Args: { p_crianca_id: string; p_data_type?: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_atividades_externas_access: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      has_atividades_externas_access_for_child: {
        Args: { check_crianca_id: string; check_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_perfil_atleta_owner: {
        Args: { check_crianca_id: string; check_user_id: string }
        Returns: boolean
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      atividade_credibilidade_status:
        | "registrado"
        | "com_evidencia"
        | "validado"
      atividade_externa_tipo:
        | "clinica_camp"
        | "treino_preparador_fisico"
        | "treino_tecnico"
        | "avaliacao"
        | "competicao_torneio"
        | "jogo_amistoso_externo"
        | "outro"
      torneio_abrangencia:
        | "municipal"
        | "regional"
        | "estadual"
        | "nacional"
        | "internacional"
      user_role: "admin" | "school" | "teacher" | "guardian"
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
      atividade_credibilidade_status: [
        "registrado",
        "com_evidencia",
        "validado",
      ],
      atividade_externa_tipo: [
        "clinica_camp",
        "treino_preparador_fisico",
        "treino_tecnico",
        "avaliacao",
        "competicao_torneio",
        "jogo_amistoso_externo",
        "outro",
      ],
      torneio_abrangencia: [
        "municipal",
        "regional",
        "estadual",
        "nacional",
        "internacional",
      ],
      user_role: ["admin", "school", "teacher", "guardian"],
    },
  },
} as const
