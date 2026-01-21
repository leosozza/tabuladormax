import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { TelePodium } from './TelePodium';
import { Star } from 'lucide-react';

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

// Card especial para 4º lugar (menção honrosa)
interface HonorableMentionProps {
  operator: OperatorCardData;
  onOperatorClick?: (bitrixId: number) => void;
  isSelected?: boolean;
}

function HonorableMention({ operator, onOperatorClick, isSelected }: HonorableMentionProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-dashed border-2",
        isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
      )}
      onClick={() => onOperatorClick?.(operator.bitrix_id)}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="relative">
          <Avatar className="h-14 w-14 ring-2 ring-slate-400">
            <AvatarImage 
              src={operator.photo_url || undefined} 
              alt={operator.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {getInitials(operator.name)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -top-1 -right-1 bg-slate-500 rounded-full p-1">
            <Star className="h-3 w-3 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">4º Lugar</Badge>
            <span className="text-sm font-semibold truncate">{operator.name}</span>
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-muted-foreground">
              Trabalhados: <span className="font-semibold text-foreground">{operator.trabalhados}</span>
            </span>
            <span className="text-green-600 dark:text-green-400 font-semibold">
              {operator.agendamentos} agendados
            </span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {operator.comparecimentos} comparecimentos
            </span>
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
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 bg-muted/30">
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
  
  // Separar Top 3 para pódio, 4º para menção honrosa, e restante para tabelas
  const [first, second, third, fourth, ...remaining] = sortedOperators;
  
  // Dividir restante em duas colunas para tabelas
  const midpoint = Math.ceil(remaining.length / 2);
  const leftTable = remaining.slice(0, midpoint);
  const rightTable = remaining.slice(midpoint);

  return (
    <div className="space-y-6">
      {/* Pódio Visual para Top 3 */}
      <TelePodium 
        first={first}
        second={second}
        third={third}
        onOperatorClick={onOperatorClick}
        selectedOperatorId={selectedOperatorId}
      />
      
      {/* Menção Honrosa - 4º Lugar */}
      {fourth && (
        <div className="max-w-2xl mx-auto">
          <HonorableMention 
            operator={fourth}
            onOperatorClick={onOperatorClick}
            isSelected={selectedOperatorId === fourth.bitrix_id}
          />
        </div>
      )}
      
      {/* Tabelas de Ranking */}
      {remaining.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RankingTable 
            title={`5º - ${4 + leftTable.length}º posição`}
            operators={leftTable} 
            startPosition={5}
            onOperatorClick={onOperatorClick}
            selectedOperatorId={selectedOperatorId}
          />
          {rightTable.length > 0 && (
            <RankingTable 
              title={`${5 + leftTable.length}º - ${4 + remaining.length}º posição`}
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
