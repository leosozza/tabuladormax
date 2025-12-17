import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TelemarketingScript {
  id: string;
  title: string;
  content: string;
  category: string;
  commercial_project_id: string | null;
  is_active: boolean;
  priority: number;
  ai_analysis: any;
  ai_score: number | null;
  ai_analyzed_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTelemarketingScripts(projectId?: string | null) {
  return useQuery({
    queryKey: ['telemarketing-scripts', projectId],
    queryFn: async () => {
      let query = supabase
        .from('telemarketing_scripts')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('category', { ascending: true });
      
      if (projectId) {
        query = query.eq('commercial_project_id', projectId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching scripts:', error);
        throw error;
      }
      
      return data as TelemarketingScript[];
    },
    enabled: true
  });
}

export function useAllTelemarketingScripts(projectId?: string | null) {
  return useQuery({
    queryKey: ['telemarketing-scripts-all', projectId],
    queryFn: async () => {
      let query = supabase
        .from('telemarketing_scripts')
        .select('*')
        .order('priority', { ascending: false })
        .order('category', { ascending: true });
      
      if (projectId) {
        query = query.eq('commercial_project_id', projectId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching all scripts:', error);
        throw error;
      }
      
      return data as TelemarketingScript[];
    },
    enabled: true
  });
}

export function useCreateScript() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (script: Omit<TelemarketingScript, 'id' | 'created_at' | 'updated_at' | 'ai_analysis' | 'ai_score' | 'ai_analyzed_at'>) => {
      const { data, error } = await supabase
        .from('telemarketing_scripts')
        .insert(script)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemarketing-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['telemarketing-scripts-all'] });
    }
  });
}

export function useUpdateScript() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TelemarketingScript> & { id: string }) => {
      const { data, error } = await supabase
        .from('telemarketing_scripts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemarketing-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['telemarketing-scripts-all'] });
    }
  });
}

export function useDeleteScript() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('telemarketing_scripts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemarketing-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['telemarketing-scripts-all'] });
    }
  });
}

export function useAnalyzeScript() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (scriptId: string) => {
      const { data, error } = await supabase.functions.invoke('analyze-script', {
        body: { scriptId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemarketing-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['telemarketing-scripts-all'] });
    }
  });
}

export interface GenerateScriptParams {
  category: string;
  productService?: string;
  targetAudience?: string;
  tone?: string;
  projectId?: string;
}

export function useGenerateScript() {
  return useMutation({
    mutationFn: async (params: GenerateScriptParams) => {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: params
      });
      
      if (error) throw error;
      return data as { script: string; suggestedTitle: string; category: string };
    }
  });
}

export interface ImproveScriptParams {
  scriptId?: string;
  scriptContent?: string;
  techniques: string[];
  improvementType?: 'quick' | 'strategic';
}

export function useImproveScript() {
  return useMutation({
    mutationFn: async (params: ImproveScriptParams) => {
      const { data, error } = await supabase.functions.invoke('improve-script', {
        body: params
      });
      
      if (error) throw error;
      return data as { improvedScript: string; techniquesApplied: string[] };
    }
  });
}
