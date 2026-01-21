import { useSupervisorTeam } from '@/hooks/useSupervisorTeam';

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

  const teamSize = teamData?.agents?.length || 0;
  
  // Mock CSAT and KPI for now - can be connected to real data later
  const csat = 4.8;
  const kpi = 92;

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

      {/* CSAT */}
      <div className="bg-card/50 rounded-xl p-4 text-center border border-border/50">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          CSAT
        </p>
        <p className="text-2xl font-bold text-primary">
          {csat.toFixed(1)}
        </p>
      </div>

      {/* KPI */}
      <div className="bg-card/50 rounded-xl p-4 text-center border border-border/50">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          KPI
        </p>
        <p className="text-2xl font-bold text-primary">
          {kpi}%
        </p>
      </div>
    </div>
  );
};
