import { useState, useEffect } from 'react';
import { TelemarketingAccessKeyForm, TelemarketingOperatorData } from '@/components/portal-telemarketing/TelemarketingAccessKeyForm';
import { TelemarketingPortalLayout } from '@/components/portal-telemarketing/TelemarketingPortalLayout';

const STORAGE_KEY = 'telemarketing_operator';

const PortalTelemarketing = () => {
  const [operatorData, setOperatorData] = useState<TelemarketingOperatorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Recuperar sessão salva
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOperatorData(parsed);
      } catch (e) {
        console.error('Erro ao recuperar sessão:', e);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const handleAccessGranted = (data: TelemarketingOperatorData) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setOperatorData(data);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('telemarketing_context');
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
