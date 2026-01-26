import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrainingInstruction {
  id: string;
  title: string;
  type: string;
  content: string | null;
  file_path: string | null;
  priority: number;
  is_active: boolean;
  category: string | null;
  created_at: string;
}

export interface AgentTrainingLink {
  id: string;
  agent_id: string;
  training_id: string;
  created_at: string;
  training?: TrainingInstruction;
}

export function useAgentTrainingLinks(agentId: string | null) {
  const [links, setLinks] = useState<AgentTrainingLink[]>([]);
  const [availableTrainings, setAvailableTrainings] = useState<TrainingInstruction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchLinks = useCallback(async () => {
    if (!agentId) {
      setLinks([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_training_links')
        .select(`
          *,
          training:ai_training_instructions(*)
        `)
        .eq('agent_id', agentId);

      if (error) throw error;
      
      // Type assertion since Supabase types might not be updated
      setLinks((data as unknown as AgentTrainingLink[]) || []);
    } catch (err) {
      console.error('Error fetching training links:', err);
      toast.error('Erro ao carregar treinamentos vinculados');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const fetchAvailableTrainings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ai_training_instructions')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      setAvailableTrainings((data as TrainingInstruction[]) || []);
    } catch (err) {
      console.error('Error fetching available trainings:', err);
    }
  }, []);

  const linkTraining = useCallback(async (trainingId: string) => {
    if (!agentId) return false;

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('agent_training_links')
        .insert({
          agent_id: agentId,
          training_id: trainingId,
          created_by: userData.user?.id || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este treinamento já está vinculado ao agente');
        } else {
          throw error;
        }
        return false;
      }

      toast.success('Treinamento vinculado!');
      await fetchLinks();
      return true;
    } catch (err) {
      console.error('Error linking training:', err);
      toast.error('Erro ao vincular treinamento');
      return false;
    } finally {
      setSaving(false);
    }
  }, [agentId, fetchLinks]);

  const unlinkTraining = useCallback(async (linkId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agent_training_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast.success('Treinamento desvinculado!');
      await fetchLinks();
      return true;
    } catch (err) {
      console.error('Error unlinking training:', err);
      toast.error('Erro ao desvincular treinamento');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchLinks]);

  useEffect(() => {
    fetchLinks();
    fetchAvailableTrainings();
  }, [fetchLinks, fetchAvailableTrainings]);

  return {
    links,
    availableTrainings,
    loading,
    saving,
    fetchLinks,
    linkTraining,
    unlinkTraining,
  };
}
