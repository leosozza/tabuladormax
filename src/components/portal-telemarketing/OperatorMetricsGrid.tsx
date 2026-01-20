import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface OperatorCardData {
  bitrix_id: number;
  name: string;
  photo_url?: string | null;
  leads: number;           // Carteira Total
  agendamentos: number;    // Agendados
  confirmadas: number;     // Confirmados
  comparecimentos: number; // Comparecidos
}

interface OperatorMetricsGridProps {
  operators: OperatorCardData[];
  onOperatorClick?: (bitrixId: number) => void;
  selectedOperatorId?: number | null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

interface MetricRowProps {
  label: string;
  value: number;
  colorClass: string;
}

function MetricRow({ label, value, colorClass }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", colorClass)}>{value}</span>
    </div>
  );
}

export function OperatorMetricsGrid({ 
  operators, 
  onOperatorClick,
  selectedOperatorId 
}: OperatorMetricsGridProps) {
  if (!operators || operators.length === 0) {
    return null;
  }

  // Calcular Em Espera (leads - agendamentos)
  const operatorsWithEmEspera = operators.map(op => ({
    ...op,
    emEspera: Math.max(0, op.leads - op.agendamentos)
  }));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Equipe</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {operatorsWithEmEspera.map(operator => {
          const isSelected = selectedOperatorId === operator.bitrix_id;
          
          return (
            <Card 
              key={operator.bitrix_id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected 
                  ? "ring-2 ring-primary border-primary" 
                  : "hover:ring-1 hover:ring-primary/50"
              )}
              onClick={() => onOperatorClick?.(operator.bitrix_id)}
            >
              <CardContent className="p-3 text-center">
                {/* Avatar */}
                <Avatar className="h-14 w-14 mx-auto mb-2 border-2 border-muted">
                  <AvatarImage 
                    src={operator.photo_url || undefined} 
                    alt={operator.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(operator.name)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Nome */}
                <h4 className="font-medium text-xs mb-2 truncate" title={operator.name}>
                  {operator.name.split(' ')[0]}
                </h4>
                
                {/* Métricas */}
                <div className="space-y-1">
                  <MetricRow 
                    label="AGENDADO" 
                    value={operator.agendamentos} 
                    colorClass="text-orange-600 dark:text-orange-400" 
                  />
                  <MetricRow 
                    label="CONFIRMADO" 
                    value={operator.confirmadas} 
                    colorClass="text-blue-600 dark:text-blue-400" 
                  />
                  <MetricRow 
                    label="COMPARECIDO" 
                    value={operator.comparecimentos} 
                    colorClass="text-green-600 dark:text-green-400" 
                  />
                  <MetricRow 
                    label="EM ESPERA" 
                    value={operator.emEspera} 
                    colorClass="text-muted-foreground" 
                  />
                  <div className="pt-1 border-t">
                    <MetricRow 
                      label="CARTEIRA" 
                      value={operator.leads} 
                      colorClass="text-purple-600 dark:text-purple-400 font-bold" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
