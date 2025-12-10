import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Handshake } from 'lucide-react';
import { Deal } from './ProducerDealsTab';
import { ModelProfileView } from './ModelProfileView';
import { ProducerAgenciarForm } from './ProducerAgenciarForm';
interface DealDetailViewProps {
  deal: Deal;
  onClose: () => void;
  producerId: string;
}
const STATUS_LABELS: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  'inicial': {
    label: 'Inicial',
    variant: 'secondary'
  },
  'ficha_preenchida': {
    label: 'Ficha Preenchida',
    variant: 'outline'
  },
  'atendimento_produtor': {
    label: 'Em Atendimento',
    variant: 'default'
  },
  'realizado': {
    label: 'Realizado',
    variant: 'default'
  },
  'nao_realizado': {
    label: 'Não Realizado',
    variant: 'destructive'
  }
};
export const DealDetailView = ({
  deal,
  onClose,
  producerId
}: DealDetailViewProps) => {
  const [activeTab, setActiveTab] = useState<'perfil' | 'agenciar'>('perfil');
  const statusInfo = STATUS_LABELS[deal.negotiation_status || 'inicial'] || STATUS_LABELS['inicial'];
  return <div className="flex flex-col min-h-[calc(100vh-200px)]">
      {/* Tabs maiores para mobile */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'perfil' | 'agenciar')} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 mt-3">
          <TabsTrigger value="perfil" className="h-12 text-sm font-medium gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="agenciar" className="h-12 text-sm font-medium gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Handshake className="h-4 w-4" />
            Agenciar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="flex-1 mt-4">
          <ModelProfileView leadId={deal.lead_id} bitrixDealId={deal.bitrix_deal_id} />
        </TabsContent>

        <TabsContent value="agenciar" className="flex-1 mt-4">
          <ProducerAgenciarForm deal={deal} producerId={producerId} onSuccess={onClose} />
        </TabsContent>
      </Tabs>
    </div>;
};