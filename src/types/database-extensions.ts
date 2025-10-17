// Tipos temporários até que o Supabase atualize os tipos automaticamente
// Este arquivo pode ser removido quando src/integrations/supabase/types.ts for atualizado

export type PermissionScope = 'global' | 'department' | 'own';

export type AppRole = 'admin' | 'manager' | 'supervisor' | 'agent';

export interface CommercialProject {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  commercial_project_id: string;
  parent_id: string | null;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  children?: Department[];
  agent_count?: number;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  label: string;
  description: string | null;
  scope: PermissionScope;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: AppRole;
  permission_id: string;
  scope: PermissionScope;
  created_at: string;
  updated_at: string;
}

export interface AgentTelemarketingMappingExtended {
  id: string;
  tabuladormax_user_id: string | null;
  bitrix_telemarketing_id: number;
  bitrix_telemarketing_name: string | null;
  chatwoot_agent_id: number | null;
  chatwoot_agent_email: string | null;
  commercial_project_id: string | null;
  department_id: string | null;
  supervisor_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}
