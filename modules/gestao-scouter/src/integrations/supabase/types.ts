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
      ai_provider_configs: {
        Row: {
          api_key_encrypted: string | null
          config: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          model: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          model: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          model?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      bitrix_projetos_comerciais: {
        Row: {
          created_at: string | null
          id: number
          raw_data: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: number
          raw_data?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          raw_data?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bitrix_scouters: {
        Row: {
          chave: string | null
          created_at: string | null
          geolocalizacao: string | null
          id: number
          latitude: number | null
          longitude: number | null
          raw_data: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          chave?: string | null
          created_at?: string | null
          geolocalizacao?: string | null
          id: number
          latitude?: number | null
          longitude?: number | null
          raw_data?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          chave?: string | null
          created_at?: string | null
          geolocalizacao?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          raw_data?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      code_snapshots: {
        Row: {
          analysis_id: string | null
          created_at: string
          description: string | null
          file_count: number | null
          id: string
          snapshot_data: Json
          total_size_bytes: number | null
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          description?: string | null
          file_count?: number | null
          id?: string
          snapshot_data: Json
          total_size_bytes?: number | null
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          description?: string | null
          file_count?: number | null
          id?: string
          snapshot_data?: Json
          total_size_bytes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_snapshots_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "error_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_configs: {
        Row: {
          config: Json
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dashboard_indicator_configs: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          name: string
          position: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string | null
          id?: string
          name: string
          position?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          name?: string
          position?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      error_analyses: {
        Row: {
          ai_model: string | null
          ai_provider: string
          analysis_result: Json | null
          analyzed_at: string | null
          console_logs: Json | null
          created_at: string
          database_context: Json | null
          element_context: Json | null
          error_context: Json | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          log_context: Json | null
          metadata: Json | null
          network_requests: Json | null
          route: string | null
          source_context: Json | null
          status: string
          suggested_fixes: Json | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string
          analysis_result?: Json | null
          analyzed_at?: string | null
          console_logs?: Json | null
          created_at?: string
          database_context?: Json | null
          element_context?: Json | null
          error_context?: Json | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          log_context?: Json | null
          metadata?: Json | null
          network_requests?: Json | null
          route?: string | null
          source_context?: Json | null
          status?: string
          suggested_fixes?: Json | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string
          analysis_result?: Json | null
          analyzed_at?: string | null
          console_logs?: Json | null
          created_at?: string
          database_context?: Json | null
          element_context?: Json | null
          error_context?: Json | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          log_context?: Json | null
          metadata?: Json | null
          network_requests?: Json | null
          route?: string | null
          source_context?: Json | null
          status?: string
          suggested_fixes?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      fix_suggestions: {
        Row: {
          analysis_id: string
          applied_at: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          diff: string | null
          file_path: string | null
          fix_description: string
          fix_title: string
          fix_type: string
          id: string
          original_code: string | null
          snapshot_id: string | null
          status: string
          suggested_code: string | null
        }
        Insert: {
          analysis_id: string
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          diff?: string | null
          file_path?: string | null
          fix_description: string
          fix_title: string
          fix_type: string
          id?: string
          original_code?: string | null
          snapshot_id?: string | null
          status?: string
          suggested_code?: string | null
        }
        Update: {
          analysis_id?: string
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          diff?: string | null
          file_path?: string | null
          fix_description?: string
          fix_title?: string
          fix_type?: string
          id?: string
          original_code?: string | null
          snapshot_id?: string | null
          status?: string
          suggested_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fix_suggestions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "error_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          column_mapping: Json
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          errors: Json | null
          failed_rows: number | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          inserted_rows: number | null
          processed_rows: number | null
          started_at: string | null
          status: string
          target_table: string
          total_rows: number | null
          user_id: string | null
        }
        Insert: {
          column_mapping: Json
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          errors?: Json | null
          failed_rows?: number | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          inserted_rows?: number | null
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          target_table?: string
          total_rows?: number | null
          user_id?: string | null
        }
        Update: {
          column_mapping?: Json
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          errors?: Json | null
          failed_rows?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          inserted_rows?: number | null
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          target_table?: string
          total_rows?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          age: number | null
          analisado_em: string | null
          analisado_por: string | null
          aprovado: boolean | null
          bitrix_projeto_id: number | null
          bitrix_scouter_id: number | null
          cadastro_existe_foto: boolean | null
          celular: string | null
          commercial_project_id: string | null
          compareceu: boolean | null
          criado: string | null
          data_confirmacao_ficha: string | null
          data_criacao_agendamento: string | null
          data_criacao_ficha: string | null
          data_retorno_ligacao: string | null
          date_modify: string | null
          deleted: boolean | null
          email: string | null
          etapa: string | null
          etapa_fluxo: string | null
          etapa_funil: string | null
          ficha_confirmada: string | null
          fonte: string | null
          foto: string | null
          funil_fichas: string | null
          gerenciamento_funil: string | null
          horario_agendamento: string | null
          id: number
          last_sync_at: string | null
          last_synced_at: string | null
          latitude: number | null
          local_abordagem: string | null
          local_da_abordagem: string | null
          localizacao: string | null
          longitude: number | null
          maxsystem_id_ficha: string | null
          modificado: string | null
          needs_enrichment: boolean | null
          nome: string | null
          nome_modelo: string | null
          op_telemarketing: string | null
          origem_sincronizacao: string | null
          presenca_confirmada: boolean | null
          projeto: string | null
          raw: Json | null
          responsible: string | null
          responsible_user_id: string | null
          scouter: string | null
          scouter_id: number | null
          status_fluxo: string | null
          status_tabulacao: string | null
          supervisor: string | null
          sync_source: string | null
          sync_status: string | null
          telefone: string | null
          telefone_casa: string | null
          telefone_trabalho: string | null
          ultima_sincronizacao: string | null
          updated_at: string | null
          valor_ficha: number | null
        }
        Insert: {
          age?: number | null
          analisado_em?: string | null
          analisado_por?: string | null
          aprovado?: boolean | null
          bitrix_projeto_id?: number | null
          bitrix_scouter_id?: number | null
          cadastro_existe_foto?: boolean | null
          celular?: string | null
          commercial_project_id?: string | null
          compareceu?: boolean | null
          criado?: string | null
          data_confirmacao_ficha?: string | null
          data_criacao_agendamento?: string | null
          data_criacao_ficha?: string | null
          data_retorno_ligacao?: string | null
          date_modify?: string | null
          deleted?: boolean | null
          email?: string | null
          etapa?: string | null
          etapa_fluxo?: string | null
          etapa_funil?: string | null
          ficha_confirmada?: string | null
          fonte?: string | null
          foto?: string | null
          funil_fichas?: string | null
          gerenciamento_funil?: string | null
          horario_agendamento?: string | null
          id?: number
          last_sync_at?: string | null
          last_synced_at?: string | null
          latitude?: number | null
          local_abordagem?: string | null
          local_da_abordagem?: string | null
          localizacao?: string | null
          longitude?: number | null
          maxsystem_id_ficha?: string | null
          modificado?: string | null
          needs_enrichment?: boolean | null
          nome?: string | null
          nome_modelo?: string | null
          op_telemarketing?: string | null
          origem_sincronizacao?: string | null
          presenca_confirmada?: boolean | null
          projeto?: string | null
          raw?: Json | null
          responsible?: string | null
          responsible_user_id?: string | null
          scouter?: string | null
          scouter_id?: number | null
          status_fluxo?: string | null
          status_tabulacao?: string | null
          supervisor?: string | null
          sync_source?: string | null
          sync_status?: string | null
          telefone?: string | null
          telefone_casa?: string | null
          telefone_trabalho?: string | null
          ultima_sincronizacao?: string | null
          updated_at?: string | null
          valor_ficha?: number | null
        }
        Update: {
          age?: number | null
          analisado_em?: string | null
          analisado_por?: string | null
          aprovado?: boolean | null
          bitrix_projeto_id?: number | null
          bitrix_scouter_id?: number | null
          cadastro_existe_foto?: boolean | null
          celular?: string | null
          commercial_project_id?: string | null
          compareceu?: boolean | null
          criado?: string | null
          data_confirmacao_ficha?: string | null
          data_criacao_agendamento?: string | null
          data_criacao_ficha?: string | null
          data_retorno_ligacao?: string | null
          date_modify?: string | null
          deleted?: boolean | null
          email?: string | null
          etapa?: string | null
          etapa_fluxo?: string | null
          etapa_funil?: string | null
          ficha_confirmada?: string | null
          fonte?: string | null
          foto?: string | null
          funil_fichas?: string | null
          gerenciamento_funil?: string | null
          horario_agendamento?: string | null
          id?: number
          last_sync_at?: string | null
          last_synced_at?: string | null
          latitude?: number | null
          local_abordagem?: string | null
          local_da_abordagem?: string | null
          localizacao?: string | null
          longitude?: number | null
          maxsystem_id_ficha?: string | null
          modificado?: string | null
          needs_enrichment?: boolean | null
          nome?: string | null
          nome_modelo?: string | null
          op_telemarketing?: string | null
          origem_sincronizacao?: string | null
          presenca_confirmada?: boolean | null
          projeto?: string | null
          raw?: Json | null
          responsible?: string | null
          responsible_user_id?: string | null
          scouter?: string | null
          scouter_id?: number | null
          status_fluxo?: string | null
          status_tabulacao?: string | null
          supervisor?: string | null
          sync_source?: string | null
          sync_status?: string | null
          telefone?: string | null
          telefone_casa?: string | null
          telefone_trabalho?: string | null
          ultima_sincronizacao?: string | null
          updated_at?: string | null
          valor_ficha?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_scouter_id_fkey"
            columns: ["scouter_id"]
            isOneToOne: false
            referencedRelation: "scouter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          allowed: boolean
          id: number
          module: string
          role_id: number
        }
        Insert: {
          action: string
          allowed?: boolean
          id?: number
          module: string
          role_id: number
        }
        Update: {
          action?: string
          allowed?: boolean
          id?: number
          module?: string
          role_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      scouter_profiles: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: number
          name: string
          nome: string | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          name: string
          nome?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          name?: string
          nome?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scouter_profiles_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string | null
          endpoint: string | null
          error_message: string | null
          errors: Json | null
          execution_time_ms: number | null
          id: string
          processing_time_ms: number | null
          records_count: number | null
          records_synced: number | null
          request_params: Json | null
          response_data: Json | null
          started_at: string | null
          status: string | null
          sync_direction: string | null
          table_name: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          errors?: Json | null
          execution_time_ms?: number | null
          id?: string
          processing_time_ms?: number | null
          records_count?: number | null
          records_synced?: number | null
          request_params?: Json | null
          response_data?: Json | null
          started_at?: string | null
          status?: string | null
          sync_direction?: string | null
          table_name?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          errors?: Json | null
          execution_time_ms?: number | null
          id?: string
          processing_time_ms?: number | null
          records_count?: number | null
          records_synced?: number | null
          request_params?: Json | null
          response_data?: Json | null
          started_at?: string | null
          status?: string | null
          sync_direction?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      sync_logs_detailed: {
        Row: {
          created_at: string | null
          endpoint: string | null
          error_message: string | null
          errors: Json | null
          execution_time_ms: number | null
          id: string
          processing_time_ms: number | null
          records_count: number | null
          records_synced: number | null
          request_params: Json | null
          response_data: Json | null
          started_at: string | null
          status: string | null
          sync_direction: string | null
          table_name: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          errors?: Json | null
          execution_time_ms?: number | null
          id?: string
          processing_time_ms?: number | null
          records_count?: number | null
          records_synced?: number | null
          request_params?: Json | null
          response_data?: Json | null
          started_at?: string | null
          status?: string | null
          sync_direction?: string | null
          table_name?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          errors?: Json | null
          execution_time_ms?: number | null
          id?: string
          processing_time_ms?: number | null
          records_count?: number | null
          records_synced?: number | null
          request_params?: Json | null
          response_data?: Json | null
          started_at?: string | null
          status?: string | null
          sync_direction?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          created_at: string | null
          id: string
          last_error: string | null
          max_retries: number | null
          next_retry_at: string | null
          operation: string
          payload: Json
          processed_at: string | null
          retry_count: number | null
          row_id: string
          status: string
          sync_direction: string
          table_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          operation: string
          payload: Json
          processed_at?: string | null
          retry_count?: number | null
          row_id: string
          status?: string
          sync_direction?: string
          table_name?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          operation?: string
          payload?: Json
          processed_at?: string | null
          retry_count?: number | null
          row_id?: string
          status?: string
          sync_direction?: string
          table_name?: string
        }
        Relationships: []
      }
      sync_status: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          last_error: string | null
          last_run_at: string | null
          last_sync_at: string | null
          last_sync_success: boolean | null
          project_name: string
          status: string | null
          total_records: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_sync_at?: string | null
          last_sync_success?: boolean | null
          project_name: string
          status?: string | null
          total_records?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_sync_at?: string | null
          last_sync_success?: boolean | null
          project_name?: string
          status?: string | null
          total_records?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tabulador_config: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          project_id: string
          publishable_key: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          project_id: string
          publishable_key?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          project_id?: string
          publishable_key?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role_id: number
          scouter_id: number | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          role_id: number
          scouter_id?: number | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role_id?: number
          scouter_id?: number | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_table_columns: {
        Args: { table_name: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_permissions: {
        Args: never
        Returns: {
          action: string
          allowed: boolean
          id: number
          module: string
          role: string
          role_id: number
        }[]
      }
      list_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      list_users_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          role_id: number
          scouter_id: number
          supervisor_id: string
        }[]
      }
      set_lead_analysis: {
        Args: { p_aprovado: boolean; p_lead_id: number }
        Returns: undefined
      }
      set_permission: {
        Args: {
          p_action: string
          p_allowed: boolean
          p_module: string
          p_role_id: number
        }
        Returns: undefined
      }
      update_user_role: {
        Args: {
          p_role_id: number
          p_scouter_id?: number
          p_supervisor_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "supervisor"
        | "scouter"
        | "gestor_telemarketing"
        | "telemarketing"
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
      app_role: [
        "admin",
        "supervisor",
        "scouter",
        "gestor_telemarketing",
        "telemarketing",
      ],
    },
  },
} as const
