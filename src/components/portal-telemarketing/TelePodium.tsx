import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Trophy, Medal, Award } from 'lucide-react';

interface PodiumOperator {
  bitrix_id: number;
  name: string;
  photo_url?: string | null;
  agendamentos: number;
  comparecimentos: number;
}

interface TelePodiumProps {
  first?: PodiumOperator;
  second?: PodiumOperator;
  third?: PodiumOperator;
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

interface PodiumPlaceProps {
  operator?: PodiumOperator;
  position: 1 | 2 | 3;
  onOperatorClick?: (bitrixId: number) => void;
  isSelected?: boolean;
}

function PodiumPlace({ operator, position, onOperatorClick, isSelected }: PodiumPlaceProps) {
  if (!operator) return null;

  const positionConfig = {
    1: {
      height: 'h-32',
      avatarSize: 'h-20 w-20',
      ringColor: 'ring-yellow-400',
      bgGradient: 'bg-gradient-to-t from-yellow-500/80 to-yellow-400/60',
      glowColor: 'shadow-yellow-400/50',
      icon: Trophy,
      iconColor: 'text-yellow-400',
      label: '1º',
      order: 'order-2',
      animationDelay: 'animation-delay-100',
      zIndex: 'z-20',
    },
    2: {
      height: 'h-24',
      avatarSize: 'h-16 w-16',
      ringColor: 'ring-gray-300',
      bgGradient: 'bg-gradient-to-t from-gray-400/80 to-gray-300/60',
      glowColor: 'shadow-gray-300/30',
      icon: Medal,
      iconColor: 'text-gray-300',
      label: '2º',
      order: 'order-1',
      animationDelay: 'animation-delay-200',
      zIndex: 'z-10',
    },
    3: {
      height: 'h-20',
      avatarSize: 'h-14 w-14',
      ringColor: 'ring-orange-400',
      bgGradient: 'bg-gradient-to-t from-orange-600/80 to-orange-500/60',
      glowColor: 'shadow-orange-400/30',
      icon: Award,
      iconColor: 'text-orange-400',
      label: '3º',
      order: 'order-3',
      animationDelay: 'animation-delay-300',
      zIndex: 'z-10',
    },
  };

  const config = positionConfig[position];
  const IconComponent = config.icon;

  return (
    <div 
      className={cn(
        "flex flex-col items-center cursor-pointer transition-all duration-300",
        config.order,
        config.zIndex,
        isSelected && "scale-105"
      )}
      onClick={() => onOperatorClick?.(operator.bitrix_id)}
    >
      {/* Avatar com ícone de posição */}
      <div className="relative mb-2">
        <Avatar 
          className={cn(
            config.avatarSize,
            "ring-4 transition-all duration-300",
            config.ringColor,
            position === 1 && "shadow-lg animate-pulse",
            config.glowColor,
            isSelected && "ring-primary"
          )}
        >
          <AvatarImage 
            src={operator.photo_url || undefined} 
            alt={operator.name}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {getInitials(operator.name)}
          </AvatarFallback>
        </Avatar>
        
        {/* Ícone de posição */}
        <div 
          className={cn(
            "absolute -top-2 -right-2 rounded-full p-1.5 shadow-lg",
            position === 1 ? "bg-yellow-500" : position === 2 ? "bg-gray-400" : "bg-orange-500"
          )}
        >
          <IconComponent className={cn("h-3.5 w-3.5", position === 1 ? "text-yellow-900" : "text-white")} />
        </div>
      </div>

      {/* Nome do operador */}
      <span className="text-sm font-semibold mb-1 text-center max-w-[80px] truncate" title={operator.name}>
        {getFirstName(operator.name)}
      </span>

      {/* Métricas */}
      <div className="flex items-center gap-2 text-xs mb-2">
        <span className="text-green-500 font-bold">{operator.agendamentos} ag</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-blue-500 font-semibold">{operator.comparecimentos} cp</span>
      </div>

      {/* Pedestal */}
      <div 
        className={cn(
          "w-24 rounded-t-lg flex items-end justify-center pb-2 transition-all",
          config.height,
          config.bgGradient,
          position === 1 && "shadow-lg"
        )}
      >
        <span className="text-2xl font-bold text-white/90 drop-shadow-md">
          {config.label}
        </span>
      </div>
    </div>
  );
}

export function TelePodium({ 
  first, 
  second, 
  third, 
  onOperatorClick,
  selectedOperatorId 
}: TelePodiumProps) {
  // Se não tiver pelo menos o primeiro colocado, não renderiza
  if (!first) return null;

  return (
    <div className="flex flex-col items-center">
      {/* Título */}
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-bold">Top Performers</h3>
      </div>

      {/* Pódio */}
      <div className="flex items-end justify-center gap-2 pb-4">
        <PodiumPlace 
          operator={second} 
          position={2} 
          onOperatorClick={onOperatorClick}
          isSelected={selectedOperatorId === second?.bitrix_id}
        />
        <PodiumPlace 
          operator={first} 
          position={1} 
          onOperatorClick={onOperatorClick}
          isSelected={selectedOperatorId === first?.bitrix_id}
        />
        <PodiumPlace 
          operator={third} 
          position={3} 
          onOperatorClick={onOperatorClick}
          isSelected={selectedOperatorId === third?.bitrix_id}
        />
      </div>

      {/* Base do pódio */}
      <div className="w-full max-w-[320px] h-2 bg-gradient-to-r from-gray-300/50 via-yellow-400/50 to-orange-400/50 rounded-full" />
    </div>
  );
}
