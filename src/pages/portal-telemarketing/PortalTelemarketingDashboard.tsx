import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SUPERVISOR_CARGO } from '@/components/portal-telemarketing/TelemarketingAccessKeyForm';
import { TelemarketingDashboardContent } from '@/components/portal-telemarketing/TelemarketingDashboardContent';

interface TelemarketingContext {
  bitrix_id: number;
  cargo: string;
  name: string;
}

type StoredTelemarketingOperator = {
  bitrix_id: number;
  cargo: string;
  operator_name: string;
  operator_photo?: string | null;
};

const PortalTelemarketingDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  // Se não tem contexto, redireciona para login
  if (!context) {
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header compacto */}
      <header className="border-b bg-card px-4 py-2 flex items-center gap-3 flex-shrink-0">
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
      </header>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto">
        <TelemarketingDashboardContent 
          operatorBitrixId={context.bitrix_id}
          operatorCargo={context.cargo}
        />
      </div>
    </div>
  );
};

export default PortalTelemarketingDashboard;
