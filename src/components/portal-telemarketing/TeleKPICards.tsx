import { useSupervisorTeam } from '@/hooks/useSupervisorTeam';
import { useState, useEffect } from 'react';

interface TeleKPICardsProps {
  commercialProjectId?: string;
  supervisorBitrixId: number;
  operatorCargo: string;
  onTeamClick?: () => void;
}

export const TeleKPICards = ({ 
  commercialProjectId, 
  supervisorBitrixId, 
  operatorCargo,
  onTeamClick 
}: TeleKPICardsProps) => {
  const { data: teamData } = useSupervisorTeam(
    commercialProjectId || null,
    supervisorBitrixId,
    operatorCargo
  );

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const teamSize = teamData?.agents?.length || 0;
  
  const formattedTime = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });

  const formattedDate = currentTime.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });

  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-4">
      {/* Equipe - Clicável */}
      <button 
        onClick={onTeamClick}
        className="bg-card/50 rounded-xl p-4 text-center border border-border/50 hover:bg-card/80 hover:border-primary/50 transition-colors cursor-pointer"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          Equipe
        </p>
        <p className="text-2xl font-bold text-primary">
          {teamSize}
        </p>
      </button>

      {/* Horário */}
      <div className="bg-card/50 rounded-xl p-4 text-center border border-border/50">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          Horário
        </p>
        <p className="text-2xl font-bold text-primary">
          {formattedTime}
        </p>
      </div>

      {/* Data */}
      <div className="bg-card/50 rounded-xl p-4 text-center border border-border/50">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          Data
        </p>
        <p className="text-xl font-bold text-primary">
          {formattedDate}
        </p>
      </div>
    </div>
  );
};