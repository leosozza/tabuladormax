import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProducerFilters } from './ProducerFilters';
import { ProducerDealCard } from './ProducerDealCard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export type DealStatusFilter = 'all' | 'pendentes' | 'em_andamento' | 'concluidos';

export interface Deal {
  deal_id: string;
  bitrix_deal_id: number;
  title: string;
  client_name: string | null;
  client_phone: string | null;
  opportunity: number | null;
  stage_id: string | null;
  negotiation_id: string | null;
  negotiation_status: string | null;
  created_date: string | null;
  lead_id: number | null;
  model_name: string | null;
}

interface ProducerDealsTabProps {
  producerId: string;
  onDealSelect: (deal: Deal) => void;
}

export const ProducerDealsTab = ({ producerId, onDealSelect }: ProducerDealsTabProps) => {
  const [statusFilter, setStatusFilter] = useState<DealStatusFilter>('all');

  // Buscar deals do produtor
  const { data: deals = [], isLoading, refetch } = useQuery({
    queryKey: ['producer-deals', producerId, statusFilter],
    queryFn: async () => {
      let statusParam: string | null = null;
      if (statusFilter === 'pendentes') {
        statusParam = 'inicial';
      } else if (statusFilter === 'em_andamento') {
        statusParam = 'atendimento_produtor';
      } else if (statusFilter === 'concluidos') {
        statusParam = 'realizado';
      }

      const { data, error } = await supabase.rpc('get_producer_deals', {
        p_producer_id: producerId,
        p_status: statusParam,
        p_limit: 100
      });
      if (error) throw error;
      return (data || []) as Deal[];
    }
  });

  return (
    <div className="space-y-4">
      {/* Header com refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Seus Deals</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <ProducerFilters 
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Lista de Deals */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : deals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum deal encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deals.map((deal) => (
            <ProducerDealCard 
              key={deal.deal_id} 
              deal={deal} 
              onClick={() => onDealSelect(deal)}
            />
          ))}
        </div>
      )}
    </div>
  );
};