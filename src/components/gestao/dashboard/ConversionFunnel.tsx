import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = [
  "hsl(217 91% 60%)", // Total
  "hsl(142 76% 36%)", // Confirmados
  "hsl(262 83% 58%)", // Compareceram
  "hsl(24 95% 53%)",  // Conversão
];

export default function ConversionFunnel() {
  const { data: funnelData, isLoading } = useQuery({
    queryKey: ["conversion-funnel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("ficha_confirmada, compareceu");
      
      if (error) throw error;
      
      const total = data.length;
      const confirmados = data.filter(l => l.ficha_confirmada).length;
      const compareceram = data.filter(l => l.compareceu).length;
      
      return [
        { name: "Total de Leads", value: total, percentage: 100 },
        { name: "Fichas Confirmadas", value: confirmados, percentage: total ? (confirmados / total * 100) : 0 },
        { name: "Compareceram", value: compareceram, percentage: total ? (compareceram / total * 100) : 0 },
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
