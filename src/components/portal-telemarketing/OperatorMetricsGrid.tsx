import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface OperatorCardData {
  bitrix_id: number;
  name: string;
  photo_url?: string | null;
  
  // Métricas contextuais
  trabalhados: number;      // Meta + Scouter (total trabalhado)
  agendamentos: number;     // Agendados (destaque)
  semInteresse: number;     // Código 3622
  retorno: number;          // Código 3626
  ligInterrompida: number;  // Código 3616
  caixaPostal: number;      // Código 3618
  comparecimentos: number;  // Compareceu = true
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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Equipe</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {operators.map(operator => {
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
                
                {/* Métricas Contextuais */}
                <div className="space-y-1">
                  {/* Trabalhados (Meta + Scouter) */}
                  <MetricRow 
                    label="TRABALHADOS" 
                    value={operator.trabalhados} 
                    colorClass="text-muted-foreground" 
                  />
                  
                  {/* AGENDADO em destaque */}
                  <div className="bg-green-100 dark:bg-green-900/30 rounded py-1 px-1 my-1">
                    <MetricRow 
                      label="AGENDADO" 
                      value={operator.agendamentos} 
                      colorClass="text-green-700 dark:text-green-300 font-bold" 
                    />
                  </div>
                  
                  <MetricRow 
                    label="SEM INTERESSE" 
                    value={operator.semInteresse} 
                    colorClass="text-red-500 dark:text-red-400" 
                  />
                  <MetricRow 
                    label="RETORNO" 
                    value={operator.retorno} 
                    colorClass="text-yellow-600 dark:text-yellow-400" 
                  />
                  <MetricRow 
                    label="LIG. INTERROMPIDA" 
                    value={operator.ligInterrompida} 
                    colorClass="text-orange-500 dark:text-orange-400" 
                  />
                  <MetricRow 
                    label="CAIXA POSTAL" 
                    value={operator.caixaPostal} 
                    colorClass="text-purple-500 dark:text-purple-400" 
                  />
                  
                  {/* Comparecido */}
                  <div className="pt-1 border-t">
                    <MetricRow 
                      label="COMPARECIDO" 
                      value={operator.comparecimentos} 
                      colorClass="text-blue-600 dark:text-blue-400 font-bold" 
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
