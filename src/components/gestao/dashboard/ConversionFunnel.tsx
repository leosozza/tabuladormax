import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllLeads } from "@/lib/supabaseUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { GestaoFilters } from "@/types/filters";

const COLORS = [
  "hsl(217 91% 60%)", // Total
  "hsl(142 76% 36%)", // Confirmados
  "hsl(262 83% 58%)", // Compareceram
  "hsl(24 95% 53%)",  // Conversão
];

interface ConversionFunnelProps {
  filters?: GestaoFilters;
}

export default function ConversionFunnel({ filters }: ConversionFunnelProps) {
  const { data: funnelData, isLoading } = useQuery({
    queryKey: ["conversion-funnel", filters],
    queryFn: async () => {
      // Fetch all leads with pagination to ensure we get more than 1000 records
      const data = await fetchAllLeads(
        supabase,
        "ficha_confirmada, compareceu",
        (query) => {
          let q = query;
          
          // Aplicar filtros se fornecidos
          if (filters?.dateFilter.preset !== 'all') {
            q = q
              .gte("criado", filters.dateFilter.startDate.toISOString())
              .lte("criado", filters.dateFilter.endDate.toISOString());
          }
          if (filters?.projectId) {
            q = q.eq("commercial_project_id", filters.projectId);
          }
          if (filters?.scouterId) {
            q = q.eq("scouter", filters.scouterId);
          }
          if (filters?.fonte) {
            q = q.eq("fonte_normalizada", filters.fonte);
          }
          
          return q;
        }
      );
      
      const total = data.length;
      const confirmados = data.filter(l => l.ficha_confirmada).length;
      const compareceram = data.filter(l => l.compareceu).length;
      
      // Conversion funnel stages:
      // 1. Total de Leads - All leads created
      // 2. Fichas Confirmadas (Validadas) - Leads where ficha was confirmed/validated (not yet conversion)
      // 3. Compareceram (Convertidos) - Leads that actually showed up (TRUE CONVERSION)
      return [
        { name: "Total de Leads", value: total, percentage: 100 },
        { name: "Fichas Confirmadas (Validadas)", value: confirmados, percentage: total ? (confirmados / total * 100) : 0 },
        { name: "Compareceram (Convertidos)", value: compareceram, percentage: total ? (compareceram / total * 100) : 0 },
        { name: "Taxa de Conversão", value: compareceram, percentage: total ? (compareceram / total * 100) : 0 },
      ];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Carregando funil...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number" 
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={150}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value} (${props.payload.percentage.toFixed(1)}%)`,
                  name
                ]}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {funnelData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
