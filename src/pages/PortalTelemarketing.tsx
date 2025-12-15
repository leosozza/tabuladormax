import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TelemarketingAccessKeyForm, TelemarketingOperatorData } from '@/components/portal-telemarketing/TelemarketingAccessKeyForm';
import { TelemarketingPortalLayout } from '@/components/portal-telemarketing/TelemarketingPortalLayout';

const STORAGE_KEY = 'telemarketing_operator';
const CONTEXT_KEY = 'telemarketing_context';

const PortalTelemarketing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get('redirect');

  const [operatorData, setOperatorData] = useState<TelemarketingOperatorData | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    try {
      return JSON.parse(saved) as TelemarketingOperatorData;
    } catch (e) {
      console.error('Erro ao recuperar sessão:', e);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CONTEXT_KEY);
      return null;
    }
  });

  // Pós-restauração: garantir contexto e aplicar deep-link
  useEffect(() => {
    if (!operatorData) return;

    try {
      const ctx = localStorage.getItem(CONTEXT_KEY);
      if (!ctx) {
        localStorage.setItem(
          CONTEXT_KEY,
          JSON.stringify({
            bitrix_id: operatorData.bitrix_id,
            cargo: operatorData.cargo,
            name: operatorData.operator_name,
          })
        );
      }
    } catch (e) {
      console.error('Erro ao salvar contexto:', e);
    }

    if (redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [operatorData, redirectTo, navigate]);

  const handleAccessGranted = (data: TelemarketingOperatorData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Salvar contexto também para acesso direto às sub-rotas
    localStorage.setItem(CONTEXT_KEY, JSON.stringify({
      bitrix_id: data.bitrix_id,
      cargo: data.cargo,
      name: data.operator_name,
    }));
    setOperatorData(data);

    // Se veio de um deep-link, seguir automaticamente para a rota desejada
    if (redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONTEXT_KEY);
    setOperatorData(null);
  };


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
