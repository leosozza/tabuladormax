import { formatBRL } from '@/utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectionData {
  scouter_name: string;
  semana_futura: number;
  semana_label: string;
  weekly_goal: number;
  tier_name: string;
  projecao_conservadora: number;
  projecao_provavel: number;
  projecao_agressiva: number;
  projecao_historica: number;
}

interface ProjectionChartBarsProps {
  data: ProjectionData[];
  selectedScenario: 'conservadora' | 'provavel' | 'agressiva';
}

export function ProjectionChartBars({ data, selectedScenario }: ProjectionChartBarsProps) {
  // Group by scouter and calculate totals for 8 weeks
  const scouterTotals = data.reduce((acc, item) => {
    if (!acc[item.scouter_name]) {
      acc[item.scouter_name] = {
        scouter: item.scouter_name,
        tier: item.tier_name,
        conservadora: 0,
        provavel: 0,
        agressiva: 0,
        historica: 0
      };
    }
    
    acc[item.scouter_name].conservadora += item.projecao_conservadora;
    acc[item.scouter_name].provavel += item.projecao_provavel;
    acc[item.scouter_name].agressiva += item.projecao_agressiva;
    acc[item.scouter_name].historica += item.projecao_historica;
    
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(scouterTotals).sort((a, b) => 
    b[selectedScenario] - a[selectedScenario]
  );

  // Create weekly breakdown data
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const semana = i + 1;
    const weekData: any = {
      semana: `Sem+${semana}`,
    };

    const scouters = [...new Set(data.map(item => item.scouter_name))];
    let totalWeek = 0;

    scouters.forEach(scouter => {
      const scouterWeekData = data.find(
        item => item.scouter_name === scouter && item.semana_futura === semana
      );
      
      if (scouterWeekData) {
        const value = (() => {
          switch (selectedScenario) {
            case 'conservadora': return scouterWeekData.projecao_conservadora;
            case 'provavel': return scouterWeekData.projecao_provavel;
            case 'agressiva': return scouterWeekData.projecao_agressiva;
            default: return scouterWeekData.projecao_provavel;
          }
        })();
        totalWeek += value;
      }
    });

    weekData.total = totalWeek;
    return weekData;
  });

  const scenarioColors = {
    conservadora: '#f97316',
    provavel: '#3b82f6',
    agressiva: '#22c55e'
  };

  const scenarioLabels = {
    conservadora: 'Conservador',
    provavel: 'Provável',
    agressiva: 'Agressivo'
  };

  const getTierColor = (tier: string) => {
    const colors = {
      'Iniciante': 'bg-gray-100 text-gray-800',
      'Aprendiz': 'bg-blue-100 text-blue-800',
      'Junior': 'bg-green-100 text-green-800',
      'Pleno': 'bg-yellow-100 text-yellow-800',
      'Senior': 'bg-orange-100 text-orange-800',
      'Especialista': 'bg-purple-100 text-purple-800',
      'Gestor': 'bg-red-100 text-red-800'
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Scouter Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className={`text-${scenarioColors[selectedScenario].replace('#', '')}`}>
            Comparação Total por Scouter - Cenário {scenarioLabels[selectedScenario]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="scouter" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatBRL(value), 'Total 8 Semanas']}
                />
                <Bar 
                  dataKey={selectedScenario} 
                  fill={scenarioColors[selectedScenario]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Total Evolution */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Semanal Total - Cenário {scenarioLabels[selectedScenario]}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatBRL(value), 'Total da Semana']}
                />
                <Bar 
                  dataKey="total" 
                  fill={scenarioColors[selectedScenario]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Scouter Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking por Performance Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {chartData.slice(0, 10).map((scouter, index) => (
              <div key={scouter.scouter} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{scouter.scouter}</div>
                    <Badge className={getTierColor(scouter.tier)} variant="secondary">
                      {scouter.tier}
                    </Badge>
                  </div>
                </div>
                <div className={`text-lg font-bold text-${scenarioColors[selectedScenario].replace('#', '')}`}>
                  {formatBRL(scouter[selectedScenario])}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}