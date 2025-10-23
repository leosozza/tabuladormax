import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = [
  "hsl(217 91% 60%)",
  "hsl(142 76% 36%)",
  "hsl(262 83% 58%)",
  "hsl(24 95% 53%)",
  "hsl(336 87% 59%)",
];

export default function StatusDistribution() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["status-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("etapa");
      
      if (error) throw error;
      
      // Agrupar por etapa
      const grouped = new Map<string, number>();
      
      data?.forEach((lead) => {
        const etapa = lead.etapa || "Sem etapa";
        grouped.set(etapa, (grouped.get(etapa) || 0) + 1);
      });
      
      return Array.from(grouped.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5
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
