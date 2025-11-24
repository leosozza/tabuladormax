import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GestaoFilters } from "@/types/filters";

interface LeadsChartProps {
  filters?: GestaoFilters;
}

export default function LeadsChart({ filters }: LeadsChartProps) {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["leads-chart", filters],
    queryFn: async () => {
      const days = 30;
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = new Date();
      
      // Aplicar filtros customizados se fornecidos
      const actualStartDate = filters?.dateFilter.preset !== 'all' 
        ? filters.dateFilter.startDate 
        : startDate;
      const actualEndDate = filters?.dateFilter.preset !== 'all'
        ? filters.dateFilter.endDate
        : endDate;
      
      // Chamar RPC otimizada
      const { data, error } = await supabase.rpc('get_leads_chart_data', {
        p_start_date: actualStartDate.toISOString(),
        p_end_date: actualEndDate.toISOString(),
        p_project_id: filters?.projectId || null,
        p_scouter: filters?.scouterId || null,
        p_fonte: filters?.fonte || null,
      });
      
      if (error) throw error;
      
      // Criar mapa completo de dias (preencher dias sem dados)
      const grouped = new Map<string, { total: number; confirmados: number; compareceram: number }>();
      
      for (let i = 0; i <= days; i++) {
        const date = format(subDays(new Date(), days - i), "yyyy-MM-dd");
        grouped.set(date, { total: 0, confirmados: 0, compareceram: 0 });
      }
      
      // Preencher com dados do banco
      ((data as any[]) || []).forEach((item: any) => {
        const date = format(new Date(item.date), "yyyy-MM-dd");
        if (grouped.has(date)) {
          grouped.set(date, {
            total: item.total,
            confirmados: item.confirmados,
            compareceram: item.compareceram,
          });
        }
      });
      
      // Formatar para o gráfico
      return Array.from(grouped.entries()).map(([date, stats]) => ({
        date: format(new Date(date), "dd/MMM", { locale: ptBR }),
        total: stats.total,
        confirmados: stats.confirmados,
        compareceram: stats.compareceram,
      }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução de Leads (30 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Carregando dados...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
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
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Total"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="confirmados" 
                stroke="hsl(142 76% 36%)" 
                strokeWidth={2}
                name="Confirmados"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="compareceram" 
                stroke="hsl(262 83% 58%)" 
                strokeWidth={2}
                name="Compareceram"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
