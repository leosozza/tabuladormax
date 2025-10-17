import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { subHours } from "date-fns";

const COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))'
];

const chartConfig = {
  bitrix_to_supabase: {
    label: "Bitrix → Supabase",
    color: "hsl(var(--chart-1))",
  },
  supabase_to_bitrix: {
    label: "Supabase → Bitrix",
    color: "hsl(var(--chart-2))",
  },
  supabase_to_gestao_scouter: {
    label: "Supabase → Gestão Scouter",
    color: "hsl(var(--chart-3))",
  },
  gestao_scouter_to_supabase: {
    label: "Gestão Scouter → Supabase",
    color: "hsl(var(--chart-4))",
  },
};

export function SyncDirectionChart() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['sync-direction'],
    queryFn: async () => {
      const last24h = subHours(new Date(), 24);
      
      const { data } = await supabase
        .from('sync_events')
        .select('direction')
        .gte('created_at', last24h.toISOString());
      
      if (!data || data.length === 0) return [];

      const grouped = new Map<string, number>();
      data.forEach((event) => {
        grouped.set(event.direction, (grouped.get(event.direction) || 0) + 1);
      });

      const directionLabels: Record<string, string> = {
        'bitrix_to_supabase': 'Bitrix → Supabase',
        'supabase_to_bitrix': 'Supabase → Bitrix',
        'supabase_to_gestao_scouter': 'Supabase → Gestão Scouter',
        'gestao_scouter_to_supabase': 'Gestão Scouter → Supabase',
        'csv_import': 'Importação CSV'
      };

      return Array.from(grouped.entries()).map(([name, value]) => ({
        name: directionLabels[name] || name,
        value
      }));
    },
    refetchInterval: 30000
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Direção das Sincronizações (24h)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : chartData && chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
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
