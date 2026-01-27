// Hook for managing pipeline configurations
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PipelineConfig {
  id: string;
  name: string;
  description: string | null;
  stage_mapping: {
    stages: Record<string, string>;  // Bitrix stage -> internal status
    reverse: Record<string, string>; // internal status -> Bitrix stage
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePipelines() {
  return useQuery({
    queryKey: ['pipeline-configs'],
    queryFn: async (): Promise<PipelineConfig[]> => {
      const { data, error } = await supabase
        .from('pipeline_configs')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching pipeline configs:', error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        stage_mapping: item.stage_mapping as PipelineConfig['stage_mapping'],
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePipelineConfig(pipelineId: string | null) {
  return useQuery({
    queryKey: ['pipeline-config', pipelineId],
    queryFn: async (): Promise<PipelineConfig | null> => {
      if (!pipelineId) return null;

      const { data, error } = await supabase
        .from('pipeline_configs')
        .select('*')
        .eq('id', pipelineId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching pipeline config:', error);
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        stage_mapping: data.stage_mapping as PipelineConfig['stage_mapping'],
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    enabled: !!pipelineId,
    staleTime: 1000 * 60 * 5,
  });
}

// Helper to get status from Bitrix stage
export function getStatusFromStage(stageMapping: PipelineConfig['stage_mapping'], stageId: string): string {
  return stageMapping?.stages?.[stageId] || 'recepcao_cadastro';
}

// Helper to get Bitrix stage from status
export function getStageFromStatus(stageMapping: PipelineConfig['stage_mapping'], status: string): string | null {
  return stageMapping?.reverse?.[status] || null;
}
