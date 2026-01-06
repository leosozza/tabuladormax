import { Deal } from './ProducerDealsTab';
import { ModelProfileView } from './ModelProfileView';
import { ProducerAgenciarForm } from './ProducerAgenciarForm';

interface DealDetailViewProps {
  deal: Deal;
  onClose: () => void;
  producerId: string;
  activeTab: 'perfil' | 'agenciar';
  openAssistantTrigger?: number;
}

export const DealDetailView = ({
  deal,
  onClose,
  producerId,
  activeTab,
  openAssistantTrigger
}: DealDetailViewProps) => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      {activeTab === 'perfil' && (
        <ModelProfileView leadId={deal.lead_id} bitrixDealId={deal.bitrix_deal_id} />
      )}
      {activeTab === 'agenciar' && (
        <ProducerAgenciarForm 
          deal={deal} 
          producerId={producerId} 
          onSuccess={onClose}
          openAssistantTrigger={openAssistantTrigger}
        />
      )}
    </div>
  );
};
