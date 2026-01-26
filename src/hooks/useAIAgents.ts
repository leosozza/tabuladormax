import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIAgent {
  id: string;
  name: string;
  description: string | null;
  commercial_project_id: string | null;
  system_prompt: string;
  personality: string;
  ai_provider: string;
  ai_model: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIAgentTraining {
  id: string;
  agent_id: string;
  title: string;
  content: string;
  category: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentOperatorAssignment {
  id: string;
  agent_id: string;
  operator_bitrix_id: number;
  assigned_by: string | null;
  is_active: boolean;
  created_at: string;
  agent?: AIAgent;
}

export function useAIAgents() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .order('name');

      if (error) throw error;
      setAgents((data as AIAgent[]) || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
      toast.error('Erro ao carregar agentes');
    } finally {
      setLoading(false);
    }
  }, []);

  const createAgent = useCallback(async (agent: Omit<AIAgent, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('ai_agents')
        .insert({
          ...agent,
          created_by: userData.user?.id || null
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Agente criado com sucesso!');
      await fetchAgents();
      return data as AIAgent;
    } catch (err) {
      console.error('Error creating agent:', err);
      toast.error('Erro ao criar agente');
      return null;
    } finally {
      setSaving(false);
    }
  }, [fetchAgents]);

  const updateAgent = useCallback(async (id: string, updates: Partial<AIAgent>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agents')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Agente atualizado!');
      await fetchAgents();
      return true;
    } catch (err) {
      console.error('Error updating agent:', err);
      toast.error('Erro ao atualizar agente');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchAgents]);

  const deleteAgent = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Agente removido!');
      await fetchAgents();
      return true;
    } catch (err) {
      console.error('Error deleting agent:', err);
      toast.error('Erro ao remover agente');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchAgents]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    loading,
    saving,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
  };
}

export function useAIAgentTraining(agentId: string | null) {
  const [trainings, setTrainings] = useState<AIAgentTraining[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTrainings = useCallback(async () => {
    if (!agentId) {
      setTrainings([]);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_agents_training')
        .select('*')
        .eq('agent_id', agentId)
        .order('priority', { ascending: false });

      if (error) throw error;
      setTrainings((data as AIAgentTraining[]) || []);
    } catch (err) {
      console.error('Error fetching trainings:', err);
      toast.error('Erro ao carregar treinamentos');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const createTraining = useCallback(async (training: Omit<AIAgentTraining, 'id' | 'created_at' | 'updated_at'>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agents_training')
        .insert(training);

      if (error) throw error;
      toast.success('Treinamento adicionado!');
      await fetchTrainings();
      return true;
    } catch (err) {
      console.error('Error creating training:', err);
      toast.error('Erro ao adicionar treinamento');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchTrainings]);

  const updateTraining = useCallback(async (id: string, updates: Partial<AIAgentTraining>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agents_training')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Treinamento atualizado!');
      await fetchTrainings();
      return true;
    } catch (err) {
      console.error('Error updating training:', err);
      toast.error('Erro ao atualizar treinamento');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchTrainings]);

  const deleteTraining = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agents_training')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Treinamento removido!');
      await fetchTrainings();
      return true;
    } catch (err) {
      console.error('Error deleting training:', err);
      toast.error('Erro ao remover treinamento');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchTrainings]);

  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  return {
    trainings,
    loading,
    saving,
    fetchTrainings,
    createTraining,
    updateTraining,
    deleteTraining,
  };
}

export function useAgentOperatorAssignments() {
  const [assignments, setAssignments] = useState<AgentOperatorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_operator_assignments')
        .select(`
          *,
          agent:ai_agents(*)
        `)
        .eq('is_active', true);

      if (error) throw error;
      setAssignments((data as AgentOperatorAssignment[]) || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      toast.error('Erro ao carregar vínculos');
    } finally {
      setLoading(false);
    }
  }, []);

  const assignOperator = useCallback(async (agentId: string, operatorBitrixId: number) => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // First, deactivate any existing assignment for this operator
      await supabase
        .from('agent_operator_assignments')
        .update({ is_active: false })
        .eq('operator_bitrix_id', operatorBitrixId)
        .eq('is_active', true);

      // Create new assignment
      const { error } = await supabase
        .from('agent_operator_assignments')
        .insert({
          agent_id: agentId,
          operator_bitrix_id: operatorBitrixId,
          assigned_by: userData.user?.id || null,
          is_active: true
        });

      if (error) throw error;
      toast.success('Operador vinculado ao agente!');
      await fetchAssignments();
      return true;
    } catch (err) {
      console.error('Error assigning operator:', err);
      toast.error('Erro ao vincular operador');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchAssignments]);

  const unassignOperator = useCallback(async (assignmentId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agent_operator_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;
      toast.success('Vínculo removido!');
      await fetchAssignments();
      return true;
    } catch (err) {
      console.error('Error unassigning operator:', err);
      toast.error('Erro ao remover vínculo');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchAssignments]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    loading,
    saving,
    fetchAssignments,
    assignOperator,
    unassignOperator,
  };
}
