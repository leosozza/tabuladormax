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

// Cargos que precisam herdar equipe do supervisor principal
const ADJUNTO_CARGOS = ['10626', '10627']; // Supervisor Adjunto + Control Desk

export function useSupervisorTeam(
  commercialProjectId: string | null, 
  supervisorBitrixId: number | null,
  operatorCargo?: string
) {
  return useQuery({
    queryKey: ['supervisor-team', commercialProjectId, supervisorBitrixId, operatorCargo],
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

      // Buscar o mapping do operador atual
      const { data: currentMapping, error: currentError } = await supabase
        .from('agent_telemarketing_mapping')
        .select('tabuladormax_user_id, supervisor_id')
        .eq('bitrix_telemarketing_id', supervisorBitrixId)
        .single();

      if (currentError || !currentMapping) {
        console.error('Erro ao buscar mapping do operador:', currentError);
        return {
          agents: [],
          projectId: projectData?.id || null,
          projectName: projectData?.name || null,
          projectCode: projectData?.code || null,
        };
      }

      // Determinar qual supervisor_id usar para buscar a equipe
      let supervisorUuid: string | null = null;

      if (operatorCargo && ADJUNTO_CARGOS.includes(operatorCargo)) {
        // Supervisor Adjunto: herdar a equipe do supervisor principal
        // O supervisor_id do adjunto aponta para o supervisor principal
        supervisorUuid = currentMapping.supervisor_id;
        console.log('[useSupervisorTeam] Supervisor Adjunto - herdando equipe do supervisor:', supervisorUuid);
      } else {
        // Supervisor principal: usar próprio tabuladormax_user_id
        supervisorUuid = currentMapping.tabuladormax_user_id;
      }

      if (!supervisorUuid) {
        console.error('Não foi possível determinar o supervisor_id para buscar agentes');
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
        .eq('supervisor_id', supervisorUuid)
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
