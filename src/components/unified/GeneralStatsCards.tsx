import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, UserCheck, DollarSign, TrendingUp, Calendar } from "lucide-react";

interface GeneralStatsCardsProps {
  stats: {
    total_leads: number;
    confirmados: number;
    compareceram: number;
    valor_total: number;
    leads_hoje: number;
    leads_semana: number;
  } | null;
  isLoading: boolean;
}

export function GeneralStatsCards({ stats, isLoading }: GeneralStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carregando...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statsCards = [
    {
      title: "Total de Leads",
      value: stats.total_leads.toLocaleString('pt-BR'),
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Fichas Confirmadas",
      value: stats.confirmados.toLocaleString('pt-BR'),
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "Compareceram",
      value: stats.compareceram.toLocaleString('pt-BR'),
      icon: UserCheck,
      color: "text-purple-600",
    },
    {
      title: "Valor Total",
      value: `R$ ${stats.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-emerald-600",
    },
    {
      title: "Leads Hoje",
      value: stats.leads_hoje.toLocaleString('pt-BR'),
      icon: Calendar,
      color: "text-orange-600",
    },
    {
      title: "Leads Esta Semana",
      value: stats.leads_semana.toLocaleString('pt-BR'),
      icon: TrendingUp,
      color: "text-cyan-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statsCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
