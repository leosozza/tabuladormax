import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamAgent {
  id: string;
  bitrix_telemarketing_id: number;
  bitrix_telemarketing_name: string | null;
  tabuladormax_user_id: string | null;
  chatwoot_agent_email: string | null;
  chatwoot_agent_id: number | null;
  created_at: string;
}

export interface SupervisorTeamData {
  agents: TeamAgent[];
  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;
}

export function useSupervisorTeam(commercialProjectId: string | null) {
  return useQuery({
    queryKey: ['supervisor-team', commercialProjectId],
    enabled: !!commercialProjectId,
    queryFn: async (): Promise<SupervisorTeamData> => {
      if (!commercialProjectId) {
        return { agents: [], projectId: null, projectName: null, projectCode: null };
      }

      // Buscar dados do projeto
      const { data: projectData, error: projectError } = await supabase
        .from('commercial_projects')
        .select('id, name, code')
        .eq('id', commercialProjectId)
        .single();

      if (projectError) {
        console.error('Erro ao buscar projeto:', projectError);
      }

      // Buscar agentes do mesmo projeto comercial
      const { data: agentsData, error: agentsError } = await supabase
        .from('agent_telemarketing_mapping')
        .select('*')
        .eq('commercial_project_id', commercialProjectId)
        .order('bitrix_telemarketing_name');

      if (agentsError) {
        console.error('Erro ao buscar agentes:', agentsError);
        throw agentsError;
      }

      return {
        agents: agentsData || [],
        projectId: projectData?.id || null,
        projectName: projectData?.name || null,
        projectCode: projectData?.code || null,
      };
    }
  });
}

export function useTeamTemplatePermissions(agentUserIds: string[]) {
  return useQuery({
    queryKey: ['team-template-permissions', agentUserIds],
    enabled: agentUserIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_template_permissions')
        .select('*')
        .in('user_id', agentUserIds);

      if (error) throw error;
      return data || [];
    }
  });
}
