import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { GestaoFilters } from "@/types/filters";

interface ScouterPerformanceProps {
  filters?: GestaoFilters;
}

export default function ScouterPerformance({ filters }: ScouterPerformanceProps) {
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["scouter-performance", filters],
    queryFn: async () => {
      // Chamar RPC otimizada
      const { data, error } = await supabase.rpc('get_scouter_performance_data', {
        p_start_date: filters?.dateFilter.preset !== 'all' 
          ? filters.dateFilter.startDate.toISOString() 
          : null,
        p_end_date: filters?.dateFilter.preset !== 'all'
          ? filters.dateFilter.endDate.toISOString()
          : null,
        p_project_id: filters?.projectId || null,
        p_scouter: filters?.scouterId || null,
        p_fonte: filters?.fonte || null,
        p_limit: 10,
      });
      
      if (error) throw error;
      
      // Truncar nomes longos
      return ((data as any[]) || []).map((item: any) => ({
        scouter: item.scouter.length > 20 
          ? item.scouter.substring(0, 20) + "..." 
          : item.scouter,
        total: item.total,
        confirmados: item.confirmados,
        compareceram: item.compareceram,
      }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Scouter (Top 10)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[350px] flex items-center justify-center">
            <div className="text-muted-foreground">Carregando performance...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="scouter" 
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[8, 8, 0, 0]} />
              <Bar dataKey="confirmados" fill="hsl(142 76% 36%)" name="Confirmados" radius={[8, 8, 0, 0]} />
              <Bar dataKey="compareceram" fill="hsl(262 83% 58%)" name="Compareceram" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
