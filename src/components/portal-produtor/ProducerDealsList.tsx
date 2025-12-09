import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Phone, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Deal {
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
}

interface ProducerDealsListProps {
  deals: Deal[];
  isLoading: boolean;
  producerId: string;
  onRefresh: () => void;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'inicial': { label: 'Inicial', variant: 'secondary' },
  'ficha_preenchida': { label: 'Ficha Preenchida', variant: 'outline' },
  'atendimento_produtor': { label: 'Em Atendimento', variant: 'default' },
  'realizado': { label: 'Realizado', variant: 'default' },
  'nao_realizado': { label: 'Não Realizado', variant: 'destructive' }
};

export const ProducerDealsList = ({ deals, isLoading, producerId, onRefresh }: ProducerDealsListProps) => {
  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  if (isLoading) {
    return (
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
    );
  }

  if (deals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum deal encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Seus Deals ({deals.length})</h2>
      
      <div className="grid gap-4">
        {deals.map((deal) => {
          const statusInfo = STATUS_LABELS[deal.negotiation_status || 'inicial'] || STATUS_LABELS['inicial'];
          
          return (
            <Card key={deal.deal_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-medium line-clamp-2">
                    {deal.title}
                  </CardTitle>
                  <Badge variant={statusInfo.variant} className="shrink-0">
                    {statusInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {deal.client_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="truncate">{deal.client_name}</span>
                    </div>
                  )}
                  
                  {deal.client_phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{deal.client_phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium text-foreground">
                      {formatCurrency(deal.opportunity)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(deal.created_date)}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Deal #{deal.bitrix_deal_id}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
