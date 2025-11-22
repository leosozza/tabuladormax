import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { HistoricalAnalysis } from "@/types/projection";

interface WeekdayPerformanceChartProps {
  analysis: HistoricalAnalysis;
}

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function WeekdayPerformanceChart({ analysis }: WeekdayPerformanceChartProps) {
  // Garantir que todos os 7 dias da semana apareçam
  const data = [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const perf = analysis.performanceByWeekday[day];
    return {
      name: WEEKDAY_NAMES[day],
      leads: perf ? Math.round(perf.avgLeads) : 0,
      leadsConfirmados: perf ? Math.round(perf.avgFichas) : 0,
      conversao: perf ? Math.round(perf.conversionRate * 100) : 0,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Dia da Semana</CardTitle>
        <p className="text-sm text-muted-foreground">
          Média diária de leads e leads confirmados por dia da semana
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="leads" fill="hsl(var(--primary))" name="Leads" radius={[4, 4, 0, 0]} />
            <Bar dataKey="leadsConfirmados" fill="hsl(var(--chart-2))" name="Leads Confirmados" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {data.map((day) => (
            <div key={day.name} className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-sm font-medium">{day.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {day.conversao}% conversão
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
