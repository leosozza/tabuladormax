import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Period, getPeriodConfig, groupDataByPeriodAndDirection } from "@/lib/syncUtils";

interface SyncTimelineChartProps {
  period: Period;
}

const chartConfig = {
  bitrix_to_supabase: {
    label: "Bitrix → TabuladorMax",
    color: "#3b82f6",
  },
  supabase_to_bitrix: {
    label: "TabuladorMax → Bitrix",
    color: "#10b981",
  },
  supabase_to_gestao_scouter: {
    label: "TabuladorMax → Gestão Scouter",
    color: "#8b5cf6",
  },
  gestao_scouter_to_supabase: {
    label: "Gestão Scouter → TabuladorMax",
    color: "#f59e0b",
  },
  csv_import: {
    label: "CSV → TabuladorMax",
    color: "#6366f1",
  },
};

export function SyncTimelineChart({ period }: SyncTimelineChartProps) {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['sync-timeline', period],
    queryFn: async () => {
      const config = getPeriodConfig(period);
      
      const { data, error } = await supabase
        .from('sync_events')
        .select('created_at, status, direction')
        .gte('created_at', config.startDate.toISOString())
        .order('created_at', { ascending: true });
      
      console.log('🔍 SyncTimeline Query:', { 
        count: data?.length, 
        error,
        period,
        startDate: config.startDate.toISOString(),
        sample: data?.slice(0, 3) 
      });
      
      return groupDataByPeriodAndDirection(data, period);
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
          <ChartContainer config={chartConfig} className="h-[350px]">
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
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="bitrix_to_supabase" 
                  name="Bitrix → TabuladorMax"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="supabase_to_bitrix" 
                  name="TabuladorMax → Bitrix"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="supabase_to_gestao_scouter" 
                  name="TabuladorMax → Gestão Scouter"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="gestao_scouter_to_supabase" 
                  name="Gestão Scouter → TabuladorMax"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="csv_import" 
                  name="CSV → TabuladorMax"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center flex-col gap-2">
            <p className="text-muted-foreground text-center">
              📊 Nenhuma sincronização registrada neste período
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              As sincronizações são registradas automaticamente quando ocorrem importações do Bitrix,
              exportações para o Gestão Scouter ou atualizações via CSV.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
