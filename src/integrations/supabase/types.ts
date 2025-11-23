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
      bitrix_spa_entities: {
        Row: {
          bitrix_item_id: number
          cached_at: string | null
          entity_type_id: number
          id: string
          stage_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          bitrix_item_id: number
          cached_at?: string | null
          entity_type_id: number
          id?: string
          stage_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          bitrix_item_id?: number
          cached_at?: string | null
          entity_type_id?: number
          id?: string
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
      leads: {
        Row: {
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
      scouters: {
        Row: {
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
      get_leads_schema: {
        Args: never
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_leads_stats: {
        Args: {
          p_end_date?: string
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
      get_scouter_performance_detail: {
        Args: { p_scouter_id: string }
        Returns: Json
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
      get_table_columns: {
        Args: { table_name: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_fonte: { Args: { raw_fonte: string }; Returns: string }
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
