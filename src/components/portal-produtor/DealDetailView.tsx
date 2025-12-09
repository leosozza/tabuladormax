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
    <div className="space-y-4">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold line-clamp-1">{deal.title}</h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Deal #{deal.bitrix_deal_id} • {deal.client_name || 'Cliente não informado'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'perfil' | 'agenciar')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="perfil" className="gap-2">
            <User className="h-4 w-4" />
            Perfil do Modelo
          </TabsTrigger>
          <TabsTrigger value="agenciar" className="gap-2">
            <Handshake className="h-4 w-4" />
            Agenciar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-4">
          <ModelProfileView leadId={deal.lead_id} />
        </TabsContent>

        <TabsContent value="agenciar" className="mt-4">
          <ProducerAgenciarForm 
            deal={deal} 
            producerId={producerId}
            onSuccess={onClose}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
