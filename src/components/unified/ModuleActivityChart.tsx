import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Area, ComposedChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, Legend } from "recharts";
import { DateFilterValue } from "@/components/MinimalDateFilter";

export interface ModuleActivityChartProps {
  dateFilter: DateFilterValue;
  sourceFilter?: 'all' | 'scouter' | 'meta';
}

interface ChartDataRow {
  period: string;
  total: number;
  scouter: number;
  meta: number;
}

export function ModuleActivityChart({ dateFilter, sourceFilter = 'all' }: ModuleActivityChartProps) {
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
      const granularity = isToday ? 'hour' : 'day';
      
      const { data, error } = await supabase.rpc('get_activity_chart_data', {
        p_start_date: dateFilter.startDate.toISOString(),
        p_end_date: dateFilter.endDate.toISOString(),
        p_granularity: granularity
      });

      if (error) {
        console.error('Error fetching activity data:', error);
        return [];
      }

      if (!data || data.length === 0) {
        // Return empty data structure
        if (isToday) {
          const hours = eachHourOfInterval({
            start: startOfDay(dateFilter.startDate),
            end: endOfDay(dateFilter.startDate)
          });
          return hours.map(hour => ({
            date: format(hour, 'HH\'h\'', { locale: ptBR }),
            total: 0,
            scouter: 0,
            meta: 0,
          }));
        } else {
          const days = eachDayOfInterval({
            start: dateFilter.startDate,
            end: dateFilter.endDate
          });
          return days.map(date => {
            let label: string;
            if (dateFilter.preset === 'week') {
              label = format(date, 'EEE', { locale: ptBR });
            } else if (dateFilter.preset === 'month') {
              label = format(date, 'dd', { locale: ptBR });
            } else {
              label = format(date, 'dd/MMM', { locale: ptBR });
            }
            return { date: label, total: 0, scouter: 0, meta: 0 };
          });
        }
      }

      // Map RPC data to chart format
      if (isToday) {
        return (data as ChartDataRow[]).map(row => ({
          date: `${row.period}h`,
          total: Number(row.total),
          scouter: Number(row.scouter),
          meta: Number(row.meta),
        }));
      } else {
        return (data as ChartDataRow[]).map(row => {
          const date = new Date(row.period);
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
            total: Number(row.total),
            scouter: Number(row.scouter),
            meta: Number(row.meta),
          };
        });
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
