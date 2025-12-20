import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { subDays, startOfDay } from "date-fns";

interface StatCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  suffix?: string;
}

function StatCard({ title, currentValue, previousValue, suffix = "" }: StatCardProps) {
  const diff = currentValue - previousValue;
  const percentChange = previousValue > 0 ? ((diff / previousValue) * 100) : 0;
  const isPositive = diff > 0;
  const isNeutral = diff === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-2">
          {currentValue}{suffix}
        </div>
        <div className="flex items-center gap-2">
          {isNeutral ? (
            <Minus className="w-4 h-4 text-muted-foreground" />
          ) : isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" />
          )}
          <span className={`text-sm font-medium ${
            isNeutral ? "text-muted-foreground" :
            isPositive ? "text-green-600" : "text-red-600"
          }`}>
            {isNeutral ? "Sem mudança" :
             isPositive ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`}
          </span>
          <span className="text-sm text-muted-foreground">vs 30 dias anteriores</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StatsComparison() {
  const { data: stats } = useQuery({
    queryKey: ["stats-comparison"],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = startOfDay(subDays(now, 30));
      const sixtyDaysAgo = startOfDay(subDays(now, 60));

      // Usar RPC para evitar limite de 1000 linhas
      const { data, error } = await supabase.rpc('get_stats_comparison', {
        p_current_start: thirtyDaysAgo.toISOString(),
        p_current_end: now.toISOString(),
        p_previous_start: sixtyDaysAgo.toISOString(),
        p_previous_end: thirtyDaysAgo.toISOString()
      });

      if (error) throw error;

      // Processar resultado da RPC
      const current = data?.find((r: { period: string }) => r.period === 'current') || { total: 0, confirmed: 0, present: 0 };
      const previous = data?.find((r: { period: string }) => r.period === 'previous') || { total: 0, confirmed: 0, present: 0 };

      const currentTotal = Number(current.total) || 0;
      const currentConfirmed = Number(current.confirmed) || 0;
      const currentPresent = Number(current.present) || 0;
      const currentConversion = currentTotal > 0 ? (currentPresent / currentTotal * 100) : 0;

      const previousTotal = Number(previous.total) || 0;
      const previousConfirmed = Number(previous.confirmed) || 0;
      const previousPresent = Number(previous.present) || 0;
      const previousConversion = previousTotal > 0 ? (previousPresent / previousTotal * 100) : 0;

      return {
        current: {
          total: currentTotal,
          confirmed: currentConfirmed,
          present: currentPresent,
          conversion: currentConversion,
        },
        previous: {
          total: previousTotal,
          confirmed: previousConfirmed,
          present: previousPresent,
          conversion: previousConversion,
        },
      };
    },
  });

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded mb-2" />
              <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total de Leads"
        currentValue={stats.current.total}
        previousValue={stats.previous.total}
      />
      <StatCard
        title="Fichas Confirmadas"
        currentValue={stats.current.confirmed}
        previousValue={stats.previous.confirmed}
      />
      <StatCard
        title="Comparecimentos"
        currentValue={stats.current.present}
        previousValue={stats.previous.present}
      />
      <StatCard
        title="Taxa de Conversão"
        currentValue={Math.round(stats.current.conversion)}
        previousValue={Math.round(stats.previous.conversion)}
        suffix="%"
      />
    </div>
  );
}
