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
      agenciamento_assistant_config: {
        Row: {
          category: string | null
          config_key: string
          config_value: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          config_key: string
          config_value: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          config_key?: string
          config_value?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenciamento_assistant_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_button_shortcuts: {
        Row: {
          bitrix_telemarketing_id: number
          button_config_id: string | null
          created_at: string | null
          hotkey: string | null
          id: string
          is_visible: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          bitrix_telemarketing_id: number
          button_config_id?: string | null
          created_at?: string | null
          hotkey?: string | null
          id?: string
          is_visible?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          bitrix_telemarketing_id?: number
          button_config_id?: string | null
          created_at?: string | null
          hotkey?: string | null
          id?: string
          is_visible?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_button_shortcuts_button_config_id_fkey"
            columns: ["button_config_id"]
            isOneToOne: false
            referencedRelation: "button_config"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_operator_assignments: {
        Row: {
          agent_id: string
          assigned_by: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          operator_bitrix_id: number
        }
        Insert: {
          agent_id: string
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          operator_bitrix_id: number
        }
        Update: {
          agent_id?: string
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          operator_bitrix_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_operator_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_telemarketing_mapping: {
        Row: {
          bitrix_telemarketing_id: number
          bitrix_telemarketing_name: string | null
          cargo_id: string | null
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
          cargo_id?: string | null
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
          cargo_id?: string | null
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
      agent_training_links: {
        Row: {
          agent_id: string
          created_at: string
          created_by: string | null
          id: string
          training_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          training_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_training_links_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_training_links_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "ai_training_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          commercial_project_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          personality: string | null
          system_prompt: string
          updated_at: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          commercial_project_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          personality?: string | null
          system_prompt?: string
          updated_at?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          commercial_project_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          personality?: string | null
          system_prompt?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents_training: {
        Row: {
          agent_id: string
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_training_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          base_url: string
          created_at: string | null
          default_model: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_free: boolean | null
          models: Json
          name: string
          requires_api_key: boolean | null
          supports_tools: boolean | null
          updated_at: string | null
        }
        Insert: {
          base_url: string
          created_at?: string | null
          default_model?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          models?: Json
          name: string
          requires_api_key?: boolean | null
          supports_tools?: boolean | null
          updated_at?: string | null
        }
        Update: {
          base_url?: string
          created_at?: string | null
          default_model?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          models?: Json
          name?: string
          requires_api_key?: boolean | null
          supports_tools?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_training_instructions: {
        Row: {
          category: string | null
          commercial_project_id: string | null
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
          commercial_project_id?: string | null
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
          commercial_project_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "ai_training_instructions_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_suggestions: {
        Row: {
          commercial_project_id: string | null
          confidence_score: number | null
          created_at: string
          created_instruction_id: string | null
          frequency_count: number | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sample_questions: Json | null
          source_data: Json | null
          source_type: string | null
          status: string | null
          suggested_category: string | null
          suggested_content: string
          suggested_title: string
          updated_at: string
        }
        Insert: {
          commercial_project_id?: string | null
          confidence_score?: number | null
          created_at?: string
          created_instruction_id?: string | null
          frequency_count?: number | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_questions?: Json | null
          source_data?: Json | null
          source_type?: string | null
          status?: string | null
          suggested_category?: string | null
          suggested_content: string
          suggested_title: string
          updated_at?: string
        }
        Update: {
          commercial_project_id?: string | null
          confidence_score?: number | null
          created_at?: string
          created_instruction_id?: string | null
          frequency_count?: number | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_questions?: Json | null
          source_data?: Json | null
          source_type?: string | null
          status?: string | null
          suggested_category?: string | null
          suggested_content?: string
          suggested_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_suggestions_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_training_suggestions_created_instruction_id_fkey"
            columns: ["created_instruction_id"]
            isOneToOne: false
            referencedRelation: "ai_training_instructions"
            referencedColumns: ["id"]
          },
        ]
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
      app_documentation: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          filters_available: Json | null
          hooks_used: Json | null
          id: string
          is_active: boolean | null
          last_updated_by: string | null
          main_component: string | null
          module: string
          name: string
          notes: string | null
          page_route: string
          rpcs_used: Json | null
          tables_accessed: Json | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          filters_available?: Json | null
          hooks_used?: Json | null
          id?: string
          is_active?: boolean | null
          last_updated_by?: string | null
          main_component?: string | null
          module?: string
          name: string
          notes?: string | null
          page_route: string
          rpcs_used?: Json | null
          tables_accessed?: Json | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          filters_available?: Json | null
          hooks_used?: Json | null
          id?: string
          is_active?: boolean | null
          last_updated_by?: string | null
          main_component?: string | null
          module?: string
          name?: string
          notes?: string | null
          page_route?: string
          rpcs_used?: Json | null
          tables_accessed?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_field_documentation: {
        Row: {
          created_at: string | null
          description: string | null
          field_id: string
          field_name: string
          field_source: string | null
          field_type: string | null
          id: string
          possible_values: Json | null
          updated_at: string | null
          usage_examples: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          field_id: string
          field_name: string
          field_source?: string | null
          field_type?: string | null
          id?: string
          possible_values?: Json | null
          updated_at?: string | null
          usage_examples?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          field_id?: string
          field_name?: string
          field_source?: string | null
          field_type?: string | null
          id?: string
          possible_values?: Json | null
          updated_at?: string | null
          usage_examples?: Json | null
        }
        Relationships: []
      }
      app_metrics_documentation: {
        Row: {
          business_rule: string | null
          calculation_formula: string | null
          created_at: string | null
          data_source: string
          documentation_id: string | null
          field_explanations: Json | null
          fields_used: Json | null
          filters_applied: string | null
          id: string
          metric_key: string | null
          metric_name: string
          notes: string | null
          sort_order: number | null
          source_type: string | null
          sql_example: string | null
        }
        Insert: {
          business_rule?: string | null
          calculation_formula?: string | null
          created_at?: string | null
          data_source: string
          documentation_id?: string | null
          field_explanations?: Json | null
          fields_used?: Json | null
          filters_applied?: string | null
          id?: string
          metric_key?: string | null
          metric_name: string
          notes?: string | null
          sort_order?: number | null
          source_type?: string | null
          sql_example?: string | null
        }
        Update: {
          business_rule?: string | null
          calculation_formula?: string | null
          created_at?: string | null
          data_source?: string
          documentation_id?: string | null
          field_explanations?: Json | null
          fields_used?: Json | null
          filters_applied?: string | null
          id?: string
          metric_key?: string | null
          metric_name?: string
          notes?: string | null
          sort_order?: number | null
          source_type?: string | null
          sql_example?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_metrics_documentation_documentation_id_fkey"
            columns: ["documentation_id"]
            isOneToOne: false
            referencedRelation: "app_documentation"
            referencedColumns: ["id"]
          },
        ]
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
      blocked_numbers: {
        Row: {
          blocked_by: string | null
          blocked_until: string | null
          created_at: string | null
          id: string
          phone_number: string
          reason: string
          unblocked_at: string | null
          unblocked_by: string | null
        }
        Insert: {
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          phone_number: string
          reason: string
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Update: {
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          phone_number?: string
          reason?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Relationships: []
      }
      bot_agent_tools: {
        Row: {
          commercial_project_id: string | null
          config: Json
          created_at: string | null
          created_by: string | null
          description: string
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          parameters_schema: Json
          tool_type: string
          updated_at: string | null
        }
        Insert: {
          commercial_project_id?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description: string
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          parameters_schema?: Json
          tool_type: string
          updated_at?: string | null
        }
        Update: {
          commercial_project_id?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          parameters_schema?: Json
          tool_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_agent_tools_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_tool_execution_logs: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_params: Json | null
          output_result: Json | null
          status: string | null
          tool_id: string | null
          tool_name: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_params?: Json | null
          output_result?: Json | null
          status?: string | null
          tool_id?: string | null
          tool_name: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_params?: Json | null
          output_result?: Json | null
          status?: string | null
          tool_id?: string | null
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_tool_execution_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_bot_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_tool_execution_logs_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "bot_agent_tools"
            referencedColumns: ["id"]
          },
        ]
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
          trigger_id: string | null
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
          trigger_id?: string | null
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
          trigger_id?: string | null
          value?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "button_config_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "flow_triggers"
            referencedColumns: ["id"]
          },
        ]
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
          conversation_status: string | null
          created_at: string
          custom_attributes: Json | null
          email: string | null
          id: string
          last_activity_at: number | null
          last_customer_message_at: string | null
          last_message_at: string | null
          last_message_direction: string | null
          last_message_preview: string | null
          last_sync_at: string | null
          name: string | null
          phone_number: string | null
          sync_source: string | null
          sync_status: string | null
          thumbnail: string | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          additional_attributes?: Json | null
          bitrix_id: string
          contact_id?: number | null
          conversation_id?: number | null
          conversation_status?: string | null
          created_at?: string
          custom_attributes?: Json | null
          email?: string | null
          id?: string
          last_activity_at?: number | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: string | null
          last_sync_at?: string | null
          name?: string | null
          phone_number?: string | null
          sync_source?: string | null
          sync_status?: string | null
          thumbnail?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          additional_attributes?: Json | null
          bitrix_id?: string
          contact_id?: number | null
          conversation_id?: number | null
          conversation_status?: string | null
          created_at?: string
          custom_attributes?: Json | null
          email?: string | null
          id?: string
          last_activity_at?: number | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: string | null
          last_sync_at?: string | null
          name?: string | null
          phone_number?: string | null
          sync_source?: string | null
          sync_status?: string | null
          thumbnail?: string | null
          unread_count?: number | null
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
      conversation_analysis_jobs: {
        Row: {
          analysis_results: Json | null
          commercial_project_id: string | null
          completed_at: string | null
          conversations_analyzed: number | null
          created_at: string
          created_by: string | null
          date_range_end: string | null
          date_range_start: string | null
          error_message: string | null
          id: string
          started_at: string | null
          status: string | null
          suggestions_generated: number | null
        }
        Insert: {
          analysis_results?: Json | null
          commercial_project_id?: string | null
          completed_at?: string | null
          conversations_analyzed?: number | null
          created_at?: string
          created_by?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          suggestions_generated?: number | null
        }
        Update: {
          analysis_results?: Json | null
          commercial_project_id?: string | null
          completed_at?: string | null
          conversations_analyzed?: number | null
          created_at?: string
          created_by?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          suggestions_generated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analysis_jobs_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
        ]
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
      flow_triggers: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          flow_id: string | null
          id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          flow_id?: string | null
          id?: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          flow_id?: string | null
          id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_triggers_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          steps: Json
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          steps?: Json
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          steps?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      flows_runs: {
        Row: {
          completed_at: string | null
          executed_by: string | null
          flow_id: string | null
          id: string
          lead_id: number | null
          logs: Json | null
          phone_number: string | null
          resultado: Json | null
          started_at: string | null
          status: string | null
          trigger_type: string | null
          trigger_value: string | null
        }
        Insert: {
          completed_at?: string | null
          executed_by?: string | null
          flow_id?: string | null
          id?: string
          lead_id?: number | null
          logs?: Json | null
          phone_number?: string | null
          resultado?: Json | null
          started_at?: string | null
          status?: string | null
          trigger_type?: string | null
          trigger_value?: string | null
        }
        Update: {
          completed_at?: string | null
          executed_by?: string | null
          flow_id?: string | null
          id?: string
          lead_id?: number | null
          logs?: Json | null
          phone_number?: string | null
          resultado?: Json | null
          started_at?: string | null
          status?: string | null
          trigger_type?: string | null
          trigger_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flows_runs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
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
          observacoes_telemarketing: string | null
          op_telemarketing: string | null
          phone_normalized: string | null
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
          observacoes_telemarketing?: string | null
          op_telemarketing?: string | null
          phone_normalized?: string | null
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
          observacoes_telemarketing?: string | null
          op_telemarketing?: string | null
          phone_normalized?: string | null
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
      loop_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          details: Json | null
          id: string
          message_count: number | null
          phone_number: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          time_window_seconds: number | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message_count?: number | null
          phone_number: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          time_window_seconds?: number | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message_count?: number | null
          phone_number?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          time_window_seconds?: number | null
        }
        Relationships: []
      }
      maxtalk_conversation_members: {
        Row: {
          conversation_id: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maxtalk_conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "maxtalk_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      maxtalk_conversations: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      maxtalk_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          media_url: string | null
          message_type: string | null
          reply_to_id: string | null
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maxtalk_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "maxtalk_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maxtalk_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "maxtalk_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_rate_limits: {
        Row: {
          block_reason: string | null
          blocked: boolean | null
          content_preview: string | null
          created_at: string | null
          id: string
          message_hash: string | null
          phone_number: string
          sent_at: string | null
          source: string | null
        }
        Insert: {
          block_reason?: string | null
          blocked?: boolean | null
          content_preview?: string | null
          created_at?: string | null
          id?: string
          message_hash?: string | null
          phone_number: string
          sent_at?: string | null
          source?: string | null
        }
        Update: {
          block_reason?: string | null
          blocked?: boolean | null
          content_preview?: string | null
          created_at?: string | null
          id?: string
          message_hash?: string | null
          phone_number?: string
          sent_at?: string | null
          source?: string | null
        }
        Relationships: []
      }
      missing_leads_sync_jobs: {
        Row: {
          bitrix_total: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          cursor_start: number | null
          date_from: string | null
          date_to: string | null
          db_total: number | null
          error_count: number | null
          error_details: Json | null
          id: string
          last_heartbeat_at: string | null
          missing_count: number | null
          scanned_count: number | null
          scouter_name: string | null
          stage: string | null
          started_at: string | null
          status: string
          synced_count: number | null
          updated_at: string | null
        }
        Insert: {
          bitrix_total?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          cursor_start?: number | null
          date_from?: string | null
          date_to?: string | null
          db_total?: number | null
          error_count?: number | null
          error_details?: Json | null
          id?: string
          last_heartbeat_at?: string | null
          missing_count?: number | null
          scanned_count?: number | null
          scouter_name?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string
          synced_count?: number | null
          updated_at?: string | null
        }
        Update: {
          bitrix_total?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          cursor_start?: number | null
          date_from?: string | null
          date_to?: string | null
          db_total?: number | null
          error_count?: number | null
          error_details?: Json | null
          id?: string
          last_heartbeat_at?: string | null
          missing_count?: number | null
          scanned_count?: number | null
          scouter_name?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string
          synced_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      negotiation_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          negotiation_id: string
          payment_method_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          negotiation_id: string
          payment_method_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          negotiation_id?: string
          payment_method_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_documents_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
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
            isOneToOne: true
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
      producer_attendance_log: {
        Row: {
          action: string
          created_at: string
          deal_id: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notes: string | null
          producer_id: string
          queue_position_at: number | null
          result: string | null
          started_at: string | null
          status_from: string | null
          status_to: string | null
        }
        Insert: {
          action: string
          created_at?: string
          deal_id?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          producer_id: string
          queue_position_at?: number | null
          result?: string | null
          started_at?: string | null
          status_from?: string | null
          status_to?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          deal_id?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          producer_id?: string
          queue_position_at?: number | null
          result?: string | null
          started_at?: string | null
          status_from?: string | null
          status_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producer_attendance_log_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_attendance_status: {
        Row: {
          average_attendance_time: number | null
          consecutive_losses: number
          created_at: string
          current_deal_id: string | null
          id: string
          joined_queue_at: string | null
          last_attendance_at: string | null
          penalty_active: boolean
          penalty_skips_remaining: number
          producer_id: string
          queue_position: number | null
          status: Database["public"]["Enums"]["producer_attendance_status_enum"]
          total_attendances: number
          total_closed: number
          total_lost: number
          updated_at: string
        }
        Insert: {
          average_attendance_time?: number | null
          consecutive_losses?: number
          created_at?: string
          current_deal_id?: string | null
          id?: string
          joined_queue_at?: string | null
          last_attendance_at?: string | null
          penalty_active?: boolean
          penalty_skips_remaining?: number
          producer_id: string
          queue_position?: number | null
          status?: Database["public"]["Enums"]["producer_attendance_status_enum"]
          total_attendances?: number
          total_closed?: number
          total_lost?: number
          updated_at?: string
        }
        Update: {
          average_attendance_time?: number | null
          consecutive_losses?: number
          created_at?: string
          current_deal_id?: string | null
          id?: string
          joined_queue_at?: string | null
          last_attendance_at?: string | null
          penalty_active?: boolean
          penalty_skips_remaining?: number
          producer_id?: string
          queue_position?: number | null
          status?: Database["public"]["Enums"]["producer_attendance_status_enum"]
          total_attendances?: number
          total_closed?: number
          total_lost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_attendance_status_current_deal_id_fkey"
            columns: ["current_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
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
          onboarding_completed: boolean | null
          phone: string | null
          photo_url: string | null
          responsible_user_id: string | null
          status: string
          tier: string | null
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
          onboarding_completed?: boolean | null
          phone?: string | null
          photo_url?: string | null
          responsible_user_id?: string | null
          status?: string
          tier?: string | null
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
          onboarding_completed?: boolean | null
          phone?: string | null
          photo_url?: string | null
          responsible_user_id?: string | null
          status?: string
          tier?: string | null
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
      telemarketing_notifications: {
        Row: {
          bitrix_telemarketing_id: number
          commercial_project_id: string | null
          conversation_id: number | null
          created_at: string | null
          id: string
          is_read: boolean | null
          lead_id: number | null
          message: string | null
          metadata: Json | null
          phone_number: string | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          bitrix_telemarketing_id: number
          commercial_project_id?: string | null
          conversation_id?: number | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: number | null
          message?: string | null
          metadata?: Json | null
          phone_number?: string | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          bitrix_telemarketing_id?: number
          commercial_project_id?: string | null
          conversation_id?: number | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: number | null
          message?: string | null
          metadata?: Json | null
          phone_number?: string | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemarketing_notifications_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      telemarketing_operators: {
        Row: {
          access_key: string | null
          bitrix_id: number
          cargo: string | null
          commercial_project_id: string | null
          created_at: string | null
          email: string | null
          id: string
          last_activity_at: string | null
          name: string
          phone: string | null
          photo_url: string | null
          status: string | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          access_key?: string | null
          bitrix_id: number
          cargo?: string | null
          commercial_project_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_activity_at?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          access_key?: string | null
          bitrix_id?: number
          cargo?: string | null
          commercial_project_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_activity_at?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemarketing_operators_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemarketing_operators_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "telemarketing_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      telemarketing_quick_texts: {
        Row: {
          category: string | null
          commercial_project_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          shortcut: string | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          commercial_project_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          shortcut?: string | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          commercial_project_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          shortcut?: string | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telemarketing_quick_texts_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      telemarketing_reports: {
        Row: {
          access_count: number | null
          created_at: string | null
          created_by: number | null
          data: Json
          expires_at: string | null
          id: string
          period: string
          report_date: string
          short_code: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          created_by?: number | null
          data: Json
          expires_at?: string | null
          id?: string
          period: string
          report_date?: string
          short_code: string
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          created_by?: number | null
          data?: Json
          expires_at?: string | null
          id?: string
          period?: string
          report_date?: string
          short_code?: string
        }
        Relationships: []
      }
      telemarketing_scripts: {
        Row: {
          ai_analysis: Json | null
          ai_analyzed_at: string | null
          ai_score: number | null
          category: string
          commercial_project_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_score?: number | null
          category?: string
          commercial_project_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_score?: number | null
          category?: string
          commercial_project_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemarketing_scripts_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
        ]
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
      whatsapp_bot_config: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          api_key_secret_name: string | null
          auto_qualify: boolean | null
          available_tools: string[] | null
          bot_name: string | null
          collect_lead_data: boolean | null
          commercial_project_id: string | null
          created_at: string | null
          created_by: string | null
          fallback_message: string | null
          id: string
          is_enabled: boolean | null
          max_messages_before_transfer: number | null
          operating_hours: Json | null
          personality: string | null
          response_delay_ms: number | null
          tools_enabled: boolean | null
          transfer_keywords: string[] | null
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          api_key_secret_name?: string | null
          auto_qualify?: boolean | null
          available_tools?: string[] | null
          bot_name?: string | null
          collect_lead_data?: boolean | null
          commercial_project_id?: string | null
          created_at?: string | null
          created_by?: string | null
          fallback_message?: string | null
          id?: string
          is_enabled?: boolean | null
          max_messages_before_transfer?: number | null
          operating_hours?: Json | null
          personality?: string | null
          response_delay_ms?: number | null
          tools_enabled?: boolean | null
          transfer_keywords?: string[] | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          api_key_secret_name?: string | null
          auto_qualify?: boolean | null
          available_tools?: string[] | null
          bot_name?: string | null
          collect_lead_data?: boolean | null
          commercial_project_id?: string | null
          created_at?: string | null
          created_by?: string | null
          fallback_message?: string | null
          id?: string
          is_enabled?: boolean | null
          max_messages_before_transfer?: number | null
          operating_hours?: Json | null
          personality?: string | null
          response_delay_ms?: number | null
          tools_enabled?: boolean | null
          transfer_keywords?: string[] | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_config_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: true
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bot_conversations: {
        Row: {
          bitrix_id: string | null
          bot_messages_count: number | null
          commercial_project_id: string | null
          conversation_id: number | null
          created_at: string | null
          ended_at: string | null
          id: string
          messages_count: number | null
          metadata: Json | null
          phone_number: string
          resolved_by_bot: boolean | null
          satisfaction_score: number | null
          started_at: string | null
          status: string | null
          transferred_at: string | null
          transferred_reason: string | null
          updated_at: string | null
        }
        Insert: {
          bitrix_id?: string | null
          bot_messages_count?: number | null
          commercial_project_id?: string | null
          conversation_id?: number | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          messages_count?: number | null
          metadata?: Json | null
          phone_number: string
          resolved_by_bot?: boolean | null
          satisfaction_score?: number | null
          started_at?: string | null
          status?: string | null
          transferred_at?: string | null
          transferred_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          bitrix_id?: string | null
          bot_messages_count?: number | null
          commercial_project_id?: string | null
          conversation_id?: number | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          messages_count?: number | null
          metadata?: Json | null
          phone_number?: string
          resolved_by_bot?: boolean | null
          satisfaction_score?: number | null
          started_at?: string | null
          status?: string | null
          transferred_at?: string | null
          transferred_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_conversations_commercial_project_id_fkey"
            columns: ["commercial_project_id"]
            isOneToOne: false
            referencedRelation: "commercial_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bot_messages: {
        Row: {
          confidence_score: number | null
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          response_time_ms: number | null
          role: string
          tokens_used: number | null
        }
        Insert: {
          confidence_score?: number | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          response_time_ms?: number | null
          role: string
          tokens_used?: number | null
        }
        Update: {
          confidence_score?: number | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          response_time_ms?: number | null
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_bot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_closures: {
        Row: {
          bitrix_id: string | null
          closed_at: string | null
          closed_by: string | null
          closure_reason: string | null
          created_at: string | null
          id: string
          phone_number: string
          reopened_at: string | null
        }
        Insert: {
          bitrix_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_reason?: string | null
          created_at?: string | null
          id?: string
          phone_number: string
          reopened_at?: string | null
        }
        Update: {
          bitrix_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_reason?: string | null
          created_at?: string | null
          id?: string
          phone_number?: string
          reopened_at?: string | null
        }
        Relationships: []
      }
      whatsapp_conversation_participants: {
        Row: {
          bitrix_id: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          last_seen_at: string | null
          operator_id: string
          phone_number: string
          role: string | null
        }
        Insert: {
          bitrix_id?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_seen_at?: string | null
          operator_id: string
          phone_number: string
          role?: string | null
        }
        Update: {
          bitrix_id?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_seen_at?: string | null
          operator_id?: string
          phone_number?: string
          role?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          bitrix_id: string | null
          content: string | null
          conversation_id: number | null
          created_at: string | null
          delivered_at: string | null
          direction: string
          gupshup_message_id: string | null
          id: string
          media_type: string | null
          media_url: string | null
          message_type: string
          metadata: Json | null
          phone_number: string
          read_at: string | null
          sender_name: string | null
          sent_by: string | null
          status: string | null
          template_name: string | null
        }
        Insert: {
          bitrix_id?: string | null
          content?: string | null
          conversation_id?: number | null
          created_at?: string | null
          delivered_at?: string | null
          direction: string
          gupshup_message_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          phone_number: string
          read_at?: string | null
          sender_name?: string | null
          sent_by?: string | null
          status?: string | null
          template_name?: string | null
        }
        Update: {
          bitrix_id?: string | null
          content?: string | null
          conversation_id?: number | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          gupshup_message_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          phone_number?: string
          read_at?: string | null
          sender_name?: string | null
          sent_by?: string | null
          status?: string | null
          template_name?: string | null
        }
        Relationships: []
      }
      whatsapp_operator_notifications: {
        Row: {
          bitrix_id: string | null
          created_at: string | null
          id: string
          message: string | null
          operator_id: string
          phone_number: string | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          bitrix_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          operator_id: string
          phone_number?: string | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          bitrix_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          operator_id?: string
          phone_number?: string | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      mv_whatsapp_conversation_stats: {
        Row: {
          bitrix_id: string | null
          last_customer_message_at: string | null
          last_message_at: string | null
          last_message_direction: string | null
          last_message_preview: string | null
          phone_number: string | null
          response_status: string | null
          total_messages: number | null
          unread_count: number | null
        }
        Relationships: []
      }
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
      can_access_whatsapp_message: {
        Args: { message_bitrix_id: string; message_phone: string }
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
      check_message_rate_limit: {
        Args: {
          p_content_preview?: string
          p_message_hash?: string
          p_phone_number: string
          p_source?: string
        }
        Returns: Json
      }
      clean_corrupted_fonte: { Args: never; Returns: Json }
      clean_old_lead_search_cache: { Args: never; Returns: undefined }
      cleanup_actions_log_batch: {
        Args: { batch_size?: number; days_to_keep?: number }
        Returns: Json
      }
      cleanup_expired_scouter_sessions: { Args: never; Returns: number }
      cleanup_old_actions_log: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      cleanup_old_rate_limits:
        | { Args: never; Returns: number }
        | { Args: { days_to_keep?: number }; Returns: number }
      cleanup_old_sync_events: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      cleanup_rate_limits_batch: {
        Args: { batch_size?: number; days_to_keep?: number }
        Returns: Json
      }
      cleanup_scouter_location_history: { Args: never; Returns: number }
      cleanup_sync_events_batch: {
        Args: { batch_size?: number; days_to_keep?: number }
        Returns: Json
      }
      count_admin_whatsapp_conversations: {
        Args: {
          p_deal_status_filter?: string
          p_etapa_filter?: string
          p_response_filter?: string
          p_search?: string
          p_window_filter?: string
        }
        Returns: number
      }
      count_leads_to_reprocess: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_only_missing_fields?: boolean
        }
        Returns: number
      }
      detect_webhook_loop: {
        Args: {
          p_event_type: string
          p_phone_number: string
          p_threshold?: number
          p_time_window_seconds?: number
        }
        Returns: Json
      }
      emergency_block_number: {
        Args: {
          p_duration_hours?: number
          p_phone_number: string
          p_reason?: string
        }
        Returns: Json
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
      fn_calculate_queue_wait_time: {
        Args: { p_producer_id: string }
        Returns: {
          clients_waiting: number
          estimated_minutes: number
          producers_ahead: number
          producers_available: number
          queue_pos: number
        }[]
      }
      fn_get_next_available_producer: {
        Args: never
        Returns: {
          has_penalty: boolean
          producer_id: string
          producer_name: string
          queue_pos: number
        }[]
      }
      fn_get_producer_queue: {
        Args: never
        Returns: {
          average_time: number
          consecutive_losses: number
          conversion_rate: number
          penalty_active: boolean
          producer_id: string
          producer_name: string
          producer_photo: string
          queue_pos: number
          status: string
          total_attendances: number
        }[]
      }
      fn_producer_finish_attendance: {
        Args: { p_producer_id: string; p_result: string }
        Returns: {
          message: string
          new_position: number
          penalty_applied: boolean
          success: boolean
        }[]
      }
      fn_producer_join_queue: {
        Args: { p_producer_id: string }
        Returns: {
          message: string
          new_position: number
          success: boolean
        }[]
      }
      fn_producer_leave_queue: {
        Args: { p_producer_id: string; p_reason?: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      fn_producer_start_attendance: {
        Args: { p_deal_id: string; p_producer_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      fn_recalculate_queue_positions: { Args: never; Returns: undefined }
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
      get_admin_whatsapp_conversations: {
        Args: {
          p_deal_status_filter?: string
          p_etapa_filter?: string
          p_limit?: number
          p_offset?: number
          p_response_filter?: string
          p_search?: string
          p_window_filter?: string
        }
        Returns: {
          bitrix_id: string
          deal_category_id: string
          deal_count: number
          deal_stage_id: string
          deal_status: string
          deal_title: string
          last_customer_message_at: string
          last_message_at: string
          last_message_direction: string
          last_message_preview: string
          last_operator_name: string
          last_operator_photo_url: string
          lead_etapa: string
          lead_id: number
          lead_name: string
          phone_number: string
          response_status: string
          total_messages: number
          unread_count: number
        }[]
      }
      get_admin_whatsapp_stats: {
        Args: never
        Returns: {
          last_refresh: string
          open_windows: number
          total_conversations: number
          total_unread: number
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
      get_area_comparecidos: {
        Args: {
          p_end_date?: string
          p_project_id?: string
          p_start_date?: string
        }
        Returns: {
          address: string
          data_compareceu: string
          id: number
          latitude: string
          local_abordagem: string
          longitude: string
          name: string
          projeto_comercial: string
          scouter: string
          total_count: number
        }[]
      }
      get_comparecidos_by_date:
        | {
            Args: {
              p_end_date: string
              p_operator_id?: number
              p_start_date: string
            }
            Returns: {
              bitrix_telemarketing_id: number
              data_compareceu: string
              fonte_normalizada: string
              id: number
              name: string
              nome_modelo: string
              scouter: string
              telemarketing: string
            }[]
          }
        | {
            Args: {
              p_end_date: string
              p_operator_id?: number
              p_operator_ids?: number[]
              p_start_date: string
            }
            Returns: {
              bitrix_telemarketing_id: number
              data_compareceu: string
              fonte_normalizada: string
              id: number
              name: string
              nome_modelo: string
              scouter: string
              telemarketing: string
            }[]
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
      get_daily_agendados_ranking: {
        Args: never
        Returns: {
          bitrix_telemarketing_id: number
          operator_name: string
          total: number
        }[]
      }
      get_dashboard_stats: {
        Args: {
          p_end_date?: string
          p_show_all?: boolean
          p_start_date?: string
          p_user_id?: string
        }
        Returns: {
          action_stats: Json
          scheduled_count: number
          todays_contacts: number
          total_leads: number
        }[]
      }
      get_failed_scouter_messages: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          criado: string
          lead_id: number
          lead_name: string
          phone_normalized: string
          pode_reenviar: boolean
          projeto_comercial: string
          scouter: string
          total_envios: number
          ultimo_erro: string
          ultimo_erro_at: string
        }[]
      }
      get_failed_scouter_messages_count: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: {
          limite_atingido: number
          podem_reenviar: number
          total_com_erro: number
        }[]
      }
      get_filtered_leads_count: {
        Args: {
          p_end_date?: string
          p_fonte?: string
          p_project_id?: string
          p_scouter?: string
          p_search_term?: string
          p_start_date?: string
          p_with_photo?: boolean
        }
        Returns: number
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
      get_leadrometro_stats: {
        Args: {
          p_end_date: string
          p_source_filter?: string
          p_start_date: string
        }
        Returns: {
          agendados: number
          com_foto: number
          confirmados: number
          convertidos: number
          em_analise: number
          total: number
        }[]
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
      get_maintenance_stats: { Args: never; Returns: Json }
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
      get_operator_whatsapp_messages: {
        Args: { p_operator_bitrix_id: number; p_phone_numbers: string[] }
        Returns: {
          last_message_at: string
          last_message_content: string
          last_message_direction: string
          phone_number: string
          total_messages: number
        }[]
      }
      get_or_create_private_conversation: {
        Args: { p_other_user_id: string; p_user_id: string }
        Returns: string
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
      get_rate_limit_stats: { Args: never; Returns: Json }
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
      get_scouter_leads_simple:
        | {
            Args: {
              p_date_from?: string
              p_date_to?: string
              p_empreendimento?: string
              p_limit?: number
              p_offset?: number
              p_scouter_ids?: number[]
              p_search?: string
              p_sort_direction?: string
              p_sort_field?: string
              p_status?: string
              p_template_status?: string
            }
            Returns: {
              assigned_by_id: number
              assigned_by_name: string
              bitrix_id: string
              comments: string
              created_at: string
              date_create: string
              email: string
              empreendimento: string
              id: number
              last_activity_at: string
              last_updated_at: string
              name: string
              phone: string
              phone_normalized: string
              raw: Json
              source_description: string
              source_id: string
              status_id: string
              template_error_reason: string
              template_send_count: number
              template_status: string
              total_count: number
              uf_crm_1736abordar: string
              uf_crm_1741telefone2: string
              updated_at: string
            }[]
          }
        | {
            Args: {
              p_date_from?: string
              p_date_to?: string
              p_page?: number
              p_per_page?: number
              p_project_code?: string
              p_scouter_name: string
              p_search?: string
              p_sort_direction?: string
              p_sort_field?: string
              p_status?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_date_from: string
              p_date_to: string
              p_filter_type?: string
              p_limit?: number
              p_offset?: number
              p_project_id?: string
              p_scouter_name: string
              p_search?: string
              p_sort_order?: string
              p_status_filter?: string
            }
            Returns: {
              address: string
              age: number
              celular: string
              compareceu: boolean
              criado: string
              data_agendamento: string
              etapa_funil: string
              ficha_confirmada: boolean
              lead_id: number
              nome_modelo: string
              nome_responsavel: string
              phone_normalized: string
              photo_url: string
              projeto_comercial: string
              template_error_reason: string
              template_send_count: number
              template_status: string
              total_count: number
            }[]
          }
      get_scouter_location_history: {
        Args: {
          p_date_from: string
          p_date_to: string
          p_limit?: number
          p_scouter_bitrix_id: number
        }
        Returns: {
          address: string
          latitude: number
          longitude: number
          recorded_at: string
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
          p_date_from?: string
          p_date_to?: string
          p_project_code?: string
          p_scouter_name: string
        }
        Returns: {
          agendados: number
          com_foto: number
          compareceram: number
          confirmados: number
          duplicados: number
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
        }[]
      }
      get_scouter_ranking_position: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_scouter_name: string
        }
        Returns: {
          rank_position: number
          scouter_name: string
          total_leads: number
        }[]
      }
      get_scouter_template_history: {
        Args: {
          p_lead_id: number
          p_limit?: number
          p_phone_normalized: string
        }
        Returns: {
          created_at: string
          error_reason: string
          id: string
          status: string
          template_name: string
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
      get_stats_comparison: {
        Args: {
          p_current_end: string
          p_current_start: string
          p_previous_end: string
          p_previous_start: string
        }
        Returns: {
          confirmed: number
          period: string
          present: number
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
      get_telemarketing_conversations:
        | {
            Args: {
              p_limit?: number
              p_offset?: number
              p_operator_bitrix_id?: number
              p_search?: string
              p_team_operator_ids?: number[]
            }
            Returns: {
              bitrix_id: string
              conversation_id: number
              last_message_at: string
              last_message_preview: string
              lead_id: number
              lead_name: string
              phone_number: string
              photo_url: string
              telemarketing_name: string
              unread_count: number
              window_open: boolean
            }[]
          }
        | {
            Args: {
              p_limit?: number
              p_operator_bitrix_id: number
              p_search?: string
              p_team_operator_ids?: number[]
            }
            Returns: {
              bitrix_id: string
              last_message_at: string
              last_message_preview: string
              lead_id: number
              lead_name: string
              phone_number: string
              photo_url: string
              telemarketing_name: string
              unread_count: number
              window_open: boolean
            }[]
          }
      get_telemarketing_metrics:
        | {
            Args: {
              p_end_date: string
              p_operator_id?: number
              p_operator_ids?: number[]
              p_start_date: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_end_date: string
              p_operator_id?: number
              p_start_date: string
            }
            Returns: Json
          }
      get_telemarketing_whatsapp_messages: {
        Args: {
          p_lead_id?: number
          p_limit?: number
          p_operator_bitrix_id?: number
          p_phone_number?: string
          p_team_operator_ids?: number[]
        }
        Returns: {
          bitrix_id: string
          content: string
          created_at: string
          direction: string
          gupshup_message_id: string
          id: string
          media_type: string
          media_url: string
          message_type: string
          metadata: Json
          phone_number: string
          read_at: string
          status: string
          template_name: string
        }[]
      }
      get_top_active_numbers: {
        Args: { p_limit?: number }
        Returns: {
          event_count: number
          last_event: string
          phone_number: string
          sources: string[]
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
      get_whatsapp_conversation_stats: {
        Args: { p_bitrix_ids?: string[]; p_phone_numbers?: string[] }
        Returns: {
          identifier: string
          identifier_type: string
          last_inbound_at: string
          last_message_at: string
          last_outbound_at: string
          total_messages: number
          unread_messages: number
        }[]
      }
      get_whatsapp_message_stats: {
        Args: { p_phone_numbers: string[] }
        Returns: {
          last_customer_message_at: string
          last_message_at: string
          last_message_content: string
          last_message_direction: string
          phone_number: string
          unread_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_maxtalk_admin: {
        Args: { conv_id: string; usr_id: string }
        Returns: boolean
      }
      is_maxtalk_member: {
        Args: { conv_id: string; usr_id: string }
        Returns: boolean
      }
      map_bitrix_stage_to_status: {
        Args: { stage_id: string }
        Returns: string
      }
      mark_telemarketing_whatsapp_messages_read: {
        Args: {
          p_message_ids: string[]
          p_operator_bitrix_id: number
          p_team_operator_ids?: number[]
        }
        Returns: number
      }
      normalize_etapa: { Args: { raw_etapa: string }; Returns: string }
      normalize_etapa_single_batch: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      normalize_fonte: { Args: { raw_fonte: string }; Returns: string }
      normalize_phone_number: {
        Args: { celular: string; raw_phone: Json }
        Returns: string
      }
      populate_phone_normalized_batch: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      recalculate_fonte_batch: { Args: never; Returns: Json }
      recalculate_fonte_single_batch: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      refresh_whatsapp_stats: { Args: never; Returns: undefined }
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
      run_database_maintenance: {
        Args: never
        Returns: {
          deleted_rows: number
          table_name: string
        }[]
      }
      telemarketing_heartbeat: {
        Args: { p_bitrix_id: number }
        Returns: undefined
      }
      unblock_phone_number: {
        Args: { p_phone_number: string; p_user_id?: string }
        Returns: boolean
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
          scouter_bitrix_id: number
          scouter_id: string
          scouter_name: string
          scouter_photo: string
          scouter_tier: string
        }[]
      }
      validate_telemarketing_access_key: {
        Args: { p_access_key: string }
        Returns: {
          bitrix_id: number
          cargo: string
          commercial_project_id: string
          operator_id: string
          operator_name: string
          operator_photo: string
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
      producer_attendance_status_enum:
        | "DISPONIVEL"
        | "EM_ATENDIMENTO"
        | "PAUSA"
        | "INDISPONIVEL"
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
      producer_attendance_status_enum: [
        "DISPONIVEL",
        "EM_ATENDIMENTO",
        "PAUSA",
        "INDISPONIVEL",
      ],
    },
  },
} as const
