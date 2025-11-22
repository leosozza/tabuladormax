import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { GestaoFilters } from "@/types/filters";

const COLORS = [
  "hsl(217 91% 60%)",   // Meta - Azul
  "hsl(142 76% 36%)",   // Scouters - Verde
  "hsl(24 95% 53%)",    // Recepção - Laranja
  "hsl(262 83% 58%)",   // OpenLine - Roxo
  "hsl(336 87% 59%)",   // Outros - Rosa
];

interface SourceAnalysisProps {
  filters?: GestaoFilters;
}

export default function SourceAnalysis({ filters }: SourceAnalysisProps) {
  const { data: sourceData, isLoading } = useQuery({
    queryKey: ["source-analysis", filters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("fonte, ficha_confirmada, compareceu");

      // Aplicar filtros de data
      if (filters?.dateFilter.preset !== 'all') {
        query = query
          .gte("criado", filters.dateFilter.startDate.toISOString())
          .lte("criado", filters.dateFilter.endDate.toISOString());
      }

      // Aplicar filtro de projeto
      if (filters?.projectId) {
        query = query.eq("commercial_project_id", filters.projectId);
      }

      // Aplicar filtro de scouter
      if (filters?.scouterId) {
        query = query.eq("scouter", filters.scouterId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Normalizar e agrupar por fonte
      const grouped = new Map<string, { total: number; confirmados: number; compareceram: number }>();

      data?.forEach((lead) => {
        // Normalização inline (mesma lógica da função do banco)
        let fonte = lead.fonte || 'Sem Fonte';
        if (fonte.toLowerCase().includes('meta') || fonte.toLowerCase().includes('instagram') || fonte.toLowerCase().includes('facebook')) {
          fonte = 'Meta';
        } else if (fonte.toLowerCase().includes('scouter') || fonte.toLowerCase().includes('fichas')) {
          fonte = 'Scouters';
        } else if (fonte.toLowerCase().includes('recep')) {
          fonte = 'Recepção';
        } else if (fonte.toLowerCase().includes('openline')) {
          fonte = 'OpenLine';
        } else if (fonte.toLowerCase().includes('maxsystem')) {
          fonte = 'MaxSystem';
        }

        if (!grouped.has(fonte)) {
          grouped.set(fonte, { total: 0, confirmados: 0, compareceram: 0 });
        }

        const stats = grouped.get(fonte)!;
        stats.total++;
        if (lead.ficha_confirmada) stats.confirmados++;
        if (lead.compareceu) stats.compareceram++;
      });

      // Converter para array
      const pieData = Array.from(grouped.entries())
        .map(([name, stats]) => ({
          name,
          value: stats.total,
          percentage: 0 // calculado depois
        }))
        .sort((a, b) => b.value - a.value);

      const total = pieData.reduce((sum, item) => sum + item.value, 0);
      pieData.forEach(item => {
        item.percentage = total > 0 ? (item.value / total) * 100 : 0;
      });

      const barData = Array.from(grouped.entries())
        .map(([name, stats]) => ({
          fonte: name,
          total: stats.total,
          confirmados: stats.confirmados,
          compareceram: stats.compareceram,
          taxaConversao: stats.total > 0 ? (stats.compareceram / stats.total) * 100 : 0
        }))
        .sort((a, b) => b.total - a.total);

      return { pieData, barData };
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Pizza - Distribuição */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Fonte</CardTitle>
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
                  data={sourceData?.pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceData?.pieData?.map((entry, index) => (
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

      {/* Gráfico de Barras - Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Fonte</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-muted-foreground">Carregando performance...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceData?.barData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="fonte"
                  className="text-xs"
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
    </div>
  );
}
