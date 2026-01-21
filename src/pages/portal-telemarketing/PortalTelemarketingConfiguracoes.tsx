import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeSelector } from '@/components/portal-telemarketing/ThemeSelector';
import { supabase } from '@/integrations/supabase/client';
import { QuickTextManager } from '@/components/telemarketing/QuickTextManager';
import { BotConfig } from '@/components/whatsapp/BotConfig';
import { BotTraining } from '@/components/whatsapp/BotTraining';
import { BotPlayground } from '@/components/whatsapp/BotPlayground';

interface TelemarketingContext {
  bitrix_id: number;
  cargo: string;
  name: string;
  commercial_project_id?: string;
}

const PortalTelemarketingConfiguracoes = () => {
  const navigate = useNavigate();
  const [context, setContext] = useState<TelemarketingContext | null>(null);
  const [activeTab, setActiveTab] = useState('textos');
  const [isValidating, setIsValidating] = useState(true);

  // Carregar contexto do localStorage
  useEffect(() => {
    const savedContext = localStorage.getItem('telemarketing_context');
    if (savedContext) {
      try {
        const parsed = JSON.parse(savedContext) as TelemarketingContext;
        setContext(parsed);
      } catch (e) {
        console.error('[TM][Configuracoes] Erro ao parsear contexto:', e);
        navigate('/portal-telemarketing');
      }
    } else {
      navigate('/portal-telemarketing');
    }
  }, [navigate]);

  // Validar bitrix_id no banco
  useEffect(() => {
    const validateOperator = async () => {
      if (!context?.bitrix_id) return;

      try {
        const { data, error } = await supabase
          .from('telemarketing_operators')
          .select('id')
          .eq('bitrix_id', context.bitrix_id)
          .eq('status', 'ativo')
          .maybeSingle();

        if (error || !data) {
          console.error('[TM][Configuracoes] Operador inválido:', error);
          localStorage.removeItem('telemarketing_context');
          navigate('/portal-telemarketing');
          return;
        }

        setIsValidating(false);
      } catch (e) {
        console.error('[TM][Configuracoes] Erro na validação:', e);
        navigate('/portal-telemarketing');
      }
    };

    validateOperator();
  }, [context?.bitrix_id, navigate]);

  if (!context || isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const projectId = context.commercial_project_id;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/portal-telemarketing')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Configurações</h1>
        </div>
        <ThemeSelector />
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full mb-6">
            <TabsTrigger value="textos" className="text-xs sm:text-sm">
              Textos Rápidos
            </TabsTrigger>
            <TabsTrigger value="bot" className="text-xs sm:text-sm">
              Bot IA
            </TabsTrigger>
            <TabsTrigger value="treinamento" className="text-xs sm:text-sm">
              Treinamento
            </TabsTrigger>
            <TabsTrigger value="playground" className="text-xs sm:text-sm">
              Playground
            </TabsTrigger>
          </TabsList>

          <TabsContent value="textos">
            {projectId ? (
              <QuickTextManager projectId={projectId} />
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Projeto comercial não configurado
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bot">
            {projectId ? (
              <BotConfig projectId={projectId} />
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Projeto comercial não configurado
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="treinamento">
            {projectId ? (
              <BotTraining projectId={projectId} />
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Projeto comercial não configurado
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="playground">
            {projectId ? (
              <BotPlayground projectId={projectId} />
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Projeto comercial não configurado
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PortalTelemarketingConfiguracoes;
