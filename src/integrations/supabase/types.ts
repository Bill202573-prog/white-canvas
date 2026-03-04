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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acessos_log: {
        Row: {
          accessed_at: string
          escolinha_id: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
          user_role: string
        }
        Insert: {
          accessed_at?: string
          escolinha_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
          user_role: string
        }
        Update: {
          accessed_at?: string
          escolinha_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "acessos_log_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_log_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      amistoso_convocacoes: {
        Row: {
          asaas_payment_id: string | null
          created_at: string
          crianca_id: string
          data_pagamento: string | null
          evento_id: string
          id: string
          isento: boolean
          motivo_ausencia: string | null
          notificado_em: string | null
          pix_br_code: string | null
          pix_expires_at: string | null
          pix_qr_code_url: string | null
          presente: boolean | null
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          asaas_payment_id?: string | null
          created_at?: string
          crianca_id: string
          data_pagamento?: string | null
          evento_id: string
          id?: string
          isento?: boolean
          motivo_ausencia?: string | null
          notificado_em?: string | null
          pix_br_code?: string | null
          pix_expires_at?: string | null
          pix_qr_code_url?: string | null
          presente?: boolean | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          asaas_payment_id?: string | null
          created_at?: string
          crianca_id?: string
          data_pagamento?: string | null
          evento_id?: string
          id?: string
          isento?: boolean
          motivo_ausencia?: string | null
          notificado_em?: string | null
          pix_br_code?: string | null
          pix_expires_at?: string | null
          pix_qr_code_url?: string | null
          presente?: boolean | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "amistoso_convocacoes_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amistoso_convocacoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_esportivos"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Relationships: [
          {
            foreignKeyName: "atividades_externas_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
        ]
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
      aulas: {
        Row: {
          cancelado_em: string | null
          cancelado_por: string | null
          created_at: string
          data: string
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          motivo_aula_extra_id: string | null
          motivo_cancelamento_id: string | null
          observacoes: string | null
          professor_substituto_id: string | null
          status: Database["public"]["Enums"]["aula_status"]
          turma_id: string
          updated_at: string
        }
        Insert: {
          cancelado_em?: string | null
          cancelado_por?: string | null
          created_at?: string
          data: string
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          motivo_aula_extra_id?: string | null
          motivo_cancelamento_id?: string | null
          observacoes?: string | null
          professor_substituto_id?: string | null
          status?: Database["public"]["Enums"]["aula_status"]
          turma_id: string
          updated_at?: string
        }
        Update: {
          cancelado_em?: string | null
          cancelado_por?: string | null
          created_at?: string
          data?: string
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          motivo_aula_extra_id?: string | null
          motivo_cancelamento_id?: string | null
          observacoes?: string | null
          professor_substituto_id?: string | null
          status?: Database["public"]["Enums"]["aula_status"]
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aulas_motivo_aula_extra_id_fkey"
            columns: ["motivo_aula_extra_id"]
            isOneToOne: false
            referencedRelation: "motivos_aula_extra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aulas_motivo_cancelamento_id_fkey"
            columns: ["motivo_cancelamento_id"]
            isOneToOne: false
            referencedRelation: "motivos_cancelamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aulas_professor_substituto_id_fkey"
            columns: ["professor_substituto_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aulas_professor_substituto_id_fkey"
            columns: ["professor_substituto_id"]
            isOneToOne: false
            referencedRelation: "professores_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aulas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      campeonato_convocacoes: {
        Row: {
          asaas_payment_id: string | null
          campeonato_id: string
          created_at: string
          crianca_id: string
          data_pagamento: string | null
          id: string
          isento: boolean
          notificado_em: string | null
          pix_br_code: string | null
          pix_expires_at: string | null
          pix_qr_code_url: string | null
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          asaas_payment_id?: string | null
          campeonato_id: string
          created_at?: string
          crianca_id: string
          data_pagamento?: string | null
          id?: string
          isento?: boolean
          notificado_em?: string | null
          pix_br_code?: string | null
          pix_expires_at?: string | null
          pix_qr_code_url?: string | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          asaas_payment_id?: string | null
          campeonato_id?: string
          created_at?: string
          crianca_id?: string
          data_pagamento?: string | null
          id?: string
          isento?: boolean
          notificado_em?: string | null
          pix_br_code?: string | null
          pix_expires_at?: string | null
          pix_qr_code_url?: string | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campeonato_convocacoes_campeonato_id_fkey"
            columns: ["campeonato_id"]
            isOneToOne: false
            referencedRelation: "campeonatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campeonato_convocacoes_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
        ]
      }
      campeonatos: {
        Row: {
          ano: number
          categoria: string | null
          created_at: string
          escolinha_id: string
          id: string
          nome: string
          nome_time: string | null
          observacoes: string | null
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          ano?: number
          categoria?: string | null
          created_at?: string
          escolinha_id: string
          id?: string
          nome: string
          nome_time?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          ano?: number
          categoria?: string | null
          created_at?: string
          escolinha_id?: string
          id?: string
          nome?: string
          nome_time?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campeonatos_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campeonatos_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
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
        Relationships: [
          {
            foreignKeyName: "carreira_assinaturas_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "carreira_experiencias_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carreira_experiencias_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carreira_experiencias_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      cobrancas_entrada: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          created_at: string
          crianca_id: string
          data_pagamento: string | null
          descricao_itens: Json
          escolinha_id: string
          id: string
          mes_referencia_primeira_mensalidade: string | null
          pix_expires_at: string | null
          pix_payload: string | null
          pix_qrcode_url: string | null
          responsavel_id: string
          status: string
          updated_at: string
          valor_matricula: number
          valor_mensalidade: number
          valor_total: number
          valor_uniforme: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          created_at?: string
          crianca_id: string
          data_pagamento?: string | null
          descricao_itens?: Json
          escolinha_id: string
          id?: string
          mes_referencia_primeira_mensalidade?: string | null
          pix_expires_at?: string | null
          pix_payload?: string | null
          pix_qrcode_url?: string | null
          responsavel_id: string
          status?: string
          updated_at?: string
          valor_matricula?: number
          valor_mensalidade?: number
          valor_total: number
          valor_uniforme?: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          created_at?: string
          crianca_id?: string
          data_pagamento?: string | null
          descricao_itens?: Json
          escolinha_id?: string
          id?: string
          mes_referencia_primeira_mensalidade?: string | null
          pix_expires_at?: string | null
          pix_payload?: string | null
          pix_qrcode_url?: string | null
          responsavel_id?: string
          status?: string
          updated_at?: string
          valor_matricula?: number
          valor_mensalidade?: number
          valor_total?: number
          valor_uniforme?: number
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_entrada_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_entrada_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_entrada_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_entrada_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "parent_access_analytics"
            referencedColumns: ["responsavel_id"]
          },
          {
            foreignKeyName: "cobrancas_entrada_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_entrada_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicado_escola_leituras: {
        Row: {
          comunicado_id: string
          id: string
          lido_em: string
          user_id: string
        }
        Insert: {
          comunicado_id: string
          id?: string
          lido_em?: string
          user_id: string
        }
        Update: {
          comunicado_id?: string
          id?: string
          lido_em?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicado_escola_leituras_comunicado_id_fkey"
            columns: ["comunicado_id"]
            isOneToOne: false
            referencedRelation: "comunicados_escola"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicado_leituras: {
        Row: {
          comunicado_id: string
          escolinha_id: string
          id: string
          lido_em: string
          lido_por: string
        }
        Insert: {
          comunicado_id: string
          escolinha_id: string
          id?: string
          lido_em?: string
          lido_por: string
        }
        Update: {
          comunicado_id?: string
          escolinha_id?: string
          id?: string
          lido_em?: string
          lido_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicado_leituras_comunicado_id_fkey"
            columns: ["comunicado_id"]
            isOneToOne: false
            referencedRelation: "comunicados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicado_leituras_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicado_leituras_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados: {
        Row: {
          ativo: boolean
          created_at: string
          criado_por: string
          data_expiracao: string | null
          escolinha_id: string | null
          id: string
          mensagem: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criado_por: string
          data_expiracao?: string | null
          escolinha_id?: string | null
          id?: string
          mensagem: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criado_por?: string
          data_expiracao?: string | null
          escolinha_id?: string | null
          id?: string
          mensagem?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicados_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados_escola: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          criado_por: string
          crianca_ids: string[] | null
          data_expiracao: string | null
          destinatario_tipo: string
          escolinha_id: string
          horario: string | null
          id: string
          mensagem: string
          professor_id: string | null
          tipo: string
          titulo: string
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          criado_por: string
          crianca_ids?: string[] | null
          data_expiracao?: string | null
          destinatario_tipo: string
          escolinha_id: string
          horario?: string | null
          id?: string
          mensagem: string
          professor_id?: string | null
          tipo?: string
          titulo: string
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          criado_por?: string
          crianca_ids?: string[] | null
          data_expiracao?: string | null
          destinatario_tipo?: string
          escolinha_id?: string
          horario?: string | null
          id?: string
          mensagem?: string
          professor_id?: string | null
          tipo?: string
          titulo?: string
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_escola_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicados_escola_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicados_escola_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicados_escola_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicados_escola_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      conquistas_coletivas: {
        Row: {
          ano: number
          categoria: string | null
          colocacao: string
          created_at: string
          escolinha_id: string
          evento_id: string
          id: string
          nome_campeonato: string
          updated_at: string
        }
        Insert: {
          ano: number
          categoria?: string | null
          colocacao: string
          created_at?: string
          escolinha_id: string
          evento_id: string
          id?: string
          nome_campeonato: string
          updated_at?: string
        }
        Update: {
          ano?: number
          categoria?: string | null
          colocacao?: string
          created_at?: string
          escolinha_id?: string
          evento_id?: string
          id?: string
          nome_campeonato?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conquistas_coletivas_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conquistas_coletivas_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conquistas_coletivas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_esportivos"
            referencedColumns: ["id"]
          },
        ]
      }
      crianca_escolinha: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          crianca_id: string
          data_fim: string | null
          data_inicio: string
          entrada_paga: boolean | null
          escolinha_id: string
          id: string
          inativado_em: string | null
          motivo_inativacao: string | null
          observacoes_inativacao: string | null
          status_matricula: string | null
          valor_matricula: number | null
          valor_uniforme: number | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          crianca_id: string
          data_fim?: string | null
          data_inicio?: string
          entrada_paga?: boolean | null
          escolinha_id: string
          id?: string
          inativado_em?: string | null
          motivo_inativacao?: string | null
          observacoes_inativacao?: string | null
          status_matricula?: string | null
          valor_matricula?: number | null
          valor_uniforme?: number | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          crianca_id?: string
          data_fim?: string | null
          data_inicio?: string
          entrada_paga?: boolean | null
          escolinha_id?: string
          id?: string
          inativado_em?: string | null
          motivo_inativacao?: string | null
          observacoes_inativacao?: string | null
          status_matricula?: string | null
          valor_matricula?: number | null
          valor_uniforme?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crianca_escolinha_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crianca_escolinha_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crianca_escolinha_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      crianca_responsavel: {
        Row: {
          created_at: string
          crianca_id: string
          id: string
          parentesco: string | null
          responsavel_id: string
        }
        Insert: {
          created_at?: string
          crianca_id: string
          id?: string
          parentesco?: string | null
          responsavel_id: string
        }
        Update: {
          created_at?: string
          crianca_id?: string
          id?: string
          parentesco?: string | null
          responsavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crianca_responsavel_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crianca_responsavel_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "parent_access_analytics"
            referencedColumns: ["responsavel_id"]
          },
          {
            foreignKeyName: "crianca_responsavel_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crianca_responsavel_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      crianca_turma: {
        Row: {
          ativo: boolean
          created_at: string
          crianca_id: string
          id: string
          turma_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          crianca_id: string
          id?: string
          turma_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          crianca_id?: string
          id?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crianca_turma_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crianca_turma_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      criancas: {
        Row: {
          ativo: boolean
          cpf_hash: string | null
          created_at: string
          data_inicio_cobranca: string | null
          data_nascimento: string
          dia_vencimento: number | null
          forma_cobranca: string | null
          foto_url: string | null
          id: string
          nome: string
          status_financeiro: string | null
          updated_at: string
          valor_mensalidade: number | null
        }
        Insert: {
          ativo?: boolean
          cpf_hash?: string | null
          created_at?: string
          data_inicio_cobranca?: string | null
          data_nascimento: string
          dia_vencimento?: number | null
          forma_cobranca?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          status_financeiro?: string | null
          updated_at?: string
          valor_mensalidade?: number | null
        }
        Update: {
          ativo?: boolean
          cpf_hash?: string | null
          created_at?: string
          data_inicio_cobranca?: string | null
          data_nascimento?: string
          dia_vencimento?: number | null
          forma_cobranca?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          status_financeiro?: string | null
          updated_at?: string
          valor_mensalidade?: number | null
        }
        Relationships: []
      }
      diagnostico_resultados: {
        Row: {
          created_at: string
          duracao_ms: number | null
          executado_em: string
          executado_por: string | null
          id: string
          resultado: Json
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duracao_ms?: number | null
          executado_em?: string
          executado_por?: string | null
          id?: string
          resultado: Json
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duracao_ms?: number | null
          executado_em?: string
          executado_por?: string | null
          id?: string
          resultado?: Json
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      escola_asaas_admin_notifications: {
        Row: {
          created_at: string | null
          dados: Json | null
          escolinha_id: string
          evento: string
          id: string
          lida: boolean | null
          mensagem: string | null
        }
        Insert: {
          created_at?: string | null
          dados?: Json | null
          escolinha_id: string
          evento: string
          id?: string
          lida?: boolean | null
          mensagem?: string | null
        }
        Update: {
          created_at?: string | null
          dados?: Json | null
          escolinha_id?: string
          evento?: string
          id?: string
          lida?: boolean | null
          mensagem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escola_asaas_admin_notifications_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_asaas_admin_notifications_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      escola_asaas_jobs: {
        Row: {
          created_at: string
          erro: string | null
          escolinha_id: string
          id: string
          payload: Json | null
          processed_at: string | null
          resultado: Json | null
          status: string
          tentativas: number | null
          tipo: string
        }
        Insert: {
          created_at?: string
          erro?: string | null
          escolinha_id: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          resultado?: Json | null
          status?: string
          tentativas?: number | null
          tipo: string
        }
        Update: {
          created_at?: string
          erro?: string | null
          escolinha_id?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          resultado?: Json | null
          status?: string
          tentativas?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "escola_asaas_jobs_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_asaas_jobs_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      escola_cadastro_bancario: {
        Row: {
          agencia: string
          asaas_account_id: string | null
          asaas_api_key: string | null
          asaas_atualizado_em: string | null
          asaas_enviado_em: string | null
          asaas_status: string | null
          asaas_wallet_id: string | null
          bairro: string | null
          banco: string
          cep: string | null
          cidade: string | null
          complemento: string | null
          conta: string
          created_at: string
          data_nascimento: string | null
          email: string
          escolinha_id: string
          estado: string | null
          id: string
          income_value: number | null
          nome: string
          numero: string | null
          rua: string | null
          telefone: string | null
          tipo_conta: string
          tipo_pessoa: string
          updated_at: string
        }
        Insert: {
          agencia: string
          asaas_account_id?: string | null
          asaas_api_key?: string | null
          asaas_atualizado_em?: string | null
          asaas_enviado_em?: string | null
          asaas_status?: string | null
          asaas_wallet_id?: string | null
          bairro?: string | null
          banco: string
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          conta: string
          created_at?: string
          data_nascimento?: string | null
          email: string
          escolinha_id: string
          estado?: string | null
          id?: string
          income_value?: number | null
          nome: string
          numero?: string | null
          rua?: string | null
          telefone?: string | null
          tipo_conta: string
          tipo_pessoa: string
          updated_at?: string
        }
        Update: {
          agencia?: string
          asaas_account_id?: string | null
          asaas_api_key?: string | null
          asaas_atualizado_em?: string | null
          asaas_enviado_em?: string | null
          asaas_status?: string | null
          asaas_wallet_id?: string | null
          bairro?: string | null
          banco?: string
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          conta?: string
          created_at?: string
          data_nascimento?: string | null
          email?: string
          escolinha_id?: string
          estado?: string | null
          id?: string
          income_value?: number | null
          nome?: string
          numero?: string | null
          rua?: string | null
          telefone?: string | null
          tipo_conta?: string
          tipo_pessoa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escola_cadastro_bancario_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: true
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_cadastro_bancario_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: true
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      escola_documentos: {
        Row: {
          created_at: string
          escolinha_id: string
          id: string
          mime_type: string
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number
          tipo_documento: string
        }
        Insert: {
          created_at?: string
          escolinha_id: string
          id?: string
          mime_type: string
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number
          tipo_documento: string
        }
        Update: {
          created_at?: string
          escolinha_id?: string
          id?: string
          mime_type?: string
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "escola_documentos_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_documentos_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      escola_push_config: {
        Row: {
          aula_1_dia_antes: boolean
          aula_3_dias_antes: boolean
          aula_no_dia: boolean
          cobranca_1_dia_antes: boolean
          cobranca_1_dia_depois: boolean
          cobranca_3_dias_antes: boolean
          cobranca_no_dia: boolean
          comunicado_push: boolean
          convocacao_1_dia_antes: boolean
          convocacao_2_dias_antes: boolean
          convocacao_no_dia: boolean
          created_at: string
          escolinha_id: string
          id: string
          push_ativo: boolean
          updated_at: string
        }
        Insert: {
          aula_1_dia_antes?: boolean
          aula_3_dias_antes?: boolean
          aula_no_dia?: boolean
          cobranca_1_dia_antes?: boolean
          cobranca_1_dia_depois?: boolean
          cobranca_3_dias_antes?: boolean
          cobranca_no_dia?: boolean
          comunicado_push?: boolean
          convocacao_1_dia_antes?: boolean
          convocacao_2_dias_antes?: boolean
          convocacao_no_dia?: boolean
          created_at?: string
          escolinha_id: string
          id?: string
          push_ativo?: boolean
          updated_at?: string
        }
        Update: {
          aula_1_dia_antes?: boolean
          aula_3_dias_antes?: boolean
          aula_no_dia?: boolean
          cobranca_1_dia_antes?: boolean
          cobranca_1_dia_depois?: boolean
          cobranca_3_dias_antes?: boolean
          cobranca_no_dia?: boolean
          comunicado_push?: boolean
          convocacao_1_dia_antes?: boolean
          convocacao_2_dias_antes?: boolean
          convocacao_no_dia?: boolean
          created_at?: string
          escolinha_id?: string
          id?: string
          push_ativo?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escola_push_config_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: true
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_push_config_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: true
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      escolinha_financeiro: {
        Row: {
          created_at: string
          data_inicio_cobranca: string | null
          escolinha_id: string
          id: string
          plano_id: string | null
          status: Database["public"]["Enums"]["status_financeiro"]
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          created_at?: string
          data_inicio_cobranca?: string | null
          escolinha_id: string
          id?: string
          plano_id?: string | null
          status?: Database["public"]["Enums"]["status_financeiro"]
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          created_at?: string
          data_inicio_cobranca?: string | null
          escolinha_id?: string
          id?: string
          plano_id?: string | null
          status?: Database["public"]["Enums"]["status_financeiro"]
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "escolinha_financeiro_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: true
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escolinha_financeiro_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: true
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escolinha_financeiro_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_saas"
            referencedColumns: ["id"]
          },
        ]
      }
      escolinhas: {
        Row: {
          admin_user_id: string | null
          atividades_externas_liberado: boolean | null
          atividades_externas_liberado_ate: string | null
          atividades_externas_motivo: string | null
          ativo: boolean
          bairro: string | null
          bio: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          documento: string | null
          email: string | null
          email_socio: string | null
          endereco: string | null
          estado: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          nome: string
          nome_responsavel: string | null
          nome_socio: string | null
          numero: string | null
          rua: string | null
          senha_temporaria: string | null
          senha_temporaria_ativa: boolean | null
          senha_temporaria_socio: string | null
          senha_temporaria_socio_ativa: boolean | null
          slug: string | null
          socio_user_id: string | null
          status: Database["public"]["Enums"]["escolinha_status"]
          status_financeiro_escola: Database["public"]["Enums"]["escola_status_financeiro"]
          telefone: string | null
          telefone_socio: string | null
          tipo_documento: string | null
          updated_at: string
          whatsapp_indicacoes: string | null
        }
        Insert: {
          admin_user_id?: string | null
          atividades_externas_liberado?: boolean | null
          atividades_externas_liberado_ate?: string | null
          atividades_externas_motivo?: string | null
          ativo?: boolean
          bairro?: string | null
          bio?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          email_socio?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          nome: string
          nome_responsavel?: string | null
          nome_socio?: string | null
          numero?: string | null
          rua?: string | null
          senha_temporaria?: string | null
          senha_temporaria_ativa?: boolean | null
          senha_temporaria_socio?: string | null
          senha_temporaria_socio_ativa?: boolean | null
          slug?: string | null
          socio_user_id?: string | null
          status?: Database["public"]["Enums"]["escolinha_status"]
          status_financeiro_escola?: Database["public"]["Enums"]["escola_status_financeiro"]
          telefone?: string | null
          telefone_socio?: string | null
          tipo_documento?: string | null
          updated_at?: string
          whatsapp_indicacoes?: string | null
        }
        Update: {
          admin_user_id?: string | null
          atividades_externas_liberado?: boolean | null
          atividades_externas_liberado_ate?: string | null
          atividades_externas_motivo?: string | null
          ativo?: boolean
          bairro?: string | null
          bio?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          email_socio?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          nome?: string
          nome_responsavel?: string | null
          nome_socio?: string | null
          numero?: string | null
          rua?: string | null
          senha_temporaria?: string | null
          senha_temporaria_ativa?: boolean | null
          senha_temporaria_socio?: string | null
          senha_temporaria_socio_ativa?: boolean | null
          slug?: string | null
          socio_user_id?: string | null
          status?: Database["public"]["Enums"]["escolinha_status"]
          status_financeiro_escola?: Database["public"]["Enums"]["escola_status_financeiro"]
          telefone?: string | null
          telefone_socio?: string | null
          tipo_documento?: string | null
          updated_at?: string
          whatsapp_indicacoes?: string | null
        }
        Relationships: []
      }
      evento_gols: {
        Row: {
          created_at: string
          crianca_id: string
          evento_id: string
          id: string
          quantidade: number
          time_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crianca_id: string
          evento_id: string
          id?: string
          quantidade?: number
          time_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crianca_id?: string
          evento_id?: string
          id?: string
          quantidade?: number
          time_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_gols_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_gols_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_esportivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_gols_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "evento_times"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_premiacoes: {
        Row: {
          created_at: string
          crianca_id: string
          evento_id: string
          id: string
          tipo_premiacao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crianca_id: string
          evento_id: string
          id?: string
          tipo_premiacao: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crianca_id?: string
          evento_id?: string
          id?: string
          tipo_premiacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_premiacoes_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_premiacoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_esportivos"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_presencas: {
        Row: {
          confirmado_escola: boolean | null
          confirmado_responsavel: boolean | null
          created_at: string
          crianca_id: string
          escola_confirmou_em: string | null
          evento_id: string
          id: string
          observacoes: string | null
          presente: boolean | null
          responsavel_confirmou_em: string | null
          time_id: string
          updated_at: string
        }
        Insert: {
          confirmado_escola?: boolean | null
          confirmado_responsavel?: boolean | null
          created_at?: string
          crianca_id: string
          escola_confirmou_em?: string | null
          evento_id: string
          id?: string
          observacoes?: string | null
          presente?: boolean | null
          responsavel_confirmou_em?: string | null
          time_id: string
          updated_at?: string
        }
        Update: {
          confirmado_escola?: boolean | null
          confirmado_responsavel?: boolean | null
          created_at?: string
          crianca_id?: string
          escola_confirmou_em?: string | null
          evento_id?: string
          id?: string
          observacoes?: string | null
          presente?: boolean | null
          responsavel_confirmou_em?: string | null
          time_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_presencas_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_presencas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_esportivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_presencas_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "evento_times"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_time_alunos: {
        Row: {
          created_at: string
          crianca_id: string
          id: string
          time_id: string
        }
        Insert: {
          created_at?: string
          crianca_id: string
          id?: string
          time_id: string
        }
        Update: {
          created_at?: string
          crianca_id?: string
          id?: string
          time_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_time_alunos_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_time_alunos_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "evento_times"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_times: {
        Row: {
          created_at: string
          evento_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evento_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evento_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_times_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_esportivos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_esportivos: {
        Row: {
          adversario: string | null
          campeonato_id: string | null
          categoria: string | null
          cobrar_taxa_juiz: boolean | null
          cobrar_taxa_participacao: boolean | null
          created_at: string
          data: string
          data_limite_pagamento: string | null
          endereco: string | null
          escolinha_id: string
          fase: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          local: string | null
          nome: string
          observacoes: string | null
          placar_time1: number | null
          placar_time2: number | null
          status: Database["public"]["Enums"]["evento_status"]
          taxa_juiz: number | null
          taxa_participacao: number | null
          time1_id: string | null
          time2_id: string | null
          tipo: Database["public"]["Enums"]["evento_tipo"]
          updated_at: string
        }
        Insert: {
          adversario?: string | null
          campeonato_id?: string | null
          categoria?: string | null
          cobrar_taxa_juiz?: boolean | null
          cobrar_taxa_participacao?: boolean | null
          created_at?: string
          data: string
          data_limite_pagamento?: string | null
          endereco?: string | null
          escolinha_id: string
          fase?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          local?: string | null
          nome: string
          observacoes?: string | null
          placar_time1?: number | null
          placar_time2?: number | null
          status?: Database["public"]["Enums"]["evento_status"]
          taxa_juiz?: number | null
          taxa_participacao?: number | null
          time1_id?: string | null
          time2_id?: string | null
          tipo: Database["public"]["Enums"]["evento_tipo"]
          updated_at?: string
        }
        Update: {
          adversario?: string | null
          campeonato_id?: string | null
          categoria?: string | null
          cobrar_taxa_juiz?: boolean | null
          cobrar_taxa_participacao?: boolean | null
          created_at?: string
          data?: string
          data_limite_pagamento?: string | null
          endereco?: string | null
          escolinha_id?: string
          fase?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          local?: string | null
          nome?: string
          observacoes?: string | null
          placar_time1?: number | null
          placar_time2?: number | null
          status?: Database["public"]["Enums"]["evento_status"]
          taxa_juiz?: number | null
          taxa_participacao?: number | null
          time1_id?: string | null
          time2_id?: string | null
          tipo?: Database["public"]["Enums"]["evento_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_esportivos_campeonato_id_fkey"
            columns: ["campeonato_id"]
            isOneToOne: false
            referencedRelation: "campeonatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_esportivos_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_esportivos_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_esportivos_time1_id_fkey"
            columns: ["time1_id"]
            isOneToOne: false
            referencedRelation: "evento_times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_esportivos_time2_id_fkey"
            columns: ["time2_id"]
            isOneToOne: false
            referencedRelation: "evento_times"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_cobrancas: {
        Row: {
          abacatepay_billing_id: string | null
          abacatepay_url: string | null
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          escolinha_id: string
          id: string
          mes_referencia: string
          metodo_pagamento: string | null
          observacoes: string | null
          plano_id: string | null
          status: string
          valor: number
        }
        Insert: {
          abacatepay_billing_id?: string | null
          abacatepay_url?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          escolinha_id: string
          id?: string
          mes_referencia: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          plano_id?: string | null
          status: string
          valor: number
        }
        Update: {
          abacatepay_billing_id?: string | null
          abacatepay_url?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          escolinha_id?: string
          id?: string
          mes_referencia?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          plano_id?: string | null
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_cobrancas_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_cobrancas_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_cobrancas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_saas"
            referencedColumns: ["id"]
          },
        ]
      }
      indicacoes: {
        Row: {
          created_at: string
          escolinha_id: string
          id: string
          idade_crianca: number
          nome_crianca: string
          nome_pai_indicador: string
          nome_responsavel_indicado: string
          pai_indicador_id: string
          status: Database["public"]["Enums"]["indicacao_status"]
          telefone_responsavel_indicado: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          escolinha_id: string
          id?: string
          idade_crianca: number
          nome_crianca: string
          nome_pai_indicador: string
          nome_responsavel_indicado: string
          pai_indicador_id: string
          status?: Database["public"]["Enums"]["indicacao_status"]
          telefone_responsavel_indicado: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          escolinha_id?: string
          id?: string
          idade_crianca?: number
          nome_crianca?: string
          nome_pai_indicador?: string
          nome_responsavel_indicado?: string
          pai_indicador_id?: string
          status?: Database["public"]["Enums"]["indicacao_status"]
          telefone_responsavel_indicado?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicacoes_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicacoes_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicacoes_pai_indicador_id_fkey"
            columns: ["pai_indicador_id"]
            isOneToOne: false
            referencedRelation: "parent_access_analytics"
            referencedColumns: ["responsavel_id"]
          },
          {
            foreignKeyName: "indicacoes_pai_indicador_id_fkey"
            columns: ["pai_indicador_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicacoes_pai_indicador_id_fkey"
            columns: ["pai_indicador_id"]
            isOneToOne: false
            referencedRelation: "responsaveis_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      mensalidades: {
        Row: {
          abacatepay_billing_id: string | null
          abacatepay_url: string | null
          created_at: string
          crianca_id: string
          data_pagamento: string | null
          data_vencimento: string
          escolinha_id: string
          forma_pagamento: string | null
          id: string
          mes_referencia: string
          observacoes: string | null
          status: string
          updated_at: string
          valor: number
          valor_pago: number | null
        }
        Insert: {
          abacatepay_billing_id?: string | null
          abacatepay_url?: string | null
          created_at?: string
          crianca_id: string
          data_pagamento?: string | null
          data_vencimento: string
          escolinha_id: string
          forma_pagamento?: string | null
          id?: string
          mes_referencia: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
          valor_pago?: number | null
        }
        Update: {
          abacatepay_billing_id?: string | null
          abacatepay_url?: string | null
          created_at?: string
          crianca_id?: string
          data_pagamento?: string | null
          data_vencimento?: string
          escolinha_id?: string
          forma_pagamento?: string | null
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mensalidades_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      motivos_aula_extra: {
        Row: {
          ativo: boolean
          created_at: string
          escolinha_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          escolinha_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          escolinha_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "motivos_aula_extra_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motivos_aula_extra_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      motivos_cancelamento: {
        Row: {
          ativo: boolean
          created_at: string
          escolinha_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          escolinha_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          escolinha_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "motivos_cancelamento_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motivos_cancelamento_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_inadimplencia: {
        Row: {
          cobranca_id: string | null
          created_at: string
          escolinha_id: string
          id: string
          lido: boolean | null
          mensagem: string
          tipo: string
        }
        Insert: {
          cobranca_id?: string | null
          created_at?: string
          escolinha_id: string
          id?: string
          lido?: boolean | null
          mensagem: string
          tipo: string
        }
        Update: {
          cobranca_id?: string | null
          created_at?: string
          escolinha_id?: string
          id?: string
          lido?: boolean | null
          mensagem?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_inadimplencia_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "historico_cobrancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_inadimplencia_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_inadimplencia_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          created_at: string
          id: string
          pedido_id: string
          produto_id: string
          quantidade: number
          tamanho: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          id?: string
          pedido_id: string
          produto_id: string
          quantidade?: number
          tamanho?: string | null
          valor_total: number
          valor_unitario: number
        }
        Update: {
          created_at?: string
          id?: string
          pedido_id?: string
          produto_id?: string
          quantidade?: number
          tamanho?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          asaas_payment_id: string | null
          created_at: string
          crianca_id: string
          data_pagamento: string | null
          escolinha_id: string
          id: string
          numero_pedido: number | null
          observacoes: string | null
          pix_expires_at: string | null
          pix_payload: string | null
          pix_qrcode_url: string | null
          responsavel_id: string
          status: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          asaas_payment_id?: string | null
          created_at?: string
          crianca_id: string
          data_pagamento?: string | null
          escolinha_id: string
          id?: string
          numero_pedido?: number | null
          observacoes?: string | null
          pix_expires_at?: string | null
          pix_payload?: string | null
          pix_qrcode_url?: string | null
          responsavel_id: string
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          asaas_payment_id?: string | null
          created_at?: string
          crianca_id?: string
          data_pagamento?: string | null
          escolinha_id?: string
          id?: string
          numero_pedido?: number | null
          observacoes?: string | null
          pix_expires_at?: string | null
          pix_payload?: string | null
          pix_qrcode_url?: string | null
          responsavel_id?: string
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "parent_access_analytics"
            referencedColumns: ["responsavel_id"]
          },
          {
            foreignKeyName: "pedidos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_atleta: {
        Row: {
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
          slug: string
          status_conta: string | null
          telefone_whatsapp: string | null
          tema: string | null
          tipo_documento: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
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
          slug: string
          status_conta?: string | null
          telefone_whatsapp?: string | null
          tema?: string | null
          tipo_documento?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
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
          slug?: string
          status_conta?: string | null
          telefone_whatsapp?: string | null
          tema?: string | null
          tipo_documento?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_atleta_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
        ]
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
      planos_saas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          max_alunos: number | null
          min_alunos: number
          nome: string
          valor_mensal: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          max_alunos?: number | null
          min_alunos?: number
          nome: string
          valor_mensal: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          max_alunos?: number | null
          min_alunos?: number
          nome?: string
          valor_mensal?: number
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
        Relationships: [
          {
            foreignKeyName: "post_comentarios_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_atleta"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_atleta"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "posts_atleta_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfil_atleta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_atleta_perfil_rede_id_fkey"
            columns: ["perfil_rede_id"]
            isOneToOne: false
            referencedRelation: "perfis_rede"
            referencedColumns: ["id"]
          },
        ]
      }
      posts_escola: {
        Row: {
          autor_user_id: string
          created_at: string
          escolinha_id: string
          id: string
          imagens_urls: string[]
          texto: string
          updated_at: string
          visibilidade: string
        }
        Insert: {
          autor_user_id: string
          created_at?: string
          escolinha_id: string
          id?: string
          imagens_urls?: string[]
          texto?: string
          updated_at?: string
          visibilidade?: string
        }
        Update: {
          autor_user_id?: string
          created_at?: string
          escolinha_id?: string
          id?: string
          imagens_urls?: string[]
          texto?: string
          updated_at?: string
          visibilidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_escola_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_escola_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      presencas: {
        Row: {
          aula_id: string
          chamada_fechada_por: string | null
          chamada_fechada_por_id: string | null
          confirmado_professor: boolean | null
          confirmado_responsavel: boolean | null
          created_at: string
          crianca_id: string
          id: string
          motivo_ausencia: string | null
          observacoes: string | null
          presente: boolean | null
          professor_confirmou_em: string | null
          responsavel_confirmou_em: string | null
          updated_at: string
        }
        Insert: {
          aula_id: string
          chamada_fechada_por?: string | null
          chamada_fechada_por_id?: string | null
          confirmado_professor?: boolean | null
          confirmado_responsavel?: boolean | null
          created_at?: string
          crianca_id: string
          id?: string
          motivo_ausencia?: string | null
          observacoes?: string | null
          presente?: boolean | null
          professor_confirmou_em?: string | null
          responsavel_confirmou_em?: string | null
          updated_at?: string
        }
        Update: {
          aula_id?: string
          chamada_fechada_por?: string | null
          chamada_fechada_por_id?: string | null
          confirmado_professor?: boolean | null
          confirmado_responsavel?: boolean | null
          created_at?: string
          crianca_id?: string
          id?: string
          motivo_ausencia?: string | null
          observacoes?: string | null
          presente?: boolean | null
          professor_confirmou_em?: string | null
          responsavel_confirmou_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presencas_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_chamada_fechada_por_id_fkey"
            columns: ["chamada_fechada_por_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_chamada_fechada_por_id_fkey"
            columns: ["chamada_fechada_por_id"]
            isOneToOne: false
            referencedRelation: "professores_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "criancas"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_tamanhos: {
        Row: {
          created_at: string
          estoque: number
          id: string
          produto_id: string
          tamanho: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estoque?: number
          id?: string
          produto_id: string
          tamanho: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estoque?: number
          id?: string
          produto_id?: string
          tamanho?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_tamanhos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          escolinha_id: string
          estoque: number | null
          foto_url: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          escolinha_id: string
          estoque?: number | null
          foto_url?: string | null
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          escolinha_id?: string
          estoque?: number | null
          foto_url?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_escola: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          escolinha_id: string
          id: string
          nome: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          escolinha_id: string
          id?: string
          nome: string
          tipo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          escolinha_id?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_escola_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_escola_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      professores: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cpf: string | null
          created_at: string
          email: string
          endereco: string | null
          escolinha_id: string
          estado: string | null
          foto_url: string | null
          hora_aula: number | null
          id: string
          nome: string
          senha_temporaria: string | null
          senha_temporaria_ativa: boolean | null
          telefone: string | null
          tipo_contratacao: string | null
          tipo_profissional: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          endereco?: string | null
          escolinha_id: string
          estado?: string | null
          foto_url?: string | null
          hora_aula?: number | null
          id?: string
          nome: string
          senha_temporaria?: string | null
          senha_temporaria_ativa?: boolean | null
          telefone?: string | null
          tipo_contratacao?: string | null
          tipo_profissional?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          endereco?: string | null
          escolinha_id?: string
          estado?: string | null
          foto_url?: string | null
          hora_aula?: number | null
          id?: string
          nome?: string
          senha_temporaria?: string | null
          senha_temporaria_ativa?: boolean | null
          telefone?: string | null
          tipo_contratacao?: string | null
          tipo_profissional?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professores_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professores_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
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
      push_notifications_log: {
        Row: {
          dias_antes: number | null
          entregue: boolean | null
          enviado_em: string
          escolinha_id: string | null
          id: string
          mensagem: string
          referencia_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          dias_antes?: number | null
          entregue?: boolean | null
          enviado_em?: string
          escolinha_id?: string | null
          id?: string
          mensagem: string
          referencia_id?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          dias_antes?: number | null
          entregue?: boolean | null
          enviado_em?: string
          escolinha_id?: string | null
          id?: string
          mensagem?: string
          referencia_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notifications_log_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notifications_log_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pwa_installs: {
        Row: {
          escolinha_id: string | null
          id: string
          installed_at: string
          os: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          escolinha_id?: string | null
          id?: string
          installed_at?: string
          os: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          escolinha_id?: string | null
          id?: string
          installed_at?: string
          os?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pwa_installs_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_installs_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
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
      rede_convites: {
        Row: {
          convidado_user_id: string
          convidante_perfil_id: string
          created_at: string
          id: string
        }
        Insert: {
          convidado_user_id: string
          convidante_perfil_id: string
          created_at?: string
          id?: string
        }
        Update: {
          convidado_user_id?: string
          convidante_perfil_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rede_convites_convidante_perfil_id_fkey"
            columns: ["convidante_perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_rede"
            referencedColumns: ["id"]
          },
        ]
      }
      responsaveis: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          email: string
          estado: string | null
          id: string
          nome: string
          numero: string | null
          rua: string | null
          senha_temporaria: string | null
          senha_temporaria_ativa: boolean | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          estado?: string | null
          id?: string
          nome: string
          numero?: string | null
          rua?: string | null
          senha_temporaria?: string | null
          senha_temporaria_ativa?: boolean | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          estado?: string | null
          id?: string
          nome?: string
          numero?: string | null
          rua?: string | null
          senha_temporaria?: string | null
          senha_temporaria_ativa?: boolean | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      saas_config: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      turma_assistentes: {
        Row: {
          created_at: string
          id: string
          professor_id: string
          turma_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          professor_id: string
          turma_id: string
        }
        Update: {
          created_at?: string
          id?: string
          professor_id?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turma_assistentes_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_assistentes_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_assistentes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          assistente_id: string | null
          ativo: boolean
          campo: string | null
          categoria_sub: number | null
          created_at: string
          dias_semana: string[]
          escolinha_id: string
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          nome: string
          professor_id: string | null
          status: Database["public"]["Enums"]["turma_status"]
          updated_at: string
        }
        Insert: {
          assistente_id?: string | null
          ativo?: boolean
          campo?: string | null
          categoria_sub?: number | null
          created_at?: string
          dias_semana?: string[]
          escolinha_id: string
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nome: string
          professor_id?: string | null
          status?: Database["public"]["Enums"]["turma_status"]
          updated_at?: string
        }
        Update: {
          assistente_id?: string | null
          ativo?: boolean
          campo?: string | null
          categoria_sub?: number | null
          created_at?: string
          dias_semana?: string[]
          escolinha_id?: string
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nome?: string
          professor_id?: string | null
          status?: Database["public"]["Enums"]["turma_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_assistente_id_fkey"
            columns: ["assistente_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_assistente_id_fkey"
            columns: ["assistente_id"]
            isOneToOne: false
            referencedRelation: "professores_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores_publico"
            referencedColumns: ["id"]
          },
        ]
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
      escola_cadastro_bancario_publico: {
        Row: {
          agencia: string | null
          asaas_atualizado_em: string | null
          asaas_enviado_em: string | null
          asaas_status: string | null
          bairro: string | null
          banco: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          conta: string | null
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          escolinha_id: string | null
          estado: string | null
          id: string | null
          income_value: number | null
          nome: string | null
          numero: string | null
          rua: string | null
          subconta_criada: boolean | null
          telefone: string | null
          tipo_conta: string | null
          tipo_pessoa: string | null
          updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          asaas_atualizado_em?: string | null
          asaas_enviado_em?: string | null
          asaas_status?: string | null
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          conta?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          escolinha_id?: string | null
          estado?: string | null
          id?: string | null
          income_value?: number | null
          nome?: string | null
          numero?: string | null
          rua?: string | null
          subconta_criada?: never
          telefone?: string | null
          tipo_conta?: string | null
          tipo_pessoa?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          asaas_atualizado_em?: string | null
          asaas_enviado_em?: string | null
          asaas_status?: string | null
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          conta?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          escolinha_id?: string | null
          estado?: string | null
          id?: string | null
          income_value?: number | null
          nome?: string | null
          numero?: string | null
          rua?: string | null
          subconta_criada?: never
          telefone?: string | null
          tipo_conta?: string | null
          tipo_pessoa?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escola_cadastro_bancario_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: true
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_cadastro_bancario_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: true
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      escolinhas_publico: {
        Row: {
          bio: string | null
          cidade: string | null
          estado: string | null
          id: string | null
          instagram_url: string | null
          logo_url: string | null
          nome: string | null
          slug: string | null
        }
        Insert: {
          bio?: string | null
          cidade?: string | null
          estado?: string | null
          id?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          nome?: string | null
          slug?: string | null
        }
        Update: {
          bio?: string | null
          cidade?: string | null
          estado?: string | null
          id?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          nome?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      parent_access_analytics: {
        Row: {
          acessos_30_dias: number | null
          acessos_7_dias: number | null
          escolinha_id: string | null
          primeiro_acesso: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          total_acessos: number | null
          ultimo_acesso: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crianca_escolinha_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crianca_escolinha_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      professores_publico: {
        Row: {
          ativo: boolean | null
          escolinha_id: string | null
          foto_url: string | null
          id: string | null
          nome: string | null
        }
        Insert: {
          ativo?: boolean | null
          escolinha_id?: string | null
          foto_url?: string | null
          id?: string | null
          nome?: string | null
        }
        Update: {
          ativo?: boolean | null
          escolinha_id?: string | null
          foto_url?: string | null
          id?: string | null
          nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professores_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professores_escolinha_id_fkey"
            columns: ["escolinha_id"]
            isOneToOne: false
            referencedRelation: "escolinhas_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      responsaveis_publico: {
        Row: {
          id: string | null
          nome: string | null
        }
        Insert: {
          id?: string | null
          nome?: string | null
        }
        Update: {
          id?: string | null
          nome?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_pedido: { Args: { p_pedido_id: string }; Returns: undefined }
      check_carreira_atividade_limit: {
        Args: { p_crianca_id: string; p_user_id: string }
        Returns: Json
      }
      cleanup_expired_temp_passwords: { Args: never; Returns: undefined }
      create_pedido: {
        Args: {
          p_crianca_id: string
          p_escolinha_id: string
          p_itens: Json
          p_observacoes?: string
        }
        Returns: Json
      }
      crianca_has_public_profile: {
        Args: { p_crianca_id: string; p_data_type?: string }
        Returns: boolean
      }
      decrement_estoque: {
        Args: { p_produto_id: string; p_quantidade: number }
        Returns: undefined
      }
      decrement_product_stock: {
        Args: { p_pedido_id: string }
        Returns: undefined
      }
      evento_has_public_profile_child: {
        Args: { p_evento_id: string }
        Returns: boolean
      }
      generate_random_password: { Args: { length?: number }; Returns: string }
      get_aulas_do_responsavel: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      get_criancas_do_responsavel: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      get_escola_asaas_status: {
        Args: { p_escolinha_id: string }
        Returns: {
          asaas_status: string
          atualizado_em: string
          enviado_em: string
          has_cadastro: boolean
          subconta_criada: boolean
        }[]
      }
      get_escolinha_alunos_ativos: {
        Args: { p_escolinha_id: string }
        Returns: number
      }
      get_guardian_escolinha_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_guardian_pedidos: { Args: { p_user_id: string }; Returns: Json }
      get_guardian_products: {
        Args: { p_user_id: string }
        Returns: {
          ativo: boolean
          created_at: string
          descricao: string
          escolinha_id: string
          escolinha_nome: string
          estoque: number
          foto_url: string
          id: string
          nome: string
          tamanhos: Json
          tipo: string
          valor: number
        }[]
      }
      get_responsavel_id: { Args: { _user_id: string }; Returns: string }
      get_responsavel_id_simple: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_school_parent_access_analytics: {
        Args: { p_escolinha_id: string }
        Returns: {
          acessos_30_dias: number
          acessos_7_dias: number
          primeiro_acesso: string
          responsavel_id: string
          responsavel_nome: string
          tem_acesso: boolean
          total_acessos: number
          ultimo_acesso: string
        }[]
      }
      get_school_pedidos: { Args: { p_escolinha_id: string }; Returns: Json }
      get_school_products: {
        Args: { p_escolinha_id: string }
        Returns: {
          ativo: boolean
          created_at: string
          descricao: string
          escolinha_id: string
          estoque: number
          foto_url: string
          id: string
          nome: string
          tipo: string
          valor: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      guardian_can_access_escolinha: {
        Args: { _escolinha_id: string }
        Returns: boolean
      }
      guardian_can_access_evento: {
        Args: { _evento_id: string }
        Returns: boolean
      }
      guardian_can_access_time: { Args: { _time_id: string }; Returns: boolean }
      guardian_can_access_turma: {
        Args: { _turma_id: string }
        Returns: boolean
      }
      guardian_can_view_crianca_escolinha: {
        Args: { _crianca_id: string }
        Returns: boolean
      }
      guardian_can_view_escolinha: {
        Args: { _escolinha_id: string }
        Returns: boolean
      }
      guardian_owns_crianca: { Args: { _crianca_id: string }; Returns: boolean }
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
      is_admin_of_aula_no_rls: { Args: { p_aula_id: string }; Returns: boolean }
      is_admin_of_escolinha: {
        Args: { _escolinha_id: string }
        Returns: boolean
      }
      is_admin_of_turma: { Args: { p_turma_id: string }; Returns: boolean }
      is_admin_of_turma_no_rls: {
        Args: { p_turma_id: string }
        Returns: boolean
      }
      is_perfil_atleta_owner: {
        Args: { check_crianca_id: string; check_user_id: string }
        Returns: boolean
      }
      is_responsavel: { Args: { _user_id: string }; Returns: boolean }
      is_teacher_of_aula_no_rls: {
        Args: { p_aula_id: string }
        Returns: boolean
      }
      is_teacher_of_escolinha: {
        Args: { _escolinha_id: string }
        Returns: boolean
      }
      is_teacher_of_escolinha_no_rls: {
        Args: { _escolinha_id: string }
        Returns: boolean
      }
      is_teacher_of_turma_no_rls: {
        Args: { p_turma_id: string }
        Returns: boolean
      }
      pode_usar_atividades_externas: {
        Args: { p_crianca_id?: string; p_user_id: string }
        Returns: boolean
      }
      school_admin_can_access_aula: {
        Args: { _aula_id: string }
        Returns: boolean
      }
      school_admin_can_access_crianca: {
        Args: { _crianca_id: string }
        Returns: boolean
      }
      school_admin_can_access_presenca: {
        Args: { _aula_id: string }
        Returns: boolean
      }
      school_admin_can_access_profile: {
        Args: { _profile_user_id: string }
        Returns: boolean
      }
      school_admin_can_access_responsavel: {
        Args: { _responsavel_id: string }
        Returns: boolean
      }
      school_admin_can_access_turma: {
        Args: { _turma_id: string }
        Returns: boolean
      }
      school_admin_can_access_turma_for_aula: {
        Args: { _turma_id: string }
        Returns: boolean
      }
      teacher_can_access_crianca: {
        Args: { _crianca_id: string }
        Returns: boolean
      }
      teacher_can_view_crianca_escolinha: {
        Args: { _crianca_id: string; _escolinha_id: string }
        Returns: boolean
      }
      teacher_can_view_escolinha: {
        Args: { _escolinha_id: string }
        Returns: boolean
      }
      teacher_owns_turma: { Args: { _turma_id: string }; Returns: boolean }
      unaccent: { Args: { "": string }; Returns: string }
      update_child_photo: {
        Args: { p_crianca_id: string; p_foto_url: string }
        Returns: boolean
      }
      update_pedido_status: {
        Args: { p_pedido_id: string; p_status: string }
        Returns: undefined
      }
      upsert_produto: {
        Args: {
          p_ativo: boolean
          p_descricao: string
          p_escolinha_id: string
          p_estoque: number
          p_foto_url: string
          p_id: string
          p_nome: string
          p_tipo: string
          p_valor: number
        }
        Returns: undefined
      }
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
      aula_status: "normal" | "cancelada" | "extra"
      escola_status_financeiro:
        | "NAO_CONFIGURADO"
        | "EM_ANALISE"
        | "APROVADO"
        | "REPROVADO"
      escolinha_status: "em_teste" | "ativa" | "inativa" | "suspensa"
      evento_status: "agendado" | "realizado" | "finalizado"
      evento_tipo: "amistoso" | "campeonato"
      indicacao_status: "novo" | "contatado" | "matriculado" | "nao_convertido"
      status_financeiro: "em_dia" | "atrasado" | "suspenso"
      torneio_abrangencia:
        | "municipal"
        | "regional"
        | "estadual"
        | "nacional"
        | "internacional"
      turma_status: "ativa" | "inativa" | "encerrada"
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
      aula_status: ["normal", "cancelada", "extra"],
      escola_status_financeiro: [
        "NAO_CONFIGURADO",
        "EM_ANALISE",
        "APROVADO",
        "REPROVADO",
      ],
      escolinha_status: ["em_teste", "ativa", "inativa", "suspensa"],
      evento_status: ["agendado", "realizado", "finalizado"],
      evento_tipo: ["amistoso", "campeonato"],
      indicacao_status: ["novo", "contatado", "matriculado", "nao_convertido"],
      status_financeiro: ["em_dia", "atrasado", "suspenso"],
      torneio_abrangencia: [
        "municipal",
        "regional",
        "estadual",
        "nacional",
        "internacional",
      ],
      turma_status: ["ativa", "inativa", "encerrada"],
      user_role: ["admin", "school", "teacher", "guardian"],
    },
  },
} as const
