import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import LeadTab from '@/pages/LeadTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Headset, Settings, Loader2, HeartPulse, Trash2, RefreshCcw } from 'lucide-react';
import { ScriptViewer } from '@/components/telemarketing/ScriptViewer';
import { ScriptManager } from '@/components/telemarketing/ScriptManager';
import { NotificationCenter } from '@/components/telemarketing/NotificationCenter';
import { NotificationSettings } from '@/components/telemarketing/NotificationSettings';
import { CelebrationOverlay } from '@/components/telemarketing/CelebrationOverlay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeNotifications, useBrowserNotification, TelemarketingNotification } from '@/hooks/useTelemarketingNotifications';
import { useOperatorRanking } from '@/hooks/useOperatorRanking';
import { useComparecimentosRanking } from '@/hooks/useComparecimentosRanking';
import { useTelemarketingHeartbeat } from '@/hooks/useTelemarketingHeartbeat';
import UserMenu from '@/components/UserMenu';
import { isSupervisorCargo } from '@/components/portal-telemarketing/TelemarketingAccessKeyForm';
import { ThemeSelector } from '@/components/portal-telemarketing/ThemeSelector';
import MaxTalkWidget from '@/components/maxtalk/MaxTalkWidget';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isValidatingContext, setIsValidatingContext] = useState(true);
  const [isValidContext, setIsValidContext] = useState<boolean | null>(null);
  
  // Estado para celebração
  const [celebration, setCelebration] = useState({
    open: false,
    clientName: '',
    projectName: ''
  });

  // Verificar se há lead_id na URL - se sim, permitir acesso público sem validação
  const searchParams = new URLSearchParams(location.search);
  const leadIdFromUrl = searchParams.get('lead') || searchParams.get('id');

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

  // Validar que o bitrix_id existe na tabela telemarketing_operators
  useEffect(() => {
    const validateContext = async () => {
      // Se tem lead na URL, permite acesso público sem validação
      if (leadIdFromUrl) {
        setIsValidatingContext(false);
        setIsValidContext(true); // Permite acesso mesmo sem contexto válido
        return;
      }

      if (!context) {
        setIsValidContext(false);
        setIsValidatingContext(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('telemarketing_operators')
          .select('bitrix_id')
          .eq('bitrix_id', context.bitrix_id)
          .maybeSingle();

        if (error || !data) {
          console.warn('[Tabulador] Contexto inválido - operador não encontrado:', context.bitrix_id);
          localStorage.removeItem('telemarketing_context');
          localStorage.removeItem('telemarketing_operator');
          setIsValidContext(false);
        } else {
          setIsValidContext(true);
        }
      } catch (e) {
        console.error('[Tabulador] Erro ao validar contexto:', e);
        setIsValidContext(false);
      } finally {
        setIsValidatingContext(false);
      }
    };

    validateContext();
  }, [context?.bitrix_id, leadIdFromUrl]);

  // Hooks de ranking
  const { position: rankingPosition, total: totalAgendados } = useOperatorRanking(context?.bitrix_id || null);
  const { position: comparecimentosPosition, total: totalComparecimentos } = useComparecimentosRanking(context?.bitrix_id || null, 'today');

  // Heartbeat para rastrear telemarketing online
  useTelemarketingHeartbeat(context?.bitrix_id || null);

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

  // Listener separado para celebração de cliente compareceu
  useEffect(() => {
    if (!context?.bitrix_id || !isValidContext) return;

    const channel = supabase
      .channel(`celebration-${context.bitrix_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemarketing_notifications',
          filter: `bitrix_telemarketing_id=eq.${context.bitrix_id}`,
        },
        (payload) => {
          const notification = payload.new as TelemarketingNotification;
          
          // Se for notificação de cliente compareceu, mostrar celebração
          if (notification.type === 'cliente_compareceu') {
            console.log('🎉 Cliente compareceu! Mostrando celebração:', notification);
            setCelebration({
              open: true,
              clientName: (notification.metadata?.nome_modelo as string) || 'Cliente',
              projectName: (notification.metadata?.projeto as string) || ''
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [context?.bitrix_id, isValidContext]);

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

  // Mostrar loading enquanto valida (apenas se não tem lead na URL)
  if (isValidatingContext && !leadIdFromUrl) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validando sessão...</p>
        </div>
      </div>
    );
  }

  // Se não tem contexto E não tem lead na URL E contexto é inválido, redirecionar para login
  if (!context && !leadIdFromUrl) {
    const redirectTarget = `${location.pathname}${location.search}`;
    console.warn('[TM][Tabulador] redirecting to login', { redirectTarget });
    return <Navigate to={`/portal-telemarketing?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  // Se tem contexto mas é inválido e não tem lead na URL
  if (context && isValidContext === false && !leadIdFromUrl) {
    const redirectTarget = `${location.pathname}${location.search}`;
    console.warn('[TM][Tabulador] invalid context, redirecting to login', { redirectTarget });
    return <Navigate to={`/portal-telemarketing?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  const isSupervisor = context?.cargo ? isSupervisorCargo(context.cargo) : false;

  const handleClearCache = async () => {
    try {
      // 1. Limpar cache do React Query
      queryClient.clear();
      
      // 2. Limpar localStorage relacionado a cache (preservar sessão)
      const keysToKeep = ['telemarketing_context', 'telemarketing_operator', 'theme'];
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.some(k => key.includes(k))) {
          localStorage.removeItem(key);
        }
      });
      
      // 3. Limpar sessionStorage
      sessionStorage.clear();
      
      toast.success("Cache limpo com sucesso!");
      
      // 4. Recarregar a página após 500ms
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      toast.error("Erro ao limpar cache");
    }
  };

  const handleCheckSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        toast.error(`Erro ao verificar sessão: ${error.message}`);
        return;
      }
      
      if (session) {
        const expiresAt = session.expires_at ? new Date(session.expires_at * 1000).toLocaleString('pt-BR') : 'N/A';
        toast.success(`Sessão ativa: ${session.user.email}`, {
          description: `Expira em: ${expiresAt}`
        });
      } else {
        toast.warning('Sem sessão ativa no banco de dados. Alguns recursos podem não funcionar.');
      }
    } catch (e) {
      console.error('[Tabulador] Erro ao verificar sessão:', e);
      toast.error('Erro ao verificar sessão');
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Se for notificação de cliente compareceu, mostrar celebração
    if (notification.type === 'cliente_compareceu') {
      setCelebration({
        open: true,
        clientName: notification.metadata?.nome_modelo || 'Cliente',
        projectName: notification.metadata?.projeto || ''
      });
      return;
    }
    
    // Para outros tipos, navegar para o lead/conversa
    if (notification.lead_id) {
      navigate(`/portal-telemarketing/tabulador?lead=${notification.lead_id}&openWhatsApp=true`);
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
              {isSupervisorCargo(context.cargo) ? 'Supervisor' : 'Agente'}
            </Badge>
          </div>
          
          {/* Centro: Badges de Ranking */}
          <div className="flex-1 flex justify-center gap-2">
            {rankingPosition > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                🏆 {rankingPosition}° ({totalAgendados} agendados)
              </Badge>
            )}
            {comparecimentosPosition > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                🎉 {comparecimentosPosition}° ({totalComparecimentos} comparecidos)
              </Badge>
            )}
          </div>
          
          {/* Direita: Sistema, Tema, Notificações, Script, UserMenu */}
          <div className="flex items-center gap-2">
            {/* Botão Saúde do Sistema */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <HeartPulse className="w-4 h-4" />
                  <span className="hidden md:inline">Sistema</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Saúde do Sistema</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClearCache}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Cache e Recarregar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.reload()}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Apenas Recarregar Página
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCheckSession}>
                  <HeartPulse className="w-4 h-4 mr-2" />
                  Verificar Sessão BD
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
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

      {/* Overlay de Celebração */}
      <CelebrationOverlay
        open={celebration.open}
        onClose={() => setCelebration(prev => ({ ...prev, open: false }))}
        clientName={celebration.clientName}
        projectName={celebration.projectName}
      />
    </div>
  );
};

export default PortalTelemarketingTabulador;
