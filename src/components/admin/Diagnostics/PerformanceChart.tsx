import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveMetrics } from "@/hooks/useLiveMetrics";
import { Skeleton } from "@/components/ui/skeleton";

export function PerformanceChart() {
  const { metrics, loading } = useLiveMetrics(5000);

  if (loading && !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gráfico de Performance</CardTitle>
          <CardDescription>Histórico de métricas do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Simple SVG chart showing current metrics
  const maxValue = 100;
  const barWidth = 40;
  const gap = 20;
  const chartHeight = 200;

  const bars = [
    { label: "CPU", value: metrics?.cpu || 0, color: "#3b82f6" },
    { label: "MEM", value: metrics?.memory || 0, color: "#10b981" },
    { label: "ERR", value: metrics?.errorRate || 0, color: "#ef4444" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gráfico de Performance</CardTitle>
        <CardDescription>Métricas atuais do sistema em tempo real</CardDescription>
      </CardHeader>
      <CardContent>
        <svg
          width="100%"
          height={chartHeight + 40}
          viewBox={`0 0 ${bars.length * (barWidth + gap)} ${chartHeight + 40}`}
          className="mx-auto"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((value, i) => {
            const y = chartHeight - (value / maxValue) * chartHeight;
            return (
              <g key={value}>
                <line
                  x1="0"
                  y1={y}
                  x2={bars.length * (barWidth + gap)}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={-5}
                  y={y + 4}
                  fontSize="10"
                  fill="#6b7280"
                  textAnchor="end"
                >
                  {value}%
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {bars.map((bar, i) => {
            const x = i * (barWidth + gap);
            const barHeight = (bar.value / maxValue) * chartHeight;
            const y = chartHeight - barHeight;

            return (
              <g key={bar.label}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={bar.color}
                  rx="4"
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  fontSize="12"
                  fill="#374151"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {bar.value.toFixed(1)}%
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  fontSize="12"
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {bar.label}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Atualização a cada 5 segundos
        </p>
      </CardContent>
    </Card>
  );
}
