import { useState, useEffect } from 'react';
import { TelemarketingAccessKeyForm, TelemarketingOperatorData } from '@/components/portal-telemarketing/TelemarketingAccessKeyForm';
import { TelemarketingPortalLayout } from '@/components/portal-telemarketing/TelemarketingPortalLayout';

const STORAGE_KEY = 'telemarketing_operator';
const CONTEXT_KEY = 'telemarketing_context';

const PortalTelemarketing = () => {
  const [operatorData, setOperatorData] = useState<TelemarketingOperatorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Recuperar sessão salva (localStorage persiste após fechar navegador)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOperatorData(parsed);
      } catch (e) {
        console.error('Erro ao recuperar sessão:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const handleAccessGranted = (data: TelemarketingOperatorData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Salvar contexto também para acesso direto às sub-rotas
    localStorage.setItem(CONTEXT_KEY, JSON.stringify({
      bitrix_id: data.bitrix_id,
      cargo: data.cargo,
      name: data.operator_name
    }));
    setOperatorData(data);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONTEXT_KEY);
    setOperatorData(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!operatorData ? (
        <TelemarketingAccessKeyForm onAccessGranted={handleAccessGranted} />
      ) : (
        <TelemarketingPortalLayout 
          operatorData={operatorData} 
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default PortalTelemarketing;
