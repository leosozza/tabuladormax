import { useState } from 'react';
import { ProducerAccessKeyForm } from '@/components/portal-produtor/ProducerAccessKeyForm';
import { ProducerDashboard } from '@/components/portal-produtor/ProducerDashboard';

interface ProducerData {
  id: string;
  name: string;
  photo: string | null;
}

const STORAGE_KEY = 'producer_session';

const PortalProdutor = () => {
  const [producerData, setProducerData] = useState<ProducerData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as ProducerData;
      }
      return null;
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });

  const handleAccessGranted = (data: ProducerData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setProducerData(data);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProducerData(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {!producerData ? (
        <ProducerAccessKeyForm onAccessGranted={handleAccessGranted} />
      ) : (
        <ProducerDashboard 
          producerData={producerData} 
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default PortalProdutor;
