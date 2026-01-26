import { useState } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, GraduationCap, Users, Link2 } from 'lucide-react';
import { AIAgentsList } from '@/components/admin/ai-agents/AIAgentsList';
import { AIAgentTrainingList } from '@/components/admin/ai-agents/AIAgentTrainingList';
import { AgentOperatorAssignmentList } from '@/components/admin/ai-agents/AgentOperatorAssignmentList';
import { AgentTrainingLinksManager } from '@/components/admin/ai-agents/AgentTrainingLinksManager';
import { useAIAgents } from '@/hooks/useAIAgents';

export default function AIAgents() {
  const [activeTab, setActiveTab] = useState('agents');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { agents } = useAIAgents();

  const handleSelectAgentForTraining = (agentId: string) => {
    setSelectedAgentId(agentId);
    setActiveTab('training');
  };

  return (
    <MainLayout
      title="Agentes de IA"
      subtitle="Gerencie agentes de IA e seus treinamentos para WhatsApp"
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Agentes</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Instruções</span>
            </TabsTrigger>
            <TabsTrigger value="links" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Treinamentos</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Operadores</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-6">
            <AIAgentsList onSelectForTraining={handleSelectAgentForTraining} />
          </TabsContent>

          <TabsContent value="training" className="mt-6">
            <AIAgentTrainingList
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
            />
          </TabsContent>

          <TabsContent value="links" className="mt-6">
            <AgentTrainingLinksManager
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
            />
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <AgentOperatorAssignmentList agents={agents} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
