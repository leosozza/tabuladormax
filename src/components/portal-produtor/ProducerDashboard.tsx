import { ProducerTabLayout } from './ProducerTabLayout';

interface ProducerDashboardProps {
  producerData: {
    id: string;
    name: string;
    photo: string | null;
  };
  onLogout: () => void;
}

export type DealStatusFilter = 'all' | 'pendentes' | 'em_andamento' | 'concluidos';

export const ProducerDashboard = ({
  producerData,
  onLogout
}: ProducerDashboardProps) => {
  return (
    <ProducerTabLayout 
      producerData={producerData} 
      onLogout={onLogout} 
    />
  );
};
