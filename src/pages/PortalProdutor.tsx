import { useState } from 'react';
import { ProducerAccessKeyForm } from '@/components/portal-produtor/ProducerAccessKeyForm';
import { ProducerDashboard } from '@/components/portal-produtor/ProducerDashboard';

interface ProducerData {
  id: string;
  name: string;
  photo: string | null;
}

const PortalProdutor = () => {
  const [producerData, setProducerData] = useState<ProducerData | null>(null);

  const handleAccessGranted = (data: ProducerData) => {
    setProducerData(data);
  };

  const handleLogout = () => {
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
