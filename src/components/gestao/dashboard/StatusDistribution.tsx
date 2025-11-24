import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { GestaoFilters } from "@/types/filters";

const COLORS = [
  "hsl(217 91% 60%)",
  "hsl(142 76% 36%)",
  "hsl(262 83% 58%)",
  "hsl(24 95% 53%)",
  "hsl(336 87% 59%)",
];

interface StatusDistributionProps {
  filters?: GestaoFilters;
}

export default function StatusDistribution({ filters }: StatusDistributionProps) {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["status-distribution", filters],
    queryFn: async () => {
      // Chamar RPC otimizada
      const { data, error } = await supabase.rpc('get_status_distribution_data', {
        p_start_date: filters?.dateFilter.preset !== 'all' 
          ? filters.dateFilter.startDate.toISOString() 
          : null,
        p_end_date: filters?.dateFilter.preset !== 'all'
          ? filters.dateFilter.endDate.toISOString()
          : null,
        p_project_id: filters?.projectId || null,
        p_scouter: filters?.scouterId || null,
        p_fonte: filters?.fonte || null,
        p_limit: 5,
      });
      
      if (error) throw error;
      
      return (data as any[]) || [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Carregando distribuição...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
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
                {chartData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
