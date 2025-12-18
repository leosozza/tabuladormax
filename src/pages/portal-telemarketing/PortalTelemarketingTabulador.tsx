import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import LeadTab from '@/pages/LeadTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Headset, Settings } from 'lucide-react';
import { ScriptViewer } from '@/components/telemarketing/ScriptViewer';
import { ScriptManager } from '@/components/telemarketing/ScriptManager';
import { NotificationCenter } from '@/components/telemarketing/NotificationCenter';
import { NotificationSettings } from '@/components/telemarketing/NotificationSettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeNotifications, useBrowserNotification } from '@/hooks/useTelemarketingNotifications';
import { useOperatorRanking } from '@/hooks/useOperatorRanking';
import UserMenu from '@/components/UserMenu';
import { SUPERVISOR_CARGO } from '@/components/portal-telemarketing/TelemarketingAccessKeyForm';
import { ThemeSelector } from '@/components/portal-telemarketing/ThemeSelector';
import MaxTalkWidget from '@/components/maxtalk/MaxTalkWidget';

interface TelemarketingContext {
  bitrix_id: number;
  cargo: string;
  name: string;
}

type StoredTelemarketingOperator = {
  bitrix_id: number;
  cargo: string;
  operator_name: string;
};

const PortalTelemarketingTabulador = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [projectId, setProjectId] = useState<string | null>(null);

  // Inicialização SÍNCRONA - lê do localStorage no primeiro render
  const context = (() => {
    const prefix = '[TM][Tabulador]';
    console.groupCollapsed(`${prefix} init`, {
      path: location.pathname,
      search: location.search,
      href: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });

    let result: TelemarketingContext | null = null;

    try {
      const keys = Object.keys(localStorage);
      console.log(`${prefix} localStorage keys`, keys);

      const savedContext = localStorage.getItem('telemarketing_context');
      console.log(`${prefix} telemarketing_context raw`, savedContext);

      if (savedContext) {
        result = JSON.parse(savedContext) as TelemarketingContext;
        console.log(`${prefix} telemarketing_context parsed`, result);
        return result;
      }

      const savedOperator = localStorage.getItem('telemarketing_operator');
      console.log(`${prefix} telemarketing_operator raw`, savedOperator);

      if (savedOperator) {
        const operator = JSON.parse(savedOperator) as StoredTelemarketingOperator;
        console.log(`${prefix} telemarketing_operator parsed`, operator);

        const ctx: TelemarketingContext = {
          bitrix_id: operator.bitrix_id,
          cargo: operator.cargo,
          name: operator.operator_name,
        };

        // Salvar contexto para próximos acessos
        localStorage.setItem('telemarketing_context', JSON.stringify(ctx));
        console.log(`${prefix} context persisted`, ctx);

        result = ctx;
        return result;
      }

      console.warn(`${prefix} no session data found`);
      result = null;
      return result;
    } catch (e) {
      console.error(`${prefix} error reading session`, e);
      try {
        localStorage.removeItem('telemarketing_context');
        localStorage.removeItem('telemarketing_operator');
        console.warn(`${prefix} cleared corrupted localStorage keys`);
      } catch (clearErr) {
        console.error(`${prefix} error clearing localStorage`, clearErr);
      }
      result = null;
      return result;
    } finally {
      console.log(`${prefix} final context`, result);
      console.groupEnd();
    }
  })();

  // Hook de ranking
  const { position: rankingPosition, total: totalAgendados } = useOperatorRanking(context?.bitrix_id || null);

  // Ativar notificações em tempo real
  useRealtimeNotifications(context?.bitrix_id || null);

  // Solicitar permissão para notificações do navegador
  const { requestPermission, permission } = useBrowserNotification();
  
  useEffect(() => {
    if (context?.bitrix_id && permission === 'default') {
      // Solicitar permissão após 2 segundos
      const timer = setTimeout(() => {
        requestPermission();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [context?.bitrix_id, permission, requestPermission]);

  // Fetch commercial_project_id for the operator
  useEffect(() => {
    if (!context?.bitrix_id) return;
    
    const fetchProjectId = async () => {
      const { data } = await supabase
        .from('agent_telemarketing_mapping')
        .select('commercial_project_id')
        .eq('bitrix_telemarketing_id', context.bitrix_id)
        .maybeSingle();
      
      if (data?.commercial_project_id) {
        setProjectId(data.commercial_project_id);
      }
    };
    
    fetchProjectId();
  }, [context?.bitrix_id]);

  // Verificar se há lead_id na URL - se sim, permitir acesso público
  const searchParams = new URLSearchParams(location.search);
  const leadIdFromUrl = searchParams.get('lead') || searchParams.get('id');

  // Se não tem contexto E não tem lead na URL, redirecionar para login
  if (!context && !leadIdFromUrl) {
    const redirectTarget = `${location.pathname}${location.search}`;
    console.warn('[TM][Tabulador] redirecting to login', { redirectTarget });
    return <Navigate to={`/portal-telemarketing?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  const isSupervisor = context?.cargo === SUPERVISOR_CARGO;

  const handleNotificationClick = (notification: any) => {
    // Navegar para o lead/conversa quando clicar na notificação
    if (notification.lead_id) {
      navigate(`/portal-telemarketing/tabulador?lead=${notification.lead_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header unificado em uma única linha */}
      {context && (
        <header className="sticky top-0 z-50 border-b bg-card px-4 py-2 flex items-center gap-3">
          {/* Voltar */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/portal-telemarketing')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          
          {/* Nome e Cargo */}
          <div className="flex items-center gap-2 text-sm">
            <Headset className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{context.name || 'Operador'}</span>
            <Badge variant="outline" className="text-xs">
              {context.cargo === SUPERVISOR_CARGO ? 'Supervisor' : 'Agente'}
            </Badge>
          </div>
          
          {/* Centro: Badge de Ranking */}
          <div className="flex-1 flex justify-center">
            {rankingPosition > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                🏆 {rankingPosition}° colocado ({totalAgendados} agendados)
              </Badge>
            )}
          </div>
          
          {/* Direita: Tema, Notificações, Script, UserMenu */}
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <NotificationCenter 
              bitrixTelemarketingId={context.bitrix_id}
              onNotificationClick={handleNotificationClick}
            />
            <NotificationSettings />
            <ScriptViewer projectId={projectId} />
            
            {isSupervisor && projectId && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Gerenciar Scripts
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Gerenciar Scripts de Atendimento</DialogTitle>
                  </DialogHeader>
                  <ScriptManager projectId={projectId} />
                </DialogContent>
              </Dialog>
            )}
            
            <UserMenu showNameAndRole={false} />
          </div>
        </header>
      )}

      {/* Renderizar LeadTab */}
      <div className="flex-1">
        <LeadTab />
      </div>

      {/* Widget MaxTalk */}
      <MaxTalkWidget />
    </div>
  );
};

export default PortalTelemarketingTabulador;
