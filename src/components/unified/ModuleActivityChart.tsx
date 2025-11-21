import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ModuleActivityChart() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['activity-chart'],
    queryFn: async () => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, 'yyyy-MM-dd');
      });

      const promises = last7Days.map(async (date) => {
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('criado', `${date}T00:00:00`)
          .lt('criado', `${date}T23:59:59`);

        return {
          date: format(new Date(date), 'dd/MMM', { locale: ptBR }),
          leads: count || 0,
        };
      });

      return await Promise.all(promises);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade dos Últimos 7 Dias</CardTitle>
        <CardDescription>Leads criados por dia</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="leads" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorLeads)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
