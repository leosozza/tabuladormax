import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllLeads } from "@/lib/supabaseUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface LeadPerformanceData {
  scouter: string;
  ficha_confirmada?: boolean;
  compareceu?: boolean;
}

export default function ScouterPerformance() {
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["scouter-performance"],
    queryFn: async () => {
      // Fetch all leads with pagination to ensure we get more than 1000 records
      const data = await fetchAllLeads<LeadPerformanceData>(
        supabase,
        "scouter, ficha_confirmada, compareceu",
        (query) => query.not("scouter", "is", null)
      );
      
      // Agrupar por scouter
      const grouped = new Map<string, { total: number; confirmados: number; compareceram: number }>();
      
      data?.forEach((lead) => {
        const scouter = lead.scouter || "Sem scouter";
        if (!grouped.has(scouter)) {
          grouped.set(scouter, { total: 0, confirmados: 0, compareceram: 0 });
        }
        const stats = grouped.get(scouter)!;
        stats.total++;
        if (lead.ficha_confirmada) stats.confirmados++;
        if (lead.compareceu) stats.compareceram++;
      });
      
      // Converter para array e ordenar por total
      return Array.from(grouped.entries())
        .map(([scouter, stats]) => ({
          scouter: scouter.length > 20 ? scouter.substring(0, 20) + "..." : scouter,
          total: stats.total,
          confirmados: stats.confirmados,
          compareceram: stats.compareceram,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10); // Top 10
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
