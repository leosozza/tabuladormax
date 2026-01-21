import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TelePodium } from './TelePodium';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

// Cores para as posições (estilos visuais)
const positionStyles = [
  { bg: 'bg-yellow-500', text: 'text-yellow-950', border: 'border-yellow-400' },
  { bg: 'bg-gray-400', text: 'text-gray-950', border: 'border-gray-300' },
  { bg: 'bg-orange-600', text: 'text-orange-50', border: 'border-orange-400' },
  { bg: 'bg-slate-500', text: 'text-slate-50', border: 'border-slate-400' },
  { bg: 'bg-slate-400', text: 'text-slate-900', border: 'border-slate-300' },
];

function getPositionStyle(position: number) {
  const styleIndex = Math.min(position - 1, 4); // Usa estilo do 5º para posições >= 5
  return {
    ...positionStyles[styleIndex],
    label: `${position}º Lugar`
  };
}

interface TopOperatorCardProps {
  operator: OperatorCardData;
  position: number;
  onOperatorClick?: (bitrixId: number) => void;
  isSelected?: boolean;
}

function TopOperatorCard({ operator, position, onOperatorClick, isSelected }: TopOperatorCardProps) {
  const style = getPositionStyle(position);
  
  return (
    <Card 
      className={cn(
        "w-[180px] cursor-pointer transition-all hover:shadow-lg",
        isSelected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"
      )}
      onClick={() => onOperatorClick?.(operator.bitrix_id)}
    >
      <CardContent className="p-3 text-center">
        {/* Badge de Posição */}
        <Badge className={cn("mb-2 text-xs", style.bg, style.text)}>
          {style.label}
        </Badge>
        
        {/* Avatar */}
        <Avatar className={cn("h-16 w-16 mx-auto mb-2 border-3", style.border)}>
          <AvatarImage 
            src={operator.photo_url || undefined} 
            alt={operator.name}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
            {getInitials(operator.name)}
          </AvatarFallback>
        </Avatar>
        
        {/* Nome */}
        <h4 className="font-semibold text-xs mb-2 truncate" title={operator.name}>
          {operator.name}
        </h4>
        
        {/* Métricas em Grid */}
        <div className="space-y-1 text-[10px]">
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

// Carousel de Operadores com navegação por setas - mostra 6 por página
interface OperatorCarouselProps {
  operators: OperatorCardData[];
  onOperatorClick?: (bitrixId: number) => void;
  selectedOperatorId?: number | null;
}

const ITEMS_PER_PAGE = 6;

function OperatorCarousel({ operators, onOperatorClick, selectedOperatorId }: OperatorCarouselProps) {
  const [currentPage, setCurrentPage] = useState(0);

  if (operators.length === 0) return null;

  const totalPages = Math.ceil(operators.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const visibleOperators = operators.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePrevious = () => {
    setCurrentPage((prev) => (prev === 0 ? totalPages - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => (prev === totalPages - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex items-center gap-2">
      {/* Seta Esquerda */}
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-full shrink-0"
        onClick={handlePrevious}
        disabled={totalPages <= 1}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* Grid de Cards */}
      <div className="flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {visibleOperators.map((operator, idx) => {
            const position = startIndex + idx + 1;
            const style = getPositionStyle(position);
            
            return (
              <Card 
                key={operator.bitrix_id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-lg animate-fade-in",
                  selectedOperatorId === operator.bitrix_id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"
                )}
                onClick={() => onOperatorClick?.(operator.bitrix_id)}
              >
                <CardContent className="p-3 text-center">
                  {/* Badge de Posição */}
                  <Badge className={cn("mb-2 text-[10px]", style.bg, style.text)}>
                    {style.label}
                  </Badge>
                  
                  {/* Avatar */}
                  <Avatar className={cn("h-12 w-12 mx-auto mb-2 border-2", style.border)}>
                    <AvatarImage 
                      src={operator.photo_url || undefined} 
                      alt={operator.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {getInitials(operator.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Nome */}
                  <h4 className="font-semibold text-xs mb-2 truncate" title={operator.name}>
                    {operator.name.split(' ')[0]}
                  </h4>
                  
                  {/* Métricas */}
                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TRAB.</span>
                      <span className="font-semibold tabular-nums">{operator.trabalhados}</span>
                    </div>
                    <div className="flex justify-between bg-green-100 dark:bg-green-900/30 rounded px-1 py-0.5">
                      <span className="text-green-700 dark:text-green-300 font-medium">AGEND.</span>
                      <span className="font-bold tabular-nums text-green-700 dark:text-green-300">{operator.agendamentos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">S/INT.</span>
                      <span className="font-semibold tabular-nums text-red-500">{operator.semInteresse}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RET.</span>
                      <span className="font-semibold tabular-nums text-yellow-600">{operator.retorno}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">L.INT.</span>
                      <span className="font-semibold tabular-nums text-orange-500">{operator.ligInterrompida}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CX.P.</span>
                      <span className="font-semibold tabular-nums text-purple-500">{operator.caixaPostal}</span>
                    </div>
                    <div className="flex justify-between pt-0.5 border-t">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">COMP.</span>
                      <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">{operator.comparecimentos}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Indicador de páginas */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1 mt-3">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === currentPage 
                    ? "w-4 bg-primary" 
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                onClick={() => setCurrentPage(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Seta Direita */}
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-full shrink-0"
        onClick={handleNext}
        disabled={totalPages <= 1}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
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

  // Ordenar operadores por agendamentos
  const sortedOperators = [...operators].sort((a, b) => 
    b.agendamentos - a.agendamentos
  );
  

  return (
    <div className="space-y-6">
      {/* Carousel de Operadores com navegação */}
      <OperatorCarousel 
        operators={sortedOperators}
        onOperatorClick={onOperatorClick}
        selectedOperatorId={selectedOperatorId}
      />
    </div>
  );
}
