import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Phone, DollarSign, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Deal } from './ProducerDealsTab';

interface ProducerDealCardProps {
  deal: Deal;
  onClick: () => void;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'inicial': { label: 'Inicial', variant: 'secondary' },
  'ficha_preenchida': { label: 'Ficha Preenchida', variant: 'outline' },
  'atendimento_produtor': { label: 'Em Atendimento', variant: 'default' },
  'realizado': { label: 'Realizado', variant: 'default' },
  'nao_realizado': { label: 'Não Realizado', variant: 'destructive' }
};

export const ProducerDealCard = ({ deal, onClick }: ProducerDealCardProps) => {
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

  const statusInfo = STATUS_LABELS[deal.negotiation_status || 'inicial'] || STATUS_LABELS['inicial'];

  return (
    <Card 
      className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-primary/50 hover:border-l-primary"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium line-clamp-2">
              {deal.model_name || deal.title}
            </CardTitle>
            {deal.lead_id && (
              <span className="text-xs text-muted-foreground">
                Lead #{deal.lead_id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusInfo.variant}>
              {statusInfo.label}
            </Badge>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
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
          <Button variant="ghost" size="sm" className="text-primary">
            Abrir Deal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
