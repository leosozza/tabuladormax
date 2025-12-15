import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Headset } from 'lucide-react';

interface TelemarketingContext {
  bitrix_id: number;
  cargo: string;
  name: string;
}

const PortalTelemarketingDashboard = () => {
  const navigate = useNavigate();
  const [context, setContext] = useState<TelemarketingContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Validar sessão do telemarketing
    const savedContext = sessionStorage.getItem('telemarketing_context');
    const savedOperator = sessionStorage.getItem('telemarketing_operator');
    
    if (!savedContext && !savedOperator) {
      // Sem sessão válida, redirecionar para login
      navigate('/portal-telemarketing');
      return;
    }

    try {
      const parsed = savedContext ? JSON.parse(savedContext) : null;
      setContext(parsed);
    } catch (e) {
      console.error('Erro ao recuperar contexto:', e);
      navigate('/portal-telemarketing');
      return;
    }
    
    setIsLoading(false);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
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
          <span>{context?.name || 'Operador'}</span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded">
            {context?.cargo === 'supervisor' ? 'Supervisor' : 'Agente'}
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
