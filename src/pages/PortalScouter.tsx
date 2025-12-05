import { useState } from 'react';
import { AccessKeyForm } from '@/components/portal-scouter/AccessKeyForm';
import { ScouterDashboard } from '@/components/portal-scouter/ScouterDashboard';

interface ScouterData {
  id: string;
  name: string;
  photo: string | null;
}

const PortalScouter = () => {
  const [scouterData, setScouterData] = useState<ScouterData | null>(null);

  const handleAccessGranted = (data: ScouterData) => {
    setScouterData(data);
  };

  const handleLogout = () => {
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
