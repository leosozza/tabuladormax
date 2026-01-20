import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

// Cores e labels para as posições do Top 4
const positionStyles = [
  { bg: 'bg-yellow-500', text: 'text-yellow-950', label: '1º Lugar', border: 'border-yellow-400' },
  { bg: 'bg-gray-400', text: 'text-gray-950', label: '2º Lugar', border: 'border-gray-300' },
  { bg: 'bg-orange-600', text: 'text-orange-50', label: '3º Lugar', border: 'border-orange-400' },
  { bg: 'bg-slate-500', text: 'text-slate-50', label: '4º Lugar', border: 'border-slate-400' },
];

interface TopOperatorCardProps {
  operator: OperatorCardData;
  position: number;
  onOperatorClick?: (bitrixId: number) => void;
  isSelected?: boolean;
}

function TopOperatorCard({ operator, position, onOperatorClick, isSelected }: TopOperatorCardProps) {
  const style = positionStyles[position - 1] || positionStyles[3];
  
  return (
    <Card 
      className={cn(
        "w-[200px] cursor-pointer transition-all hover:shadow-lg",
        isSelected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"
      )}
      onClick={() => onOperatorClick?.(operator.bitrix_id)}
    >
      <CardContent className="p-4 text-center">
        {/* Badge de Posição */}
        <Badge className={cn("mb-3", style.bg, style.text)}>
          {style.label}
        </Badge>
        
        {/* Avatar Grande */}
        <Avatar className={cn("h-24 w-24 mx-auto mb-3 border-4", style.border)}>
          <AvatarImage 
            src={operator.photo_url || undefined} 
            alt={operator.name}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
            {getInitials(operator.name)}
          </AvatarFallback>
        </Avatar>
        
        {/* Nome Completo */}
        <h4 className="font-semibold text-sm mb-3 truncate" title={operator.name}>
          {operator.name}
        </h4>
        
        {/* Métricas em Grid */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">TRABALHADOS</span>
            <span className="font-semibold tabular-nums">{operator.trabalhados}</span>
          </div>
          <div className="flex justify-between bg-green-100 dark:bg-green-900/30 rounded px-1 py-0.5">
            <span className="text-green-700 dark:text-green-300 font-medium">AGENDADO</span>
            <span className="font-bold tabular-nums text-green-700 dark:text-green-300">{operator.agendamentos}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SEM INTERESSE</span>
            <span className="font-semibold tabular-nums text-red-500">{operator.semInteresse}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">RETORNO</span>
            <span className="font-semibold tabular-nums text-yellow-600">{operator.retorno}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">LIG. INTERR.</span>
            <span className="font-semibold tabular-nums text-orange-500">{operator.ligInterrompida}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CX. POSTAL</span>
            <span className="font-semibold tabular-nums text-purple-500">{operator.caixaPostal}</span>
          </div>
          <div className="flex justify-between pt-1 border-t">
            <span className="text-blue-600 dark:text-blue-400 font-medium">COMPARECIDO</span>
            <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">{operator.comparecimentos}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RankingTableProps {
  title: string;
  operators: OperatorCardData[];
  startPosition: number;
  onOperatorClick?: (bitrixId: number) => void;
  selectedOperatorId?: number | null;
}

function RankingTable({ title, operators, startPosition, onOperatorClick, selectedOperatorId }: RankingTableProps) {
  if (operators.length === 0) return null;
  
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">Pos</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead className="text-right w-16">Trab.</TableHead>
              <TableHead className="text-right w-16 text-green-600">Agend.</TableHead>
              <TableHead className="text-right w-16 text-blue-600">Comp.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operators.map((operator, index) => {
              const position = startPosition + index;
              const isSelected = selectedOperatorId === operator.bitrix_id;
              
              return (
                <TableRow 
                  key={operator.bitrix_id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                  )}
                  onClick={() => onOperatorClick?.(operator.bitrix_id)}
                >
                  <TableCell className="text-center font-medium text-muted-foreground">
                    {position}º
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={operator.photo_url || undefined} 
                          alt={operator.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(operator.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm truncate max-w-[120px]" title={operator.name}>
                        {operator.name.split(' ')[0]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {operator.trabalhados}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-green-600 dark:text-green-400">
                    {operator.agendamentos}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
                    {operator.comparecimentos}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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

  // Ordenar operadores por agendamentos (maior métrica de sucesso)
  const sortedOperators = [...operators].sort((a, b) => 
    b.agendamentos - a.agendamentos
  );
  
  // Separar Top 4 e restante
  const top4 = sortedOperators.slice(0, 4);
  const remaining = sortedOperators.slice(4);
  
  // Dividir restante em duas colunas para tabelas
  const midpoint = Math.ceil(remaining.length / 2);
  const leftTable = remaining.slice(0, midpoint);
  const rightTable = remaining.slice(midpoint);

  return (
    <div className="space-y-6">
      {/* Título */}
      <h3 className="text-lg font-semibold text-center">Dashboard de Equipe</h3>
      
      {/* Top 4 em Cards Grandes */}
      <div className="flex justify-center gap-4 flex-wrap">
        {top4.map((operator, index) => (
          <TopOperatorCard 
            key={operator.bitrix_id} 
            operator={operator} 
            position={index + 1}
            onOperatorClick={onOperatorClick}
            isSelected={selectedOperatorId === operator.bitrix_id}
          />
        ))}
      </div>
      
      {/* Tabelas de Ranking */}
      {remaining.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RankingTable 
            title={`Da 5ª a ${4 + leftTable.length}ª posição`}
            operators={leftTable} 
            startPosition={5}
            onOperatorClick={onOperatorClick}
            selectedOperatorId={selectedOperatorId}
          />
          {rightTable.length > 0 && (
            <RankingTable 
              title={`Da ${5 + leftTable.length}ª a ${4 + remaining.length}ª posição`}
              operators={rightTable} 
              startPosition={5 + leftTable.length}
              onOperatorClick={onOperatorClick}
              selectedOperatorId={selectedOperatorId}
            />
          )}
        </div>
      )}
    </div>
  );
}
