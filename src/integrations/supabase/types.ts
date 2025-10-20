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
      actions_log: {
        Row: {
          action_label: string | null
          created_at: string | null
          error: string | null
          id: string
          lead_id: number
          payload: Json | null
          status: string | null
        }
        Insert: {
          action_label?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          lead_id: number
          payload?: Json | null
          status?: string | null
        }
        Update: {
          action_label?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          lead_id?: number
          payload?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      agent_telemarketing_mapping: {
        Row: {
          bitrix_telemarketing_id: number
          bitrix_telemarketing_name: string | null
          chatwoot_agent_email: string | null
          chatwoot_agent_id: number | null
          commercial_project_id: string | null
          created_at: string
          created_by: string | null
          id: string
          supervisor_id: string | null
          tabuladormax_user_id: string | null
          updated_at: string
        }
        Insert: {
          bitrix_telemarketing_id: number
          bitrix_telemarketing_name?: string | null
          chatwoot_agent_email?: string | null
          chatwoot_agent_id?: number | null
          commercial_project_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          supervisor_id?: string | null
          tabuladormax_user_id?: string | null
          updated_at?: string
        }
        Update: {
          bitrix_telemarketing_id?: number
          bitrix_telemarketing_name?: string | null
          chatwoot_agent_email?: string | null
          chatwoot_agent_id?: number | null
          commercial_project_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          supervisor_id?: string | null
          tabuladormax_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_telemarketing_mapping_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_telemarketing_mapping_tabuladormax_user_id_fkey"
            columns: ["tabuladormax_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_update_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_details: Json | null
          error_rows: number | null
          field_name: string
          file_path: string
          id: string
          processed_rows: number | null
          started_at: string | null
          status: string
          total_rows: number | null
          updated_at: string | null
          updated_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          error_rows?: number | null
          field_name: string
          file_path: string
          id?: string
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          updated_at?: string | null
          updated_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          error_rows?: number | null
          field_name?: string
          file_path?: string
          id?: string
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          updated_at?: string | null
          updated_rows?: number | null
        }
        Relationships: []
      }
      bitrix_import_jobs: {
        Row: {
          batch_size: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          error_details: Json | null
          error_leads: number | null
          id: string
          imported_leads: number | null
          last_completed_date: string | null
          pause_reason: string | null
          paused_at: string | null
          processing_date: string | null
          start_date: string
          started_at: string | null
          status: string
          total_leads: number | null
          updated_at: string | null
        }
        Insert: {
          batch_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          error_details?: Json | null
          error_leads?: number | null
          id?: string
          imported_leads?: number | null
          last_completed_date?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          processing_date?: string | null
          start_date: string
          started_at?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          error_details?: Json | null
          error_leads?: number | null
          id?: string
          imported_leads?: number | null
          last_completed_date?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          processing_date?: string | null
          start_date?: string
          started_at?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bitrix_sync_config: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
      button_categories: {
        Row: {
          created_at: string
          id: string
          label: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      button_config: {
        Row: {
          action_type: string | null
          additional_fields: Json | null
          category: string | null
          color: string
          created_at: string | null
          description: string | null
          field: string
          field_type: string | null
          hotkey: string | null
          id: string
          label: string
          pos: Json | null
          sort: number | null
          sub_buttons: Json | null
          sync_target: string | null
          transfer_conversation: boolean | null
          value: string | null
          webhook_url: string | null
        }
        Insert: {
          action_type?: string | null
          additional_fields?: Json | null
          category?: string | null
          color?: string
          created_at?: string | null
          description?: string | null
          field: string
          field_type?: string | null
          hotkey?: string | null
          id?: string
          label: string
          pos?: Json | null
          sort?: number | null
          sub_buttons?: Json | null
          sync_target?: string | null
          transfer_conversation?: boolean | null
          value?: string | null
          webhook_url?: string | null
        }
        Update: {
          action_type?: string | null
          additional_fields?: Json | null
          category?: string | null
          color?: string
          created_at?: string | null
          description?: string | null
          field?: string
          field_type?: string | null
          hotkey?: string | null
          id?: string
          label?: string
          pos?: Json | null
          sort?: number | null
          sub_buttons?: Json | null
          sync_target?: string | null
          transfer_conversation?: boolean | null
          value?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          agent: string | null
          created_at: string | null
          disposition: string | null
          duration_sec: number | null
          ended_at: string | null
          id: string
          lead_id: number
          recording_url: string | null
          started_at: string | null
        }
        Insert: {
          agent?: string | null
          created_at?: string | null
          disposition?: string | null
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          lead_id: number
          recording_url?: string | null
          started_at?: string | null
        }
        Update: {
          agent?: string | null
          created_at?: string | null
          disposition?: string | null
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          lead_id?: number
          recording_url?: string | null
          started_at?: string | null
        }
        Relationships: []
      }
      chatwoot_contacts: {
        Row: {
          additional_attributes: Json | null
          bitrix_id: string
          contact_id: number | null
          conversation_id: number | null
          created_at: string
          custom_attributes: Json | null
          email: string | null
          id: string
          last_activity_at: number | null
          last_sync_at: string | null
          name: string | null
          phone_number: string | null
          sync_source: string | null
          sync_status: string | null
          thumbnail: string | null
          updated_at: string
        }
        Insert: {
          additional_attributes?: Json | null
          bitrix_id: string
          contact_id?: number | null
          conversation_id?: number | null
          created_at?: string
          custom_attributes?: Json | null
          email?: string | null
          id?: string
          last_activity_at?: number | null
          last_sync_at?: string | null
          name?: string | null
          phone_number?: string | null
          sync_source?: string | null
          sync_status?: string | null
          thumbnail?: string | null
          updated_at?: string
        }
        Update: {
          additional_attributes?: Json | null
          bitrix_id?: string
          contact_id?: number | null
          conversation_id?: number | null
          created_at?: string
          custom_attributes?: Json | null
          email?: string | null
          id?: string
          last_activity_at?: number | null
          last_sync_at?: string | null
          name?: string | null
          phone_number?: string | null
          sync_source?: string | null
          sync_status?: string | null
          thumbnail?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commercial_projects: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_kv: {
        Row: {
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      csv_import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_details: Json | null
          error_rows: number | null
          file_path: string
          id: string
          imported_rows: number | null
          processed_rows: number | null
          started_at: string | null
          status: string
          total_rows: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          error_rows?: number | null
          file_path: string
          id?: string
          imported_rows?: number | null
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          error_rows?: number | null
          file_path?: string
          id?: string
          imported_rows?: number | null
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gestao_scouter_config: {
        Row: {
          active: boolean
          anon_key: string
          created_at: string
          id: string
          project_url: string
          sync_enabled: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          anon_key: string
          created_at?: string
          id?: string
          project_url: string
          sync_enabled?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          anon_key?: string
          created_at?: string
          id?: string
          project_url?: string
          sync_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      gestao_scouter_export_errors: {
        Row: {
          created_at: string | null
          error_details: Json | null
          error_message: string
          fields_sent: Json
          id: string
          job_id: string
          lead_id: number | null
          lead_snapshot: Json
          response_body: Json | null
          response_status: number | null
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          error_message: string
          fields_sent: Json
          id?: string
          job_id: string
          lead_id?: number | null
          lead_snapshot: Json
          response_body?: Json | null
          response_status?: number | null
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          error_message?: string
          fields_sent?: Json
          id?: string
          job_id?: string
          lead_id?: number | null
          lead_snapshot?: Json
          response_body?: Json | null
          response_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gestao_scouter_export_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "gestao_scouter_export_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      gestao_scouter_export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          error_leads: number | null
          exported_leads: number | null
          id: string
          last_completed_date: string | null
          pause_reason: string | null
          paused_at: string | null
          processing_date: string | null
          start_date: string
          started_at: string | null
          status: string
          total_leads: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          error_leads?: number | null
          exported_leads?: number | null
          id?: string
          last_completed_date?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          processing_date?: string | null
          start_date: string
          started_at?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          error_leads?: number | null
          exported_leads?: number | null
          id?: string
          last_completed_date?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          processing_date?: string | null
          start_date?: string
          started_at?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          age: number | null
          bitrix_telemarketing_id: number | null
          cadastro_existe_foto: boolean | null
          celular: string | null
          commercial_project_id: string | null
          compareceu: boolean | null
          criado: string | null
          data_agendamento: string | null
          data_confirmacao_ficha: string | null
          data_criacao_agendamento: string | null
          data_criacao_ficha: string | null
          data_retorno_ligacao: string | null
          date_modify: string | null
          etapa: string | null
          etapa_fluxo: string | null
          etapa_funil: string | null
          ficha_confirmada: boolean | null
          fonte: string | null
          funil_fichas: string | null
          gerenciamento_funil: string | null
          gestao_scouter: string | null
          horario_agendamento: string | null
          id: number
          last_sync_at: string | null
          local_abordagem: string | null
          maxsystem_id_ficha: string | null
          name: string | null
          nome_modelo: string | null
          op_telemarketing: string | null
          photo_url: string | null
          presenca_confirmada: boolean | null
          raw: Json | null
          responsible: string | null
          responsible_user_id: string | null
          scouter: string | null
          status_fluxo: string | null
          status_tabulacao: string | null
          sync_error: string | null
          sync_source: string | null
          sync_status: string | null
          telefone_casa: string | null
          telefone_trabalho: string | null
          updated_at: string | null
          valor_ficha: number | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          bitrix_telemarketing_id?: number | null
          cadastro_existe_foto?: boolean | null
          celular?: string | null
          commercial_project_id?: string | null
          compareceu?: boolean | null
          criado?: string | null
          data_agendamento?: string | null
          data_confirmacao_ficha?: string | null
          data_criacao_agendamento?: string | null
          data_criacao_ficha?: string | null
          data_retorno_ligacao?: string | null
          date_modify?: string | null
          etapa?: string | null
          etapa_fluxo?: string | null
          etapa_funil?: string | null
          ficha_confirmada?: boolean | null
          fonte?: string | null
          funil_fichas?: string | null
          gerenciamento_funil?: string | null
          gestao_scouter?: string | null
          horario_agendamento?: string | null
          id: number
          last_sync_at?: string | null
          local_abordagem?: string | null
          maxsystem_id_ficha?: string | null
          name?: string | null
          nome_modelo?: string | null
          op_telemarketing?: string | null
          photo_url?: string | null
          presenca_confirmada?: boolean | null
          raw?: Json | null
          responsible?: string | null
          responsible_user_id?: string | null
          scouter?: string | null
          status_fluxo?: string | null
          status_tabulacao?: string | null
          sync_error?: string | null
          sync_source?: string | null
          sync_status?: string | null
          telefone_casa?: string | null
          telefone_trabalho?: string | null
          updated_at?: string | null
          valor_ficha?: number | null
        }
        Update: {
          address?: string | null
          age?: number | null
          bitrix_telemarketing_id?: number | null
          cadastro_existe_foto?: boolean | null
          celular?: string | null
          commercial_project_id?: string | null
          compareceu?: boolean | null
          criado?: string | null
          data_agendamento?: string | null
          data_confirmacao_ficha?: string | null
          data_criacao_agendamento?: string | null
          data_criacao_ficha?: string | null
          data_retorno_ligacao?: string | null
          date_modify?: string | null
          etapa?: string | null
          etapa_fluxo?: string | null
          etapa_funil?: string | null
          ficha_confirmada?: boolean | null
          fonte?: string | null
          funil_fichas?: string | null
          gerenciamento_funil?: string | null
          gestao_scouter?: string | null
          horario_agendamento?: string | null
          id?: number
          last_sync_at?: string | null
          local_abordagem?: string | null
          maxsystem_id_ficha?: string | null
          name?: string | null
          nome_modelo?: string | null
          op_telemarketing?: string | null
          photo_url?: string | null
          presenca_confirmada?: boolean | null
          raw?: Json | null
          responsible?: string | null
          responsible_user_id?: string | null
          scouter?: string | null
          status_fluxo?: string | null
          status_tabulacao?: string | null
          sync_error?: string | null
          sync_source?: string | null
          sync_status?: string | null
          telefone_casa?: string | null
          telefone_trabalho?: string | null
          updated_at?: string | null
          valor_ficha?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          label: string
          name: string
          resource: string
          scope: Database["public"]["Enums"]["permission_scope"]
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          label: string
          name: string
          resource: string
          scope?: Database["public"]["Enums"]["permission_scope"]
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          name?: string
          resource?: string
          scope?: Database["public"]["Enums"]["permission_scope"]
        }
        Relationships: []
      }
      profile_field_mapping: {
        Row: {
          chatwoot_field: string
          created_at: string | null
          display_name: string | null
          id: string
          is_profile_photo: boolean | null
          profile_field: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          chatwoot_field: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_profile_photo?: boolean | null
          profile_field: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          chatwoot_field?: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_profile_photo?: boolean | null
          profile_field?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          scope: Database["public"]["Enums"]["permission_scope"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          scope: Database["public"]["Enums"]["permission_scope"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope?: Database["public"]["Enums"]["permission_scope"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_events: {
        Row: {
          created_at: string | null
          direction: string
          error_message: string | null
          event_type: string
          id: string
          lead_id: number
          status: string
          sync_duration_ms: number | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          error_message?: string | null
          event_type: string
          id?: string
          lead_id: number
          status: string
          sync_duration_ms?: number | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          error_message?: string | null
          event_type?: string
          id?: string
          lead_id?: number
          status?: string
          sync_duration_ms?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "agent" | "supervisor"
      permission_scope: "global" | "department" | "own"
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
      app_role: ["admin", "manager", "agent", "supervisor"],
      permission_scope: ["global", "department", "own"],
    },
  },
} as const
