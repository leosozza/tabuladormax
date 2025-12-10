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
      agent_template_permissions: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_template_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_template_permissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "gupshup_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_template_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_instructions: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          file_path: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          priority: number | null
          title: string
          type: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          priority?: number | null
          title: string
          type: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          priority?: number | null
          title?: string
          type?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      api_key_usage_logs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit_per_minute: number | null
          scopes: string[]
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit_per_minute?: number | null
          scopes?: string[]
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit_per_minute?: number | null
          scopes?: string[]
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      app_releases: {
        Row: {
          file_path: string
          file_size: number
          id: string
          is_latest: boolean | null
          notes: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          version: string
        }
        Insert: {
          file_path: string
          file_size: number
          id?: string
          is_latest?: boolean | null
          notes?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          version: string
        }
        Update: {
          file_path?: string
          file_size?: number
          id?: string
          is_latest?: boolean | null
          notes?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          version?: string
        }
        Relationships: []
      }
      app_resources: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_routes: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
          path: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
          path: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
          path?: string
          updated_at?: string
        }
        Relationships: []
      }
      bitrix_field_mappings: {
        Row: {
          active: boolean | null
          bitrix_field: string
          bitrix_field_type: string | null
          created_at: string | null
          id: string
          last_sync_error: string | null
          last_sync_success: string | null
          notes: string | null
          priority: number | null
          tabuladormax_field: string
          tabuladormax_field_type: string | null
          transform_function: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          bitrix_field: string
          bitrix_field_type?: string | null
          created_at?: string | null
          id?: string
          last_sync_error?: string | null
          last_sync_success?: string | null
          notes?: string | null
          priority?: number | null
          tabuladormax_field: string
          tabuladormax_field_type?: string | null
          transform_function?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          bitrix_field?: string
          bitrix_field_type?: string | null
          created_at?: string | null
          id?: string
          last_sync_error?: string | null
          last_sync_success?: string | null
          notes?: string | null
          priority?: number | null
          tabuladormax_field?: string
          tabuladormax_field_type?: string | null
          transform_function?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bitrix_fields_cache: {
        Row: {
          cached_at: string | null
          custom_title_set_at: string | null
          custom_title_set_by: string | null
          display_name: string | null
          field_id: string
          field_title: string | null
          field_type: string | null
          id: string
          list_items: Json | null
          updated_at: string | null
        }
        Insert: {
          cached_at?: string | null
          custom_title_set_at?: string | null
          custom_title_set_by?: string | null
          display_name?: string | null
          field_id: string
          field_title?: string | null
          field_type?: string | null
          id?: string
          list_items?: Json | null
          updated_at?: string | null
        }
        Update: {
          cached_at?: string | null
          custom_title_set_at?: string | null
          custom_title_set_by?: string | null
          display_name?: string | null
          field_id?: string
          field_title?: string | null
          field_type?: string | null
          id?: string
          list_items?: Json | null
          updated_at?: string | null
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
      bitrix_source_mapping: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bitrix_spa_entities: {
        Row: {
          bitrix_item_id: number
          cached_at: string | null
          entity_type_id: number
          id: string
          photo_url: string | null
          stage_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          bitrix_item_id: number
          cached_at?: string | null
          entity_type_id: number
          id?: string
          photo_url?: string | null
          stage_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          bitrix_item_id?: number
          cached_at?: string | null
          entity_type_id?: number
          id?: string
          photo_url?: string | null
          stage_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bitrix_stage_mapping: {
        Row: {
          app_status: string
          created_at: string | null
          entity_type_id: number
          id: string
          stage_id: string
          stage_name: string
          updated_at: string | null
        }
        Insert: {
          app_status: string
          created_at?: string | null
          entity_type_id: number
          id?: string
          stage_id: string
          stage_name: string
          updated_at?: string | null
        }
        Update: {
          app_status?: string
          created_at?: string | null
          entity_type_id?: number
          id?: string
          stage_id?: string
          stage_name?: string
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
      bulk_message_logs: {
        Row: {
          completed_at: string | null
          conversation_ids: number[] | null
          created_at: string | null
          id: string
          results: Json | null
          template_id: string | null
          total_failed: number | null
          total_sent: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          conversation_ids?: number[] | null
          created_at?: string | null
          id?: string
          results?: Json | null
          template_id?: string | null
          total_failed?: number | null
          total_sent?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          conversation_ids?: number[] | null
          created_at?: string | null
          id?: string
          results?: Json | null
          template_id?: string | null
          total_failed?: number | null
          total_sent?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_message_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          last_customer_message_at: string | null
          last_message_at: string | null
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
          last_customer_message_at?: string | null
          last_message_at?: string | null
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
          last_customer_message_at?: string | null
          last_message_at?: string | null
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
      conversation_label_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          conversation_id: number
          id: string
          label_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          conversation_id: number
          id?: string
          label_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          conversation_id?: number
          id?: string
          label_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "conversation_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_labels: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          color: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      csv_field_mappings: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          csv_column: string
          id: string
          leads_column: string
          mapping_name: string
          notes: string | null
          priority: number | null
          transform_function: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          csv_column: string
          id?: string
          leads_column: string
          mapping_name: string
          notes?: string | null
          priority?: number | null
          transform_function?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          csv_column?: string
          id?: string
          leads_column?: string
          mapping_name?: string
          notes?: string | null
          priority?: number | null
          transform_function?: string | null
          updated_at?: string | null
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
          last_checkpoint_at: string | null
          processed_rows: number | null
          started_at: string | null
          status: string
          timeout_reason: string | null
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
          last_checkpoint_at?: string | null
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          timeout_reason?: string | null
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
          last_checkpoint_at?: string | null
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          timeout_reason?: string | null
          total_rows?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          label: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          label: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          label?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          assigned_by_id: number | null
          assigned_by_name: string | null
          bitrix_deal_id: number
          bitrix_lead_id: number | null
          category_id: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          close_date: string | null
          company_id: number | null
          contact_id: number | null
          created_at: string | null
          created_date: string | null
          currency_id: string | null
          date_modify: string | null
          id: string
          last_sync_at: string | null
          lead_id: number | null
          opportunity: number | null
          producer_id: string | null
          raw: Json | null
          stage_id: string | null
          sync_status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_by_id?: number | null
          assigned_by_name?: string | null
          bitrix_deal_id: number
          bitrix_lead_id?: number | null
          category_id?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          close_date?: string | null
          company_id?: number | null
          contact_id?: number | null
          created_at?: string | null
          created_date?: string | null
          currency_id?: string | null
          date_modify?: string | null
          id?: string
          last_sync_at?: string | null
          lead_id?: number | null
          opportunity?: number | null
          producer_id?: string | null
          raw?: Json | null
          stage_id?: string | null
          sync_status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_by_id?: number | null
          assigned_by_name?: string | null
          bitrix_deal_id?: number
          bitrix_lead_id?: number | null
          category_id?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          close_date?: string | null
          company_id?: number | null
          contact_id?: number | null
          created_at?: string | null
          created_date?: string | null
          currency_id?: string | null
          date_modify?: string | null
          id?: string
          last_sync_at?: string | null
          lead_id?: number | null
          opportunity?: number | null
          producer_id?: string | null
          raw?: Json | null
          stage_id?: string | null
          sync_status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      field_mapping_history: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          mapping_id: string
          new_values: Json | null
          old_values: Json | null
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          mapping_id: string
          new_values?: Json | null
          old_values?: Json | null
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          mapping_id?: string
          new_values?: Json | null
          old_values?: Json | null
          table_name?: string
        }
        Relationships: []
      }
      field_mappings: {
        Row: {
          active: boolean | null
          bitrix_display_name: string | null
          bitrix_field: string | null
          bitrix_field_type: string | null
          category: string
          created_at: string | null
          created_by: string | null
          default_visible: boolean | null
          display_name: string
          field_type: string
          formatter_function: string | null
          id: string
          notes: string | null
          priority: number | null
          sortable: boolean | null
          supabase_field: string
          supabase_field_type: string | null
          transform_function: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          bitrix_display_name?: string | null
          bitrix_field?: string | null
          bitrix_field_type?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          default_visible?: boolean | null
          display_name: string
          field_type?: string
          formatter_function?: string | null
          id?: string
          notes?: string | null
          priority?: number | null
          sortable?: boolean | null
          supabase_field: string
          supabase_field_type?: string | null
          transform_function?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          bitrix_display_name?: string | null
          bitrix_field?: string | null
          bitrix_field_type?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          default_visible?: boolean | null
          display_name?: string
          field_type?: string
          formatter_function?: string | null
          id?: string
          notes?: string | null
          priority?: number | null
          sortable?: boolean | null
          supabase_field?: string
          supabase_field_type?: string | null
          transform_function?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      gestao_scouter_field_mappings: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          created_by: string | null
          database_field: string
          default_visible: boolean | null
          display_name: string
          field_type: string
          formatter_function: string | null
          id: string
          priority: number | null
          sortable: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string | null
          created_by?: string | null
          database_field: string
          default_visible?: boolean | null
          display_name: string
          field_type: string
          formatter_function?: string | null
          id?: string
          priority?: number | null
          sortable?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          database_field?: string
          default_visible?: boolean | null
          display_name?: string
          field_type?: string
          formatter_function?: string | null
          id?: string
          priority?: number | null
          sortable?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      gupshup_templates: {
        Row: {
          category: string
          created_at: string | null
          display_name: string
          element_name: string
          id: string
          language_code: string
          metadata: Json | null
          preview_url: string | null
          status: string
          synced_at: string | null
          template_body: string
          template_id: string
          updated_at: string | null
          variables: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          display_name: string
          element_name: string
          id?: string
          language_code?: string
          metadata?: Json | null
          preview_url?: string | null
          status: string
          synced_at?: string | null
          template_body: string
          template_id: string
          updated_at?: string | null
          variables?: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          display_name?: string
          element_name?: string
          id?: string
          language_code?: string
          metadata?: Json | null
          preview_url?: string | null
          status?: string
          synced_at?: string | null
          template_body?: string
          template_id?: string
          updated_at?: string | null
          variables?: Json
        }
        Relationships: []
      }
      lead_call_records: {
        Row: {
          agent_code: string | null
          agent_id: string | null
          campaign_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          lead_id: number
          recording_path: string | null
          recording_url: string | null
          result: string | null
          started_at: string | null
          syscall_call_id: string | null
          tabulacao: string | null
        }
        Insert: {
          agent_code?: string | null
          agent_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_id: number
          recording_path?: string | null
          recording_url?: string | null
          result?: string | null
          started_at?: string | null
          syscall_call_id?: string | null
          tabulacao?: string | null
        }
        Update: {
          agent_code?: string | null
          agent_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_id?: number
          recording_path?: string | null
          recording_url?: string | null
          result?: string | null
          started_at?: string | null
          syscall_call_id?: string | null
          tabulacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_call_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "syscall_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_reprocess_jobs: {
        Row: {
          batch_size: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          date_from: string | null
          date_to: string | null
          error_details: Json | null
          error_leads: number | null
          id: string
          last_processed_id: number | null
          only_missing_fields: boolean | null
          processed_leads: number | null
          skipped_leads: number | null
          started_at: string | null
          status: string
          total_leads: number | null
          updated_at: string | null
          updated_leads: number | null
        }
        Insert: {
          batch_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          date_from?: string | null
          date_to?: string | null
          error_details?: Json | null
          error_leads?: number | null
          id?: string
          last_processed_id?: number | null
          only_missing_fields?: boolean | null
          processed_leads?: number | null
          skipped_leads?: number | null
          started_at?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string | null
          updated_leads?: number | null
        }
        Update: {
          batch_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          date_from?: string | null
          date_to?: string | null
          error_details?: Json | null
          error_leads?: number | null
          id?: string
          last_processed_id?: number | null
          only_missing_fields?: boolean | null
          processed_leads?: number | null
          skipped_leads?: number | null
          started_at?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string | null
          updated_leads?: number | null
        }
        Relationships: []
      }
      lead_resync_jobs: {
        Row: {
          batch_size: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_batch: number | null
          error_details: Json | null
          error_leads: number | null
          estimated_completion: string | null
          filter_criteria: Json | null
          id: string
          last_processed_lead_id: number | null
          mapping_id: string | null
          paused_at: string | null
          priority_fields: string[] | null
          processed_leads: number | null
          skipped_leads: number | null
          started_at: string | null
          status: string
          total_leads: number | null
          updated_at: string | null
          updated_leads: number | null
        }
        Insert: {
          batch_size?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_batch?: number | null
          error_details?: Json | null
          error_leads?: number | null
          estimated_completion?: string | null
          filter_criteria?: Json | null
          id?: string
          last_processed_lead_id?: number | null
          mapping_id?: string | null
          paused_at?: string | null
          priority_fields?: string[] | null
          processed_leads?: number | null
          skipped_leads?: number | null
          started_at?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string | null
          updated_leads?: number | null
        }
        Update: {
          batch_size?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_batch?: number | null
          error_details?: Json | null
          error_leads?: number | null
          estimated_completion?: string | null
          filter_criteria?: Json | null
          id?: string
          last_processed_lead_id?: number | null
          mapping_id?: string | null
          paused_at?: string | null
          priority_fields?: string[] | null
          processed_leads?: number | null
          skipped_leads?: number | null
          started_at?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string | null
          updated_leads?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_resync_jobs_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "resync_field_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_search_cache: {
        Row: {
          created_at: string
          error_message: string | null
          found: boolean
          id: string
          last_search: string
          lead_id: number
          source: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          found: boolean
          id?: string
          last_search?: string
          lead_id: number
          source?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          found?: boolean
          id?: string
          last_search?: string
          lead_id?: number
          source?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          additional_photos: Json | null
          address: string | null
          age: number | null
          analisado_por: string | null
          bitrix_telemarketing_id: number | null
          cadastro_existe_foto: boolean | null
          celular: string | null
          commercial_project_id: string | null
          compareceu: boolean | null
          contact_id: number | null
          conversation_id: number | null
          criado: string | null
          data_agendamento: string | null
          data_analise: string | null
          data_confirmacao_ficha: string | null
          data_criacao_agendamento: string | null
          data_criacao_ficha: string | null
          data_pagamento: string | null
          data_retorno_ligacao: string | null
          date_closed: string | null
          date_modify: string | null
          etapa: string | null
          etapa_fluxo: string | null
          etapa_funil: string | null
          ficha_confirmada: boolean | null
          ficha_paga: boolean | null
          fonte: string | null
          fonte_normalizada: string | null
          funil_fichas: string | null
          geocoded_at: string | null
          gerenciamento_funil: string | null
          gestao_scouter: string | null
          has_sync_errors: boolean | null
          horario_agendamento: string | null
          id: number
          last_sync_at: string | null
          latitude: number | null
          local_abordagem: string | null
          longitude: number | null
          maxsystem_id_ficha: string | null
          name: string | null
          nome_modelo: string | null
          nome_responsavel_legal: string | null
          op_telemarketing: string | null
          photo_url: string | null
          presenca_confirmada: boolean | null
          projeto_comercial: string | null
          qualidade_lead: string | null
          raw: Json | null
          responsible: string | null
          responsible_user_id: string | null
          scouter: string | null
          status_fluxo: string | null
          status_tabulacao: string | null
          status_telefone: string | null
          sync_errors: Json | null
          sync_source: string | null
          sync_status: string | null
          telefone_casa: string | null
          telefone_trabalho: string | null
          telemarketing: string | null
          updated_at: string | null
          valor_ficha: number | null
        }
        Insert: {
          additional_photos?: Json | null
          address?: string | null
          age?: number | null
          analisado_por?: string | null
          bitrix_telemarketing_id?: number | null
          cadastro_existe_foto?: boolean | null
          celular?: string | null
          commercial_project_id?: string | null
          compareceu?: boolean | null
          contact_id?: number | null
          conversation_id?: number | null
          criado?: string | null
          data_agendamento?: string | null
          data_analise?: string | null
          data_confirmacao_ficha?: string | null
          data_criacao_agendamento?: string | null
          data_criacao_ficha?: string | null
          data_pagamento?: string | null
          data_retorno_ligacao?: string | null
          date_closed?: string | null
          date_modify?: string | null
          etapa?: string | null
          etapa_fluxo?: string | null
          etapa_funil?: string | null
          ficha_confirmada?: boolean | null
          ficha_paga?: boolean | null
          fonte?: string | null
          fonte_normalizada?: string | null
          funil_fichas?: string | null
          geocoded_at?: string | null
          gerenciamento_funil?: string | null
          gestao_scouter?: string | null
          has_sync_errors?: boolean | null
          horario_agendamento?: string | null
          id: number
          last_sync_at?: string | null
          latitude?: number | null
          local_abordagem?: string | null
          longitude?: number | null
          maxsystem_id_ficha?: string | null
          name?: string | null
          nome_modelo?: string | null
          nome_responsavel_legal?: string | null
          op_telemarketing?: string | null
          photo_url?: string | null
          presenca_confirmada?: boolean | null
          projeto_comercial?: string | null
          qualidade_lead?: string | null
          raw?: Json | null
          responsible?: string | null
          responsible_user_id?: string | null
          scouter?: string | null
          status_fluxo?: string | null
          status_tabulacao?: string | null
          status_telefone?: string | null
          sync_errors?: Json | null
          sync_source?: string | null
          sync_status?: string | null
          telefone_casa?: string | null
          telefone_trabalho?: string | null
          telemarketing?: string | null
          updated_at?: string | null
          valor_ficha?: number | null
        }
        Update: {
          additional_photos?: Json | null
          address?: string | null
          age?: number | null
          analisado_por?: string | null
          bitrix_telemarketing_id?: number | null
          cadastro_existe_foto?: boolean | null
          celular?: string | null
          commercial_project_id?: string | null
          compareceu?: boolean | null
          contact_id?: number | null
          conversation_id?: number | null
          criado?: string | null
          data_agendamento?: string | null
          data_analise?: string | null
          data_confirmacao_ficha?: string | null
          data_criacao_agendamento?: string | null
          data_criacao_ficha?: string | null
          data_pagamento?: string | null
          data_retorno_ligacao?: string | null
          date_closed?: string | null
          date_modify?: string | null
          etapa?: string | null
          etapa_fluxo?: string | null
          etapa_funil?: string | null
          ficha_confirmada?: boolean | null
          ficha_paga?: boolean | null
          fonte?: string | null
          fonte_normalizada?: string | null
          funil_fichas?: string | null
          geocoded_at?: string | null
          gerenciamento_funil?: string | null
          gestao_scouter?: string | null
          has_sync_errors?: boolean | null
          horario_agendamento?: string | null
          id?: number
          last_sync_at?: string | null
          latitude?: number | null
          local_abordagem?: string | null
          longitude?: number | null
          maxsystem_id_ficha?: string | null
          name?: string | null
          nome_modelo?: string | null
          nome_responsavel_legal?: string | null
          op_telemarketing?: string | null
          photo_url?: string | null
          presenca_confirmada?: boolean | null
          projeto_comercial?: string | null
          qualidade_lead?: string | null
          raw?: Json | null
          responsible?: string | null
          responsible_user_id?: string | null
          scouter?: string | null
          status_fluxo?: string | null
          status_tabulacao?: string | null
          status_telefone?: string | null
          sync_errors?: Json | null
          sync_source?: string | null
          sync_status?: string | null
          telefone_casa?: string | null
          telefone_trabalho?: string | null
          telemarketing?: string | null
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
      negotiation_history: {
        Row: {
          action: string
          changes: Json | null
          id: string
          negotiation_id: string
          new_status: string | null
          notes: string | null
          old_status: string | null
          performed_at: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          id?: string
          negotiation_id: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_at?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          id?: string
          negotiation_id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_at?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_history_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          additional_fee_percentage: number | null
          additional_fee_value: number | null
          approved_at: string | null
          approved_by: string | null
          base_value: number
          bitrix_deal_id: number | null
          bitrix_product_id: number | null
          client_document: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          discount_percentage: number | null
          discount_value: number | null
          end_date: string | null
          first_installment_date: string | null
          id: string
          installments_count: number | null
          notes: string | null
          payment_frequency: string | null
          payment_methods: Json | null
          rejection_reason: string | null
          start_date: string | null
          status: string | null
          tax_percentage: number | null
          tax_value: number | null
          terms: string | null
          title: string
          total_value: number
          updated_at: string | null
        }
        Insert: {
          additional_fee_percentage?: number | null
          additional_fee_value?: number | null
          approved_at?: string | null
          approved_by?: string | null
          base_value?: number
          bitrix_deal_id?: number | null
          bitrix_product_id?: number | null
          client_document?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          discount_percentage?: number | null
          discount_value?: number | null
          end_date?: string | null
          first_installment_date?: string | null
          id?: string
          installments_count?: number | null
          notes?: string | null
          payment_frequency?: string | null
          payment_methods?: Json | null
          rejection_reason?: string | null
          start_date?: string | null
          status?: string | null
          tax_percentage?: number | null
          tax_value?: number | null
          terms?: string | null
          title: string
          total_value?: number
          updated_at?: string | null
        }
        Update: {
          additional_fee_percentage?: number | null
          additional_fee_value?: number | null
          approved_at?: string | null
          approved_by?: string | null
          base_value?: number
          bitrix_deal_id?: number | null
          bitrix_product_id?: number | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          discount_percentage?: number | null
          discount_value?: number | null
          end_date?: string | null
          first_installment_date?: string | null
          id?: string
          installments_count?: number | null
          notes?: string | null
          payment_frequency?: string | null
          payment_methods?: Json | null
          rejection_reason?: string | null
          start_date?: string | null
          status?: string | null
          tax_percentage?: number | null
          tax_value?: number | null
          terms?: string | null
          title?: string
          total_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_assignments: {
        Row: {
          assign_type: string
          can_access: boolean | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          id: string
          resource_id: string | null
          role_id: string | null
          route_id: string | null
          scope: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assign_type: string
          can_access?: boolean | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          resource_id?: string | null
          role_id?: string | null
          route_id?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assign_type?: string
          can_access?: boolean | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          resource_id?: string | null
          role_id?: string | null
          route_id?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "app_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_assignments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "app_routes"
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
      process_diagrams: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          diagram_data: Json
          id: string
          is_published: boolean | null
          module: string | null
          name: string
          thumbnail: string | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          diagram_data?: Json
          id?: string
          is_published?: boolean | null
          module?: string | null
          name: string
          thumbnail?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          diagram_data?: Json
          id?: string
          is_published?: boolean | null
          module?: string | null
          name?: string
          thumbnail?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      producers: {
        Row: {
          access_key: string | null
          bitrix_id: number | null
          created_at: string | null
          created_by: string | null
          deals_last_30_days: number | null
          email: string | null
          hired_at: string | null
          id: string
          last_activity_at: string | null
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          status: string
          total_deals: number | null
          updated_at: string | null
        }
        Insert: {
          access_key?: string | null
          bitrix_id?: number | null
          created_at?: string | null
          created_by?: string | null
          deals_last_30_days?: number | null
          email?: string | null
          hired_at?: string | null
          id?: string
          last_activity_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: string
          total_deals?: number | null
          updated_at?: string | null
        }
        Update: {
          access_key?: string | null
          bitrix_id?: number | null
          created_at?: string | null
          created_by?: string | null
          deals_last_30_days?: number | null
          email?: string | null
          hired_at?: string | null
          id?: string
          last_activity_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: string
          total_deals?: number | null
          updated_at?: string | null
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
      resource_permissions: {
        Row: {
          created_at: string | null
          id: string
          resource_id: string
          role_id: string
          scope: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          resource_id: string
          role_id: string
          scope?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          resource_id?: string
          role_id?: string
          scope?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_permissions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "app_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      resync_field_mappings: {
        Row: {
          active: boolean | null
          bitrix_field: string
          created_at: string | null
          created_by: string | null
          id: string
          leads_column: string
          mapping_name: string
          notes: string | null
          priority: number | null
          skip_if_null: boolean | null
          transform_function: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          bitrix_field: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          leads_column: string
          mapping_name: string
          notes?: string | null
          priority?: number | null
          skip_if_null?: boolean | null
          transform_function?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          bitrix_field?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          leads_column?: string
          mapping_name?: string
          notes?: string | null
          priority?: number | null
          skip_if_null?: boolean | null
          transform_function?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      roadmap_features: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          icon: string
          id: string
          launch_date: string | null
          module: string
          name: string
          priority: string | null
          progress: number | null
          sort_order: number | null
          status: string
          tags: string[] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          icon?: string
          id?: string
          launch_date?: string | null
          module: string
          name: string
          priority?: string | null
          progress?: number | null
          sort_order?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          icon?: string
          id?: string
          launch_date?: string | null
          module?: string
          name?: string
          priority?: string | null
          progress?: number | null
          sort_order?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
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
      route_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          department: Database["public"]["Enums"]["app_department"]
          id: string
          role: Database["public"]["Enums"]["app_role"]
          route_id: string
          updated_at: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          department: Database["public"]["Enums"]["app_department"]
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          route_id: string
          updated_at?: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          department?: Database["public"]["Enums"]["app_department"]
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          route_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_permissions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "app_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      scouter_location_history: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          scouter_bitrix_id: number
          scouter_name: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          scouter_bitrix_id: number
          scouter_name: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          scouter_bitrix_id?: number
          scouter_name?: string
        }
        Relationships: []
      }
      scouter_sessions: {
        Row: {
          bitrix_id: number
          created_at: string | null
          expires_at: string
          id: string
          last_used_at: string | null
          scouter_id: string
          session_token: string
        }
        Insert: {
          bitrix_id: number
          created_at?: string | null
          expires_at: string
          id?: string
          last_used_at?: string | null
          scouter_id: string
          session_token: string
        }
        Update: {
          bitrix_id?: number
          created_at?: string | null
          expires_at?: string
          id?: string
          last_used_at?: string | null
          scouter_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "scouter_sessions_scouter_id_fkey"
            columns: ["scouter_id"]
            isOneToOne: false
            referencedRelation: "scouters"
            referencedColumns: ["id"]
          },
        ]
      }
      scouters: {
        Row: {
          access_key: string | null
          bitrix_id: number | null
          created_at: string | null
          created_by: string | null
          email: string | null
          hired_at: string | null
          id: string
          last_activity_at: string | null
          leads_last_30_days: number | null
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          responsible_user_id: string | null
          status: string
          total_leads: number | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          access_key?: string | null
          bitrix_id?: number | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          hired_at?: string | null
          id?: string
          last_activity_at?: string | null
          leads_last_30_days?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          responsible_user_id?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          access_key?: string | null
          bitrix_id?: number | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          hired_at?: string | null
          id?: string
          last_activity_at?: string | null
          leads_last_30_days?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          responsible_user_id?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      sync_events: {
        Row: {
          created_at: string | null
          direction: string
          error_message: string | null
          event_type: string
          field_mappings: Json | null
          fields_synced_count: number | null
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
          field_mappings?: Json | null
          fields_synced_count?: number | null
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
          field_mappings?: Json | null
          fields_synced_count?: number | null
          id?: string
          lead_id?: number
          status?: string
          sync_duration_ms?: number | null
        }
        Relationships: []
      }
      sync_test_results: {
        Row: {
          direction: string
          error_message: string | null
          executed_at: string | null
          executed_by: string | null
          id: string
          lead_id: number
          preview_data: Json
          result: string | null
        }
        Insert: {
          direction: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          lead_id: number
          preview_data: Json
          result?: string | null
        }
        Update: {
          direction?: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          lead_id?: number
          preview_data?: Json
          result?: string | null
        }
        Relationships: []
      }
      syscall_agent_mappings: {
        Row: {
          active: boolean | null
          agent_code: string
          created_at: string | null
          id: string
          ramal: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          agent_code: string
          created_at?: string | null
          id?: string
          ramal?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          agent_code?: string
          created_at?: string | null
          id?: string
          ramal?: string | null
          user_id?: string
        }
        Relationships: []
      }
      syscall_campaign_leads: {
        Row: {
          atendido_em: string | null
          campaign_id: string | null
          created_at: string | null
          discado_em: string | null
          id: string
          lead_id: number
          status: string | null
          syscall_id: string | null
          tabulado_em: string | null
          telefone: string
        }
        Insert: {
          atendido_em?: string | null
          campaign_id?: string | null
          created_at?: string | null
          discado_em?: string | null
          id?: string
          lead_id: number
          status?: string | null
          syscall_id?: string | null
          tabulado_em?: string | null
          telefone: string
        }
        Update: {
          atendido_em?: string | null
          campaign_id?: string | null
          created_at?: string | null
          discado_em?: string | null
          id?: string
          lead_id?: number
          status?: string | null
          syscall_id?: string | null
          tabulado_em?: string | null
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "syscall_campaign_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "syscall_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      syscall_campaigns: {
        Row: {
          agressividade: number | null
          created_at: string | null
          created_by: string | null
          id: string
          leads_atendidos: number | null
          leads_discados: number | null
          leads_enviados: number | null
          nome: string
          operadores: string[] | null
          rota: string | null
          status: string | null
          syscall_campaign_id: number | null
          updated_at: string | null
        }
        Insert: {
          agressividade?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          leads_atendidos?: number | null
          leads_discados?: number | null
          leads_enviados?: number | null
          nome: string
          operadores?: string[] | null
          rota?: string | null
          status?: string | null
          syscall_campaign_id?: number | null
          updated_at?: string | null
        }
        Update: {
          agressividade?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          leads_atendidos?: number | null
          leads_discados?: number | null
          leads_enviados?: number | null
          nome?: string
          operadores?: string[] | null
          rota?: string | null
          status?: string | null
          syscall_campaign_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      syscall_config: {
        Row: {
          active: boolean | null
          api_token: string | null
          api_url: string
          callback_url: string | null
          created_at: string | null
          default_route: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          api_token?: string | null
          api_url?: string
          callback_url?: string | null
          created_at?: string | null
          default_route?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          api_token?: string | null
          api_url?: string
          callback_url?: string | null
          created_at?: string | null
          default_route?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      unified_field_config: {
        Row: {
          bitrix_field: string | null
          bitrix_field_type: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          default_visible: boolean | null
          display_name: string | null
          field_type: string | null
          formatter_function: string | null
          id: string
          is_hidden: boolean | null
          is_nullable: string | null
          notes: string | null
          sortable: boolean | null
          supabase_field: string
          supabase_type: string | null
          sync_active: boolean | null
          sync_priority: number | null
          transform_function: string | null
          ui_active: boolean | null
          ui_priority: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bitrix_field?: string | null
          bitrix_field_type?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_visible?: boolean | null
          display_name?: string | null
          field_type?: string | null
          formatter_function?: string | null
          id?: string
          is_hidden?: boolean | null
          is_nullable?: string | null
          notes?: string | null
          sortable?: boolean | null
          supabase_field: string
          supabase_type?: string | null
          sync_active?: boolean | null
          sync_priority?: number | null
          transform_function?: string | null
          ui_active?: boolean | null
          ui_priority?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bitrix_field?: string | null
          bitrix_field_type?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_visible?: boolean | null
          display_name?: string | null
          field_type?: string | null
          formatter_function?: string | null
          id?: string
          is_hidden?: boolean | null
          is_nullable?: string | null
          notes?: string | null
          sortable?: boolean | null
          supabase_field?: string
          supabase_type?: string | null
          sync_active?: boolean | null
          sync_priority?: number | null
          transform_function?: string | null
          ui_active?: boolean | null
          ui_priority?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      user_departments: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["app_department"]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: Database["public"]["Enums"]["app_department"]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["app_department"]
          id?: string
          updated_at?: string
          user_id?: string
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
      scouter_daily_timesheet: {
        Row: {
          first_lead_time: string | null
          hours_worked: number | null
          last_lead_time: string | null
          scouter: string | null
          total_leads: number | null
          work_date: string | null
        }
        Relationships: []
      }
      scouter_timesheet_secure: {
        Row: {
          first_lead_time: string | null
          hours_worked: number | null
          last_lead_time: string | null
          scouter: string | null
          total_leads: number | null
          work_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_mark_as_paid: {
        Args: {
          p_cutoff_date: string
          p_etapa?: string
          p_project_id?: string
          p_scouter?: string
        }
        Returns: Json
      }
      can_access_route: {
        Args: { _route_path: string; _user_id: string }
        Returns: boolean
      }
      check_leads_duplicates: {
        Args: {
          p_days_back?: number
          p_lead_ids: number[]
          p_project_id?: string
        }
        Returns: {
          duplicate_lead_id: number
          has_duplicate: boolean
          is_duplicate_deleted: boolean
          lead_id: number
        }[]
      }
      clean_corrupted_fonte: { Args: never; Returns: Json }
      clean_old_lead_search_cache: { Args: never; Returns: undefined }
      cleanup_expired_scouter_sessions: { Args: never; Returns: number }
      cleanup_scouter_location_history: { Args: never; Returns: number }
      count_leads_to_reprocess: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_only_missing_fields?: boolean
        }
        Returns: number
      }
      fix_scouter_names: {
        Args: never
        Returns: {
          leads_fixed: number
          leads_not_found: number
        }[]
      }
      fix_scouter_names_filtered: {
        Args: { p_end_date: string; p_project_id: string; p_start_date: string }
        Returns: {
          leads_fixed: number
          leads_not_found: number
        }[]
      }
      generate_api_key: {
        Args: {
          p_description?: string
          p_expires_at?: string
          p_name: string
          p_rate_limit?: number
          p_scopes?: string[]
          p_user_id?: string
        }
        Returns: {
          api_key: string
          key_id: string
          key_prefix: string
        }[]
      }
      get_activity_chart_data: {
        Args: {
          p_end_date: string
          p_granularity?: string
          p_start_date: string
        }
        Returns: {
          meta: number
          period: string
          scouter: number
          total: number
        }[]
      }
      get_agendados_stats: {
        Args: {
          p_end_date: string
          p_source_filter?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_comparecidos_stats: {
        Args: {
          p_end_date: string
          p_source_filter?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_conversion_funnel_data: {
        Args: {
          p_end_date?: string
          p_fonte?: string
          p_project_id?: string
          p_scouter?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_general_stats: {
        Args: never
        Returns: {
          compareceram: number
          confirmados: number
          leads_hoje: number
          leads_semana: number
          total_leads: number
          valor_total: number
        }[]
      }
      get_general_stats_filtered: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          compareceram: number
          confirmados: number
          leads_periodo: number
          taxa_conversao: number
          total_leads: number
          valor_total: number
        }[]
      }
      get_lead_stats: {
        Args: {
          p_end_date: string
          p_source_filter?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_leads_chart_data: {
        Args: {
          p_end_date: string
          p_fonte?: string
          p_project_id?: string
          p_scouter?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_leads_schema: {
        Args: never
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_leads_stats:
        | {
            Args: {
              p_end_date?: string
              p_project_id?: string
              p_scouter?: string
              p_start_date?: string
            }
            Returns: {
              agendados: number
              com_foto: number
              compareceram: number
              confirmados: number
              pendentes: number
              reagendar: number
              total: number
            }[]
          }
        | {
            Args: {
              p_end_date?: string
              p_fonte?: string
              p_project_id?: string
              p_scouter?: string
              p_start_date?: string
            }
            Returns: {
              agendados: number
              com_foto: number
              compareceram: number
              confirmados: number
              pendentes: number
              reagendar: number
              total: number
            }[]
          }
      get_leads_stats_filtered: {
        Args: {
          p_end_date?: string
          p_fonte?: string
          p_project_id?: string
          p_scouter?: string
          p_start_date?: string
        }
        Returns: {
          compareceram: number
          confirmados: number
          pendentes: number
          total: number
        }[]
      }
      get_leads_table_columns: {
        Args: never
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_normalized_etapas: {
        Args: never
        Returns: {
          etapa_normalized: string
          etapa_original: string
        }[]
      }
      get_normalized_fontes: {
        Args: {
          p_end_date?: string
          p_project_id?: string
          p_scouter?: string
          p_start_date?: string
        }
        Returns: {
          fonte_normalizada: string
        }[]
      }
      get_photo_stats: {
        Args: {
          p_end_date: string
          p_source_filter?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_producer_deals: {
        Args: { p_limit?: number; p_producer_id: string; p_status?: string }
        Returns: {
          bitrix_deal_id: number
          client_name: string
          client_phone: string
          created_date: string
          deal_id: string
          lead_id: number
          model_name: string
          negotiation_id: string
          negotiation_status: string
          opportunity: number
          stage_id: string
          title: string
        }[]
      }
      get_producer_stats: {
        Args: { p_producer_id: string }
        Returns: {
          deals_concluidos: number
          deals_em_andamento: number
          deals_pendentes: number
          total_deals: number
          valor_total: number
        }[]
      }
      get_projection_data: {
        Args: {
          p_end_date: string
          p_project_id?: string
          p_scouter?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_projection_data_filtered: {
        Args: {
          p_end_date: string
          p_fonte?: string
          p_project_id?: string
          p_scouter?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_retroactive_payment_preview: {
        Args: {
          p_cutoff_date: string
          p_project_id?: string
          p_scouter?: string
        }
        Returns: Json
      }
      get_scouter_hourly_leads: {
        Args: { p_date: string; p_scouter_name: string }
        Returns: {
          confirmed_leads: number
          conversion_rate: number
          hour: number
          total_leads: number
        }[]
      }
      get_scouter_leads:
        | {
            Args: {
              p_date_from?: string
              p_date_to?: string
              p_project_id?: string
              p_scouter_name: string
            }
            Returns: {
              address: string
              criado: string
              etapa_lead: string
              has_duplicate: boolean
              is_duplicate_deleted: boolean
              lead_id: number
              nome_modelo: string
            }[]
          }
        | {
            Args: {
              p_date_from?: string
              p_date_to?: string
              p_filter_type?: string
              p_project_id?: string
              p_scouter_name: string
            }
            Returns: {
              criado: string
              etapa_lead: string
              has_duplicate: boolean
              is_duplicate_deleted: boolean
              lead_id: number
              local_abordagem: string
              nome_modelo: string
            }[]
          }
      get_scouter_leads_simple: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_project_id?: string
          p_scouter_name: string
        }
        Returns: {
          address: string
          celular: string
          commercial_project_id: string
          criado: string
          etapa_lead: string
          lead_id: number
          nome_modelo: string
        }[]
      }
      get_scouter_location_stats: { Args: never; Returns: Json }
      get_scouter_performance_data: {
        Args: {
          p_end_date?: string
          p_fonte?: string
          p_limit?: number
          p_project_id?: string
          p_scouter?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_scouter_performance_detail: {
        Args: { p_scouter_id: string }
        Returns: Json
      }
      get_scouter_portal_stats: {
        Args: {
          p_end_date?: string
          p_project_id?: string
          p_scouter_name: string
          p_start_date?: string
        }
        Returns: {
          agendados: number
          com_foto: number
          compareceram: number
          confirmados: number
          pendentes: number
          reagendar: number
          total_leads: number
        }[]
      }
      get_scouter_projects: {
        Args: { p_scouter_name: string }
        Returns: {
          lead_count: number
          project_code: string
          project_id: string
          project_name: string
        }[]
      }
      get_scouter_ranking_position: {
        Args: {
          p_end_date?: string
          p_scouter_name: string
          p_start_date?: string
        }
        Returns: {
          first_place_fichas: number
          first_place_name: string
          rank_position: number
          scouter_fichas: number
          total_scouters: number
        }[]
      }
      get_scouter_timesheet: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_scouter_name: string
          p_start_date?: string
        }
        Returns: {
          clock_in: string
          clock_out: string
          hours_worked: number
          projects: string
          total_leads: number
          work_date: string
        }[]
      }
      get_source_analysis: {
        Args: {
          p_end_date?: string
          p_fonte?: string
          p_project_id?: string
          p_scouter?: string
          p_start_date?: string
        }
        Returns: {
          compareceram: number
          confirmados: number
          fonte_normalizada: string
          total: number
        }[]
      }
      get_status_distribution_data: {
        Args: {
          p_end_date?: string
          p_fonte?: string
          p_limit?: number
          p_project_id?: string
          p_scouter?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_table_columns: {
        Args: { table_name: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_top_scouters: {
        Args: { p_end_date?: string; p_start_date: string }
        Returns: {
          confirmadas: number
          name: string
          total: number
        }[]
      }
      get_top_telemarketing: {
        Args: { p_end_date?: string; p_start_date: string }
        Returns: {
          count: number
          name: string
        }[]
      }
      get_unique_project_ids: {
        Args: {
          p_end_date?: string
          p_fonte?: string
          p_scouter?: string
          p_start_date?: string
        }
        Returns: {
          commercial_project_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_etapa: { Args: { raw_etapa: string }; Returns: string }
      normalize_etapa_single_batch: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      normalize_fonte: { Args: { raw_fonte: string }; Returns: string }
      recalculate_fonte_batch: { Args: never; Returns: Json }
      recalculate_fonte_single_batch: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      reprocess_leads_batch: {
        Args: {
          p_batch_size?: number
          p_date_from?: string
          p_date_to?: string
          p_last_processed_id?: number
          p_only_missing_fields?: boolean
        }
        Returns: Json
      }
      reprocess_leads_from_raw_bulk: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_only_missing_fields?: boolean
        }
        Returns: Json
      }
      revoke_api_key: {
        Args: { p_key_id: string; p_user_id?: string }
        Returns: boolean
      }
      rotate_api_key: {
        Args: { p_key_id: string; p_user_id?: string }
        Returns: {
          api_key: string
          key_id: string
          key_prefix: string
        }[]
      }
      validate_api_key: {
        Args: { p_key: string; p_required_scope?: string }
        Returns: {
          error_message: string
          is_valid: boolean
          key_id: string
          key_name: string
          rate_limit: number
          scopes: string[]
        }[]
      }
      validate_producer_access_key: {
        Args: { p_access_key: string }
        Returns: {
          producer_id: string
          producer_name: string
          producer_photo: string
        }[]
      }
      validate_scouter_access_key: {
        Args: { p_access_key: string }
        Returns: {
          scouter_id: string
          scouter_name: string
          scouter_photo: string
        }[]
      }
    }
    Enums: {
      app_department:
        | "telemarketing"
        | "scouters"
        | "administrativo"
        | "analise"
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
      app_department: [
        "telemarketing",
        "scouters",
        "administrativo",
        "analise",
      ],
      app_role: ["admin", "manager", "agent", "supervisor"],
      permission_scope: ["global", "department", "own"],
    },
  },
} as const
