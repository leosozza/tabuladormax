import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Period, getPeriodConfig, groupDataByPeriod } from "@/lib/syncUtils";

interface SyncTimelineChartProps {
  period: Period;
}

const chartConfig = {
  success: {
    label: "Sucesso",
    color: "hsl(var(--chart-1))",
  },
  error: {
    label: "Erro",
    color: "hsl(var(--chart-2))",
  },
};

export function SyncTimelineChart({ period }: SyncTimelineChartProps) {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['sync-timeline', period],
    queryFn: async () => {
      const config = getPeriodConfig(period);
      
      const { data } = await supabase
        .from('sync_events')
        .select('created_at, status, direction')
        .gte('created_at', config.startDate.toISOString())
        .order('created_at', { ascending: true });
      
      return groupDataByPeriod(data, period);
    },
    refetchInterval: period === 'minute' ? 10000 : 30000
  });

  const config = getPeriodConfig(period);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sincronizações - {config.label}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : chartData && chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="success" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="error" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Nenhum dado disponível</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
