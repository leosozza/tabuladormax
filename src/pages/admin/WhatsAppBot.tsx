import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Settings, Sparkles, BarChart3, GraduationCap } from 'lucide-react';
import { BotConfig } from '@/components/whatsapp/BotConfig';
import { BotPlayground } from '@/components/whatsapp/BotPlayground';
import { BotDashboard } from '@/components/whatsapp/BotDashboard';
import { BotTraining } from '@/components/whatsapp/BotTraining';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBotConfig } from '@/hooks/useWhatsAppBot';

export default function WhatsAppBot() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Buscar projetos comerciais
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['commercial-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_projects')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const { data: botConfig } = useBotConfig(selectedProjectId);

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bot de IA WhatsApp</h1>
        <p className="text-muted-foreground">Configure e gerencie o atendimento automatizado por IA</p>
      </div>
      <div className="space-y-6">
        {/* Seleção de Projeto */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <CardTitle className="text-lg">Selecionar Projeto</CardTitle>
                <CardDescription>
                  Escolha o projeto comercial para configurar o bot
                </CardDescription>
              </div>
              {selectedProjectId && botConfig && (
                <Badge variant={botConfig.is_enabled ? 'default' : 'secondary'}>
                  {botConfig.is_enabled ? 'Bot Ativo' : 'Bot Inativo'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedProjectId} 
              onValueChange={setSelectedProjectId}
              disabled={loadingProjects}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Selecione um projeto comercial..." />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{project.code}</Badge>
                      {project.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Tabs de Configuração */}
        {selectedProjectId ? (
          <Tabs defaultValue="config" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="config" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configuração</span>
              </TabsTrigger>
              <TabsTrigger value="training" className="gap-2">
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">Treinamento</span>
              </TabsTrigger>
              <TabsTrigger value="playground" className="gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Playground</span>
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config">
              <BotConfig 
                projectId={selectedProjectId} 
                projectName={selectedProject?.name}
              />
            </TabsContent>

            <TabsContent value="training">
              <BotTraining projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="playground">
              <BotPlayground projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="dashboard">
              <BotDashboard projectId={selectedProjectId} />
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum projeto selecionado</h3>
              <p className="text-muted-foreground max-w-md">
                Selecione um projeto comercial acima para configurar o bot de IA,
                adicionar treinamentos e testar o atendimento automatizado.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
