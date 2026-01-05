import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, Loader2 } from 'lucide-react';
import { NotificationCenter } from '@/components/telemarketing/NotificationCenter';
import { SUPERVISOR_CARGO } from '@/components/portal-telemarketing/TelemarketingAccessKeyForm';
import { TelemarketingDashboardContent } from '@/components/portal-telemarketing/TelemarketingDashboardContent';
import { ThemeSelector } from '@/components/portal-telemarketing/ThemeSelector';
import { CelebrationOverlay } from '@/components/telemarketing/CelebrationOverlay';
import { supabase } from '@/integrations/supabase/client';
import { TelemarketingNotification } from '@/hooks/useTelemarketingNotifications';
import { useComparecimentosRanking } from '@/hooks/useComparecimentosRanking';

interface TelemarketingContext {
  bitrix_id: number;
  cargo: string;
  name: string;
  commercial_project_id?: string;
}

type StoredTelemarketingOperator = {
  bitrix_id: number;
  cargo: string;
  operator_name: string;
  operator_photo?: string | null;
  commercial_project_id?: string;
};

const PortalTelemarketingDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estado para validação do contexto
  const [isValidatingContext, setIsValidatingContext] = useState(true);
  const [isValidContext, setIsValidContext] = useState<boolean | null>(null);
  
  // Estado para celebração
  const [celebration, setCelebration] = useState({
    open: false,
    clientName: '',
    projectName: ''
  });

  // Inicialização SÍNCRONA - lê do localStorage no primeiro render
  const context = (() => {
    try {
      const savedContext = localStorage.getItem('telemarketing_context');
      if (savedContext) {
        return JSON.parse(savedContext) as TelemarketingContext;
      }

      const savedOperator = localStorage.getItem('telemarketing_operator');
      if (savedOperator) {
        const operator = JSON.parse(savedOperator) as StoredTelemarketingOperator;
        const ctx: TelemarketingContext = {
          bitrix_id: operator.bitrix_id,
          cargo: operator.cargo,
          name: operator.operator_name,
          commercial_project_id: operator.commercial_project_id,
        };
        localStorage.setItem('telemarketing_context', JSON.stringify(ctx));
        return ctx;
      }

      return null;
    } catch {
      localStorage.removeItem('telemarketing_context');
      localStorage.removeItem('telemarketing_operator');
      return null;
    }
  })();

  // Validar que o bitrix_id existe na tabela telemarketing_operators
  useEffect(() => {
    const validateContext = async () => {
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
          console.warn('[Dashboard] Contexto inválido - operador não encontrado:', context.bitrix_id);
          localStorage.removeItem('telemarketing_context');
          localStorage.removeItem('telemarketing_operator');
          setIsValidContext(false);
        } else {
          setIsValidContext(true);
        }
      } catch (e) {
        console.error('[Dashboard] Erro ao validar contexto:', e);
        setIsValidContext(false);
      } finally {
        setIsValidatingContext(false);
      }
    };

    validateContext();
  }, [context?.bitrix_id]);

  // Hook de ranking de comparecimentos
  const { position: comparecimentosPosition, total: totalComparecimentos } = useComparecimentosRanking(
    context?.bitrix_id || null,
    'today'
  );

  // Listener de realtime para celebração
  useEffect(() => {
    if (!context?.bitrix_id || !isValidContext) return;

    const channel = supabase
      .channel(`dashboard-celebration-${context.bitrix_id}`)
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
            console.log('🎉 [Dashboard] Cliente compareceu! Mostrando celebração:', notification);
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

  // Obter foto do operador do localStorage
  const operatorPhoto = (() => {
    try {
      const savedOperator = localStorage.getItem('telemarketing_operator');
      if (savedOperator) {
        const operator = JSON.parse(savedOperator) as StoredTelemarketingOperator;
        return operator.operator_photo || null;
      }
      return null;
    } catch {
      return null;
    }
  })();

  const initials = context.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Handler para clique em notificação
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
    
    // Para outros tipos, navegar para o tabulador com o lead
    if (notification.lead_id) {
      navigate(`/portal-telemarketing/tabulador?lead=${notification.lead_id}&openWhatsApp=true`);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header compacto */}
      <header className="border-b bg-card px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/portal-telemarketing')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          
          {/* Foto retangular 3x4 */}
          <div className="relative w-9 h-12 rounded-md border-2 border-primary/20 shadow overflow-hidden bg-primary/10 flex-shrink-0">
            {operatorPhoto ? (
              <img 
                src={operatorPhoto} 
                alt={context.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{initials}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{context.name || 'Operador'}</span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded">
              {context.cargo === SUPERVISOR_CARGO ? 'Supervisor' : 'Agente'}
            </span>
          </div>
        </div>
        
        {/* Centro: Badge de Comparecimentos */}
        <div className="flex-1 flex justify-center">
          {comparecimentosPosition > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              🎉 {comparecimentosPosition}° em comparecimentos ({totalComparecimentos} clientes)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter 
            bitrixTelemarketingId={context.bitrix_id}
            onNotificationClick={handleNotificationClick}
          />
          <ThemeSelector />
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto">
        <TelemarketingDashboardContent 
          operatorBitrixId={context.bitrix_id}
          operatorCargo={context.cargo}
          commercialProjectId={context.commercial_project_id}
        />
      </div>

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

export default PortalTelemarketingDashboard;
