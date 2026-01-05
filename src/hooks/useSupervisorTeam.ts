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

export function useSupervisorTeam(commercialProjectId: string | null, supervisorBitrixId: number | null) {
  return useQuery({
    queryKey: ['supervisor-team', commercialProjectId, supervisorBitrixId],
    // Apenas precisa do bitrix_id do supervisor - projectId é opcional
    enabled: !!supervisorBitrixId,
    queryFn: async (): Promise<SupervisorTeamData> => {
      if (!supervisorBitrixId) {
        return { agents: [], projectId: null, projectName: null, projectCode: null };
      }

      // Buscar dados do projeto (opcional)
      let projectData = null;
      if (commercialProjectId) {
        const { data, error: projectError } = await supabase
          .from('commercial_projects')
          .select('id, name, code')
          .eq('id', commercialProjectId)
          .single();

        if (projectError) {
          console.error('Erro ao buscar projeto:', projectError);
        } else {
          projectData = data;
        }
      }

      // Buscar o tabuladormax_user_id do supervisor pelo bitrix_id
      const { data: supervisorMapping, error: supervisorError } = await supabase
        .from('agent_telemarketing_mapping')
        .select('tabuladormax_user_id')
        .eq('bitrix_telemarketing_id', supervisorBitrixId)
        .single();

      if (supervisorError || !supervisorMapping?.tabuladormax_user_id) {
        console.error('Erro ao buscar mapping do supervisor:', supervisorError);
        return {
          agents: [],
          projectId: projectData?.id || null,
          projectName: projectData?.name || null,
          projectCode: projectData?.code || null,
        };
      }

      // Buscar agentes que têm esse supervisor_id
      let agentsQuery = supabase
        .from('agent_telemarketing_mapping')
        .select('*')
        .eq('supervisor_id', supervisorMapping.tabuladormax_user_id)
        .order('bitrix_telemarketing_name');

      // Se tem projectId, filtra também por projeto para não misturar equipes
      if (commercialProjectId) {
        agentsQuery = agentsQuery.eq('commercial_project_id', commercialProjectId);
      }

      const { data: agentsData, error: agentsError } = await agentsQuery;

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
