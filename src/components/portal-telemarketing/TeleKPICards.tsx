import { useSupervisorTeam } from '@/hooks/useSupervisorTeam';

interface TeleKPICardsProps {
  commercialProjectId?: string;
  supervisorBitrixId: number;
  operatorCargo: string;
}

export const TeleKPICards = ({ commercialProjectId, supervisorBitrixId, operatorCargo }: TeleKPICardsProps) => {
  const { data: teamData } = useSupervisorTeam(
    commercialProjectId || null,
    supervisorBitrixId,
    operatorCargo
  );

  const teamSize = teamData?.agents?.length || 0;
  
  // Mock CSAT and KPI for now - can be connected to real data later
  const csat = 4.8;
  const kpi = 92;

  const kpis = [
    { label: 'Team Size', value: teamSize.toString() },
    { label: 'CSAT', value: csat.toFixed(1) },
    { label: 'KPI', value: `${kpi}%` }
  ];

  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-4">
      {kpis.map((item) => (
        <div 
          key={item.label} 
          className="bg-card/50 rounded-xl p-4 text-center border border-border/50"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {item.label}
          </p>
          <p className="text-2xl font-bold text-primary">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
};
