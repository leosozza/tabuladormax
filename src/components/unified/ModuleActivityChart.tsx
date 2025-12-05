import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Area, ComposedChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, Legend } from "recharts";
import { DateFilterValue } from "@/components/MinimalDateFilter";

interface ModuleActivityChartProps {
  dateFilter: DateFilterValue;
}

export function ModuleActivityChart({ dateFilter }: ModuleActivityChartProps) {
  const isToday = dateFilter.preset === 'today' || dateFilter.preset === 'exact';
  
  const getTitle = () => {
    switch (dateFilter.preset) {
      case 'today': return 'Atividade do Dia';
      case 'week': return 'Atividade da Semana';
      case 'month': return 'Atividade do Mês';
      case 'exact': return `Atividade de ${format(dateFilter.startDate, "dd 'de' MMMM", { locale: ptBR })}`;
      case 'range': return 'Atividade do Período';
      default: return 'Atividade';
    }
  };

  const getDescription = () => {
    if (isToday) {
      return 'Leads criados por hora (Total, Scouter e Meta)';
    }
    return 'Leads criados por dia (Total, Scouter e Meta)';
  };

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['activity-chart', dateFilter.startDate.toISOString(), dateFilter.endDate.toISOString(), isToday],
    queryFn: async () => {
      if (isToday) {
        // Por hora
        const hours = eachHourOfInterval({
          start: startOfDay(dateFilter.startDate),
          end: endOfDay(dateFilter.startDate)
        });

        const promises = hours.map(async (hour) => {
          const hourStart = hour.toISOString();
          const hourEnd = new Date(hour.getTime() + 60 * 60 * 1000 - 1).toISOString();

          const [totalResult, scouterResult, metaResult] = await Promise.all([
            supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .gte('criado', hourStart)
              .lt('criado', hourEnd),
            supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .gte('criado', hourStart)
              .lt('criado', hourEnd)
              .eq('fonte_normalizada', 'Scouter - Fichas'),
            supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .gte('criado', hourStart)
              .lt('criado', hourEnd)
              .eq('fonte_normalizada', 'Meta'),
          ]);

          return {
            date: format(hour, 'HH\'h\'', { locale: ptBR }),
            total: totalResult.count || 0,
            scouter: scouterResult.count || 0,
            meta: metaResult.count || 0,
          };
        });

        return await Promise.all(promises);
      } else {
        // Por dia
        const days = eachDayOfInterval({
          start: dateFilter.startDate,
          end: dateFilter.endDate
        });

        const promises = days.map(async (date) => {
          const dayStr = format(date, 'yyyy-MM-dd');

          const [totalResult, scouterResult, metaResult] = await Promise.all([
            supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .gte('criado', `${dayStr}T00:00:00`)
              .lt('criado', `${dayStr}T23:59:59`),
            supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .gte('criado', `${dayStr}T00:00:00`)
              .lt('criado', `${dayStr}T23:59:59`)
              .eq('fonte_normalizada', 'Scouter - Fichas'),
            supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .gte('criado', `${dayStr}T00:00:00`)
              .lt('criado', `${dayStr}T23:59:59`)
              .eq('fonte_normalizada', 'Meta'),
          ]);

          // Formato do eixo X baseado no preset
          let label: string;
          if (dateFilter.preset === 'week') {
            label = format(date, 'EEE', { locale: ptBR });
          } else if (dateFilter.preset === 'month') {
            label = format(date, 'dd', { locale: ptBR });
          } else {
            label = format(date, 'dd/MMM', { locale: ptBR });
          }

          return {
            date: label,
            total: totalResult.count || 0,
            scouter: scouterResult.count || 0,
            meta: metaResult.count || 0,
          };
        });

        return await Promise.all(promises);
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = { 
                    total: 'Total', 
                    scouter: 'Scouter - Fichas', 
                    meta: 'Meta' 
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value: string) => {
                  const labels: Record<string, string> = { 
                    total: 'Total', 
                    scouter: 'Scouter - Fichas', 
                    meta: 'Meta' 
                  };
                  return labels[value] || value;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(var(--primary))" 
                strokeOpacity={0.5}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
                name="total"
              />
              <Line 
                type="monotone" 
                dataKey="scouter" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={false}
                name="scouter"
              />
              <Line 
                type="monotone" 
                dataKey="meta" 
                stroke="#22c55e" 
                strokeWidth={2} 
                dot={false}
                name="meta"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
