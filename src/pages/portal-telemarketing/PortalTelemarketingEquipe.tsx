import { useEffect, useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Users, 
  Bot, 
  GraduationCap, 
  Play,
  User,
  Mail,
  Hash,
  Zap,
  Loader2
} from 'lucide-react';
import { useSupervisorTeam } from '@/hooks/useSupervisorTeam';
import { supabase } from '@/integrations/supabase/client';

import { BotConfig } from '@/components/whatsapp/BotConfig';
import { BotTraining } from '@/components/whatsapp/BotTraining';
import { BotPlayground } from '@/components/whatsapp/BotPlayground';
import { QuickTextManager } from '@/components/telemarketing/QuickTextManager';
import { ThemeSelector } from '@/components/portal-telemarketing/ThemeSelector';

interface TelemarketingContext {
  bitrix_id: number;
  cargo: string;
  name: string;
  commercial_project_id?: string;
}

const PortalTelemarketingEquipe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [context, setContext] = useState<TelemarketingContext | null>(null);
  const [activeTab, setActiveTab] = useState('agentes');
  const [isValidatingContext, setIsValidatingContext] = useState(true);
  const [isValidContext, setIsValidContext] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('telemarketing_context');
    if (stored) {
      setContext(JSON.parse(stored));
    } else {
      setIsValidatingContext(false);
      setIsValidContext(false);
    }
  }, []);

  // Validar que o bitrix_id existe na tabela telemarketing_operators
  useEffect(() => {
    const validateContext = async () => {
      if (!context) return;

      try {
        const { data, error } = await supabase
          .from('telemarketing_operators')
          .select('bitrix_id')
          .eq('bitrix_id', context.bitrix_id)
          .maybeSingle();

        if (error || !data) {
          console.warn('[Equipe] Contexto inválido - operador não encontrado:', context.bitrix_id);
          localStorage.removeItem('telemarketing_context');
          localStorage.removeItem('telemarketing_operator');
          setIsValidContext(false);
        } else {
          setIsValidContext(true);
        }
      } catch (e) {
        console.error('[Equipe] Erro ao validar contexto:', e);
        setIsValidContext(false);
      } finally {
        setIsValidatingContext(false);
      }
    };

    if (context) {
      validateContext();
    }
  }, [context?.bitrix_id]);

  const { data: teamData, isLoading: loadingTeam } = useSupervisorTeam(
    context?.commercial_project_id || null,
    context?.bitrix_id || null
  );

  // Mostrar loading enquanto valida
  if (isValidatingContext) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validando sessão...</p>
        </div>
      </div>
    );
  }

  // Se não tem contexto ou contexto inválido, redireciona para login
  if (!context || isValidContext === false) {
    const redirectTarget = `${location.pathname}${location.search}`;
    return <Navigate to={`/portal-telemarketing?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  const projectId = context.commercial_project_id || null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/portal-telemarketing')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-lg">Gestão da Equipe</h1>
                <p className="text-sm text-muted-foreground">
                  {teamData?.projectName || 'Carregando projeto...'}
                </p>
              </div>
            </div>
            <ThemeSelector />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full mb-6">
            <TabsTrigger value="agentes" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Agentes</span>
            </TabsTrigger>
            <TabsTrigger value="textos" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Textos Rápidos</span>
            </TabsTrigger>
            <TabsTrigger value="bot" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Bot IA</span>
            </TabsTrigger>
            <TabsTrigger value="treinamento" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Treinamento</span>
            </TabsTrigger>
            <TabsTrigger value="playground" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline">Playground</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Agentes */}
          <TabsContent value="agentes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Agentes da Equipe
                </CardTitle>
                <CardDescription>
                  {teamData?.agents.length || 0} agentes vinculados ao projeto {teamData?.projectCode}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTeam ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando agentes...
                  </div>
                ) : teamData?.agents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum agente encontrado neste projeto.
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {teamData?.agents.map((agent) => (
                        <div 
                          key={agent.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {agent.bitrix_telemarketing_name || `Agente #${agent.bitrix_telemarketing_id}`}
                              </p>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  {agent.bitrix_telemarketing_id}
                                </span>
                                {agent.chatwoot_agent_email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {agent.chatwoot_agent_email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">Ativo</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Textos Rápidos */}
          <TabsContent value="textos">
            {projectId ? (
              <QuickTextManager projectId={projectId} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Projeto comercial não identificado.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Bot IA */}
          <TabsContent value="bot">
            {projectId ? (
              <BotConfig projectId={projectId} projectName={teamData?.projectName || undefined} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Projeto comercial não identificado. Configure seu acesso corretamente.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Treinamento */}
          <TabsContent value="treinamento">
            {projectId ? (
              <BotTraining projectId={projectId} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Projeto comercial não identificado.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Playground */}
          <TabsContent value="playground">
            {projectId ? (
              <BotPlayground projectId={projectId} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Projeto comercial não identificado.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PortalTelemarketingEquipe;
