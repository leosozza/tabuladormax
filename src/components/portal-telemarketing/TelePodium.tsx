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

// Configuração de cada posição do pódio - tamanhos maiores e proporcionais
const positionConfig = {
  1: {
    height: 'h-28',
    avatarSize: 'h-16 w-16',
    pedestalWidth: 'w-20',
    ringColor: 'ring-yellow-400',
    bgGradient: 'bg-gradient-to-t from-yellow-500 to-yellow-400',
    textColor: 'text-yellow-900',
    fontSize: 'text-xl',
  },
  2: {
    height: 'h-20',
    avatarSize: 'h-14 w-14',
    pedestalWidth: 'w-18',
    ringColor: 'ring-gray-400',
    bgGradient: 'bg-gradient-to-t from-gray-400 to-gray-300',
    textColor: 'text-gray-900',
    fontSize: 'text-lg',
  },
  3: {
    height: 'h-16',
    avatarSize: 'h-14 w-14',
    pedestalWidth: 'w-18',
    ringColor: 'ring-orange-400',
    bgGradient: 'bg-gradient-to-t from-orange-500 to-orange-400',
    textColor: 'text-orange-900',
    fontSize: 'text-lg',
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

  return (
    <div 
      className={cn(
        "flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-105",
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
      <span className="text-sm font-semibold mb-1 text-center max-w-[90px] truncate" title={operator.name}>
        {getFirstName(operator.name)}
      </span>

      {/* Agendados */}
      <span className="text-sm font-bold text-green-600 dark:text-green-400 mb-2">
        {operator.agendamentos}
      </span>

      {/* Pedestal */}
      <div 
        className={cn(
          "w-[72px] rounded-t-lg flex items-end justify-center pb-2",
          config.height,
          config.bgGradient
        )}
      >
        <span className={cn("font-bold drop-shadow-sm", config.fontSize, config.textColor)}>
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

  // Pegar top 3
  const top3 = operators.slice(0, 3);
  const [first, second, third] = top3;

  return (
    <div className="flex flex-col items-center py-4">
      {/* Título */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="text-base font-bold">Top 3 Agendamentos</h3>
      </div>

      {/* Pódio clássico - ordem visual: 2º, 1º, 3º */}
      <div className="flex items-end justify-center gap-4">
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
      </div>

      {/* Base decorativa */}
      <div className="w-full max-w-[320px] h-2 bg-gradient-to-r from-slate-300/50 via-yellow-400/50 to-slate-300/50 rounded-full mt-3" />
    </div>
  );
}
