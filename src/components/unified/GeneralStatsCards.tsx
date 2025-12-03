import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, UserCheck, DollarSign, TrendingUp, Percent } from "lucide-react";

interface GeneralStatsCardsProps {
  stats: {
    total_leads: number;
    confirmados: number;
    compareceram: number;
    valor_total: number;
    leads_periodo: number;
    taxa_conversao: number;
  } | null;
  isLoading: boolean;
  periodLabel?: string;
}

export function GeneralStatsCards({ stats, isLoading, periodLabel }: GeneralStatsCardsProps) {
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
      title: "Leads no Período",
      value: stats.leads_periodo.toLocaleString('pt-BR'),
      icon: TrendingUp,
      color: "text-orange-600",
    },
    {
      title: "Taxa de Conversão",
      value: `${stats.taxa_conversao}%`,
      icon: Percent,
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
