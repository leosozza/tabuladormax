import { useState } from 'react';
import { AccessKeyForm } from '@/components/portal-scouter/AccessKeyForm';
import { ScouterDashboard } from '@/components/portal-scouter/ScouterDashboard';

interface ScouterData {
  id: string;
  name: string;
  photo: string | null;
}

const STORAGE_KEY = 'scouter_session';

const PortalScouter = () => {
  const [scouterData, setScouterData] = useState<ScouterData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as ScouterData;
      }
      return null;
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });

  const handleAccessGranted = (data: ScouterData) => {
    // Limpar contextos de outros portais para evitar conflitos de sessão
    localStorage.removeItem('telemarketing_operator');
    localStorage.removeItem('telemarketing_context');
    localStorage.removeItem('produtor_session');
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setScouterData(data);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setScouterData(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {!scouterData ? (
        <AccessKeyForm onAccessGranted={handleAccessGranted} />
      ) : (
        <ScouterDashboard 
          scouterData={scouterData} 
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default PortalScouter;
