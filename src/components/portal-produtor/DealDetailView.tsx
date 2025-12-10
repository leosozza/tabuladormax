import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Handshake } from 'lucide-react';
import { Deal } from './ProducerDealsTab';
import { ModelProfileView } from './ModelProfileView';
import { ProducerAgenciarForm } from './ProducerAgenciarForm';

interface DealDetailViewProps {
  deal: Deal;
  onClose: () => void;
  producerId: string;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'inicial': { label: 'Inicial', variant: 'secondary' },
  'ficha_preenchida': { label: 'Ficha Preenchida', variant: 'outline' },
  'atendimento_produtor': { label: 'Em Atendimento', variant: 'default' },
  'realizado': { label: 'Realizado', variant: 'default' },
  'nao_realizado': { label: 'Não Realizado', variant: 'destructive' }
};

export const DealDetailView = ({ deal, onClose, producerId }: DealDetailViewProps) => {
  const [activeTab, setActiveTab] = useState<'perfil' | 'agenciar'>('perfil');
  const statusInfo = STATUS_LABELS[deal.negotiation_status || 'inicial'] || STATUS_LABELS['inicial'];

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      {/* Header compacto */}
      <div className="flex items-center gap-3 py-3 border-b bg-background sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="h-10 w-10 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-semibold truncate">{deal.title}</h1>
            <Badge variant={statusInfo.variant} className="text-[10px] h-5">
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            #{deal.bitrix_deal_id} • {deal.client_name || 'Cliente'}
          </p>
        </div>
      </div>

      {/* Tabs maiores para mobile */}
      <Tabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as 'perfil' | 'agenciar')} 
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 mt-3">
          <TabsTrigger 
            value="perfil" 
            className="h-12 text-sm font-medium gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger 
            value="agenciar" 
            className="h-12 text-sm font-medium gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Handshake className="h-4 w-4" />
            Agenciar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="flex-1 mt-4 pb-20">
          <ModelProfileView 
            leadId={deal.lead_id} 
            bitrixDealId={deal.bitrix_deal_id}
          />
        </TabsContent>

        <TabsContent value="agenciar" className="flex-1 mt-4 pb-20">
          <ProducerAgenciarForm 
            deal={deal} 
            producerId={producerId}
            onSuccess={onClose}
          />
        </TabsContent>
      </Tabs>

      {/* Bottom Action Bar - Fixed */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-20">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={onClose}
          >
            Voltar
          </Button>
          <Button
            className="flex-1 h-12 bg-primary hover:bg-primary/90 gap-2"
            onClick={() => setActiveTab('agenciar')}
          >
            <Handshake className="h-4 w-4" />
            Agenciar
          </Button>
        </div>
      </div>
    </div>
  );
};
