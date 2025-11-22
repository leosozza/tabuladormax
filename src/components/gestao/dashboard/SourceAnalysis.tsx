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
      // Usar RPC otimizada que retorna dados já normalizados
      const { data, error } = await supabase.rpc('get_source_analysis', {
        p_start_date: filters?.dateFilter.preset !== 'all'
          ? filters.dateFilter.startDate.toISOString()
          : null,
        p_end_date: filters?.dateFilter.preset !== 'all'
          ? filters.dateFilter.endDate.toISOString()
          : null,
        p_project_id: filters?.projectId,
        p_scouter: filters?.scouterId,
        p_fonte: filters?.fonte
      });
      
      if (error) throw error;

      // Converter para formato dos gráficos
      const pieData = data?.map(item => ({
        name: item.fonte_normalizada,
        value: Number(item.total),
        percentage: 0 // calculado depois
      })) || [];

      const total = pieData.reduce((sum, item) => sum + item.value, 0);
      pieData.forEach(item => {
        item.percentage = total > 0 ? (item.value / total) * 100 : 0;
      });

      const barData = data?.map(item => ({
        fonte: item.fonte_normalizada,
        total: Number(item.total),
        confirmados: Number(item.confirmados),
        compareceram: Number(item.compareceram),
        taxaConversao: Number(item.total) > 0 
          ? (Number(item.compareceram) / Number(item.total)) * 100 
          : 0
      })) || [];

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
