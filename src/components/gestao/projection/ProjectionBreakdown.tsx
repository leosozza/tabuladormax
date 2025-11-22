import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Projection } from "@/types/projection";

interface ProjectionBreakdownProps {
  projection: Projection;
}

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function ProjectionBreakdown({ projection }: ProjectionBreakdownProps) {
  // Dados por semana
  const weeklyData = projection.breakdown.byWeek.map((week) => ({
    week: `Semana ${week.week + 1}`,
    leadsConfirmados: Math.round(week.estimated),
    data: format(week.date, "dd/MM", { locale: ptBR }),
  }));

  // Dados por dia da semana
  const weekdayData = Object.entries(projection.breakdown.byWeekday).map(([day, count]) => ({
    name: WEEKDAY_NAMES[parseInt(day)],
    leadsConfirmados: Math.round(count),
  }));

  return (
    <div className="space-y-6">
      {/* Projeção Semanal */}
      <Card>
        <CardHeader>
          <CardTitle>Projeção Semanal</CardTitle>
          <p className="text-sm text-muted-foreground">
            Distribuição estimada de leads confirmados ao longo das semanas
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelFormatter={(value, payload) => {
                  const item = payload[0]?.payload;
                  return item ? `${value} (${item.data})` : value;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="leadsConfirmados" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                name="Leads Confirmados"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Resumo das semanas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
            {weeklyData.map((week, idx) => (
              <div key={idx} className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-xs font-medium text-muted-foreground">{week.week}</div>
                <div className="text-lg font-bold mt-1">{week.leadsConfirmados}</div>
                <div className="text-xs text-muted-foreground">{week.data}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribuição por Dia da Semana */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Dia da Semana</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total estimado de leads confirmados por dia da semana no período
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weekdayData}>
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
              <Bar 
                dataKey="leadsConfirmados" 
                fill="hsl(var(--chart-2))" 
                radius={[4, 4, 0, 0]}
                name="Leads Confirmados"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
