import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import LeadTab from '@/pages/LeadTab';
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

const PortalTelemarketingTabulador = () => {
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
        // Salvar contexto para próximos acessos
        localStorage.setItem('telemarketing_context', JSON.stringify(ctx));
        return ctx;
      }

      return null;
    } catch (e) {
      console.error('Erro ao recuperar contexto:', e);
      localStorage.removeItem('telemarketing_context');
      localStorage.removeItem('telemarketing_operator');
      return null;
    }
  })();

  // Se não tem contexto, redireciona para login com deep-link
  if (!context) {
    const redirectTarget = `${location.pathname}${location.search}`;
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

      {/* Renderizar LeadTab */}
      <div className="flex-1">
        <LeadTab />
      </div>
    </div>
  );
};

export default PortalTelemarketingTabulador;
