import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Headset } from 'lucide-react';

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

const PortalTelemarketingDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Inicialização SÍNCRONA - lê do localStorage no primeiro render
  const context = (() => {
    const prefix = '[TM][Dashboard]';
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

  // Se não tem contexto, redireciona para login com deep-link
  if (!context) {
    const redirectTarget = `${location.pathname}${location.search}`;
    console.warn('[TM][Dashboard] redirecting to login', { redirectTarget });
    return <Navigate to={`/portal-telemarketing?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header compacto */}
      <header className="border-b bg-card px-4 py-2 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/portal-telemarketing')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Headset className="w-4 h-4" />
          <span>{context.name || 'Operador'}</span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded">
            {context.cargo === 'supervisor' ? 'Supervisor' : 'Agente'}
          </span>
        </div>
      </header>

      {/* Renderizar Dashboard */}
      <div className="flex-1">
        <Dashboard />
      </div>
    </div>
  );
};

export default PortalTelemarketingDashboard;
