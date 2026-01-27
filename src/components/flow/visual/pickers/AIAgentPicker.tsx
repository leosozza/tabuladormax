// ============================================
// AI Agent Picker - Select AI agents
// ============================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';

interface AIAgentPickerProps {
  value?: string;
  onChange: (agentId: string, agentName: string) => void;
  placeholder?: string;
}

interface AIAgent {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
}

export function AIAgentPicker({ value, onChange, placeholder = 'Selecionar agente IA' }: AIAgentPickerProps) {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['ai-agents-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('id, name, description, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as AIAgent[];
    }
  });

  const selectedAgent = agents.find(a => a.id === value);

  return (
    <Select 
      value={value} 
      onValueChange={(val) => {
        const agent = agents.find(a => a.id === val);
        if (agent) {
          onChange(agent.id, agent.name);
        }
      }}
    >
      <SelectTrigger className="text-sm">
        <SelectValue placeholder={placeholder}>
          {selectedAgent && (
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="truncate">{selectedAgent.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <div className="p-2 text-sm text-muted-foreground">Carregando...</div>
        ) : agents.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">Nenhum agente IA ativo</div>
        ) : (
          agents.map(agent => (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="font-medium">{agent.name}</span>
                </div>
                {agent.description && (
                  <span className="text-xs text-muted-foreground pl-6 line-clamp-1">
                    {agent.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
