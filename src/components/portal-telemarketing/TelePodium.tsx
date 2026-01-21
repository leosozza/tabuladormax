import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface PodiumOperator {
  bitrix_id: number;
  name: string;
  photo_url?: string | null;
  agendamentos: number;
}

interface TelePodiumProps {
  operators: PodiumOperator[];
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

function getFirstName(name: string): string {
  return name.split(' ')[0];
}

// Configuração de cada posição do pódio
const positionConfig = {
  1: {
    height: 'h-28',
    avatarSize: 'h-16 w-16',
    ringColor: 'ring-yellow-400',
    bgGradient: 'bg-gradient-to-t from-yellow-500 to-yellow-400',
    textColor: 'text-yellow-900',
    order: 'order-2',
  },
  2: {
    height: 'h-22',
    avatarSize: 'h-14 w-14',
    ringColor: 'ring-gray-300',
    bgGradient: 'bg-gradient-to-t from-gray-400 to-gray-300',
    textColor: 'text-gray-900',
    order: 'order-1',
  },
  3: {
    height: 'h-18',
    avatarSize: 'h-12 w-12',
    ringColor: 'ring-orange-400',
    bgGradient: 'bg-gradient-to-t from-orange-500 to-orange-400',
    textColor: 'text-orange-900',
    order: 'order-3',
  },
  4: {
    height: 'h-14',
    avatarSize: 'h-10 w-10',
    ringColor: 'ring-slate-400',
    bgGradient: 'bg-gradient-to-t from-slate-500 to-slate-400',
    textColor: 'text-slate-900',
    order: 'order-4',
  },
  5: {
    height: 'h-12',
    avatarSize: 'h-9 w-9',
    ringColor: 'ring-slate-300',
    bgGradient: 'bg-gradient-to-t from-slate-400 to-slate-300',
    textColor: 'text-slate-800',
    order: 'order-5',
  },
} as const;

interface PodiumPlaceProps {
  operator: PodiumOperator;
  position: 1 | 2 | 3 | 4 | 5;
  onOperatorClick?: (bitrixId: number) => void;
  isSelected?: boolean;
}

function PodiumPlace({ operator, position, onOperatorClick, isSelected }: PodiumPlaceProps) {
  const config = positionConfig[position];

  // Altura customizada para cada posição
  const heights: Record<number, string> = {
    1: 'h-28',
    2: 'h-[88px]',
    3: 'h-[72px]',
    4: 'h-14',
    5: 'h-12',
  };

  return (
    <div 
      className={cn(
        "flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-105",
        position <= 3 ? config.order : '',
        isSelected && "scale-105"
      )}
      onClick={() => onOperatorClick?.(operator.bitrix_id)}
    >
      {/* Avatar */}
      <Avatar 
        className={cn(
          config.avatarSize,
          "ring-2 mb-1 shadow-md",
          config.ringColor,
          isSelected && "ring-primary ring-4"
        )}
      >
        <AvatarImage 
          src={operator.photo_url || undefined} 
          alt={operator.name}
          className="object-cover"
        />
        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
          {getInitials(operator.name)}
        </AvatarFallback>
      </Avatar>

      {/* Nome */}
      <span className="text-xs font-semibold mb-0.5 text-center max-w-[70px] truncate" title={operator.name}>
        {getFirstName(operator.name)}
      </span>

      {/* Agendados */}
      <span className="text-xs font-bold text-green-600 dark:text-green-400 mb-1">
        {operator.agendamentos}
      </span>

      {/* Pedestal */}
      <div 
        className={cn(
          "w-16 rounded-t-lg flex items-end justify-center pb-1",
          heights[position],
          config.bgGradient
        )}
      >
        <span className={cn("text-lg font-bold drop-shadow-sm", config.textColor)}>
          {position}º
        </span>
      </div>
    </div>
  );
}

export function TelePodium({ 
  operators, 
  onOperatorClick,
  selectedOperatorId 
}: TelePodiumProps) {
  if (!operators || operators.length === 0) return null;

  // Pegar top 5
  const top5 = operators.slice(0, 5);
  const [first, second, third, fourth, fifth] = top5;

  return (
    <div className="flex flex-col items-center py-4">
      {/* Título */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="text-base font-bold">Top 5 Agendamentos</h3>
      </div>

      {/* Pódio em linha única - ordem visual: 4º, 2º, 1º, 3º, 5º */}
      <div className="flex items-end justify-center gap-1">
        {fourth && (
          <PodiumPlace 
            operator={fourth} 
            position={4} 
            onOperatorClick={onOperatorClick}
            isSelected={selectedOperatorId === fourth.bitrix_id}
          />
        )}
        {second && (
          <PodiumPlace 
            operator={second} 
            position={2} 
            onOperatorClick={onOperatorClick}
            isSelected={selectedOperatorId === second.bitrix_id}
          />
        )}
        {first && (
          <PodiumPlace 
            operator={first} 
            position={1} 
            onOperatorClick={onOperatorClick}
            isSelected={selectedOperatorId === first.bitrix_id}
          />
        )}
        {third && (
          <PodiumPlace 
            operator={third} 
            position={3} 
            onOperatorClick={onOperatorClick}
            isSelected={selectedOperatorId === third.bitrix_id}
          />
        )}
        {fifth && (
          <PodiumPlace 
            operator={fifth} 
            position={5} 
            onOperatorClick={onOperatorClick}
            isSelected={selectedOperatorId === fifth.bitrix_id}
          />
        )}
      </div>

      {/* Base decorativa */}
      <div className="w-full max-w-[400px] h-1.5 bg-gradient-to-r from-slate-300/50 via-yellow-400/50 to-slate-300/50 rounded-full mt-2" />
    </div>
  );
}
