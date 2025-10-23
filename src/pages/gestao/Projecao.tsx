import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GestaoSidebar from "@/components/gestao/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, DollarSign, Target, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GestaoProjecao() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  
  const { data: projectionData, isLoading } = useQuery({
    queryKey: ["gestao-projection", selectedMonth],
    queryFn: async () => {
      const monthDate = new Date(selectedMonth + "-01");
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      
      const { data: leads, error } = await supabase
        .from("leads")
        .select("*")
        .gte("criado", start.toISOString())
        .lte("criado", end.toISOString());
      
      if (error) throw error;
      
      const confirmed = leads?.filter(l => l.ficha_confirmada).length || 0;
      const present = leads?.filter(l => l.compareceu).length || 0;
      const avgValue = leads?.filter(l => l.valor_ficha).reduce((sum, l) => sum + (Number(l.valor_ficha) || 0), 0) || 0;
      
      return {
        totalLeads: leads?.length || 0,
        confirmed,
        present,
        totalValue: avgValue,
        avgValue: leads?.length ? avgValue / leads.length : 0,
        conversionRate: leads?.length ? (present / leads.length * 100) : 0
      };
    },
  });

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM 'de' yyyy", { locale: ptBR })
    };
  });

  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Projeções</h1>
            <p className="text-muted-foreground">Análise de performance e metas</p>
          </div>
          
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando projeções...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Leads
                  </CardTitle>
                  <Calendar className="w-5 h-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{projectionData?.totalLeads}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Taxa de Conversão
                  </CardTitle>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {projectionData?.conversionRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Valor Total
                  </CardTitle>
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    R$ {projectionData?.totalValue.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Valor Médio
                  </CardTitle>
                  <Target className="w-5 h-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    R$ {projectionData?.avgValue.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resumo do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-muted-foreground">Fichas Confirmadas</span>
                    <span className="text-xl font-bold">{projectionData?.confirmed}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-muted-foreground">Comparecimentos</span>
                    <span className="text-xl font-bold">{projectionData?.present}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Leads Pendentes</span>
                    <span className="text-xl font-bold">
                      {(projectionData?.totalLeads || 0) - (projectionData?.confirmed || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
