import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, TrendingUp, DollarSign, MapPin, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GestaoSidebar from "@/components/gestao/Sidebar";

export default function GestaoHome() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["gestao-stats"],
    queryFn: async () => {
      const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });
      
      const { count: confirmedLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("ficha_confirmada", true);
      
      const { count: presentLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("compareceu", true);

      return {
        totalLeads: totalLeads || 0,
        confirmedLeads: confirmedLeads || 0,
        presentLeads: presentLeads || 0,
        conversionRate: totalLeads ? ((presentLeads || 0) / totalLeads * 100).toFixed(1) : "0"
      };
    },
  });

  const statCards = [
    {
      title: "Total de Leads",
      value: stats?.totalLeads || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Fichas Confirmadas",
      value: stats?.confirmedLeads || 0,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Comparecimentos",
      value: stats?.presentLeads || 0,
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Taxa de Conversão",
      value: `${stats?.conversionRate}%`,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema de gestão de leads</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando estatísticas...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
