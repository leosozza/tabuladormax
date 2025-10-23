// Onde exibir valores de R$ na Projeção, não reparse strings.
// Receber numbers do repo e formatar com formatBRL(n).
import { formatBRL } from '@/utils/currency';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LinearProjectionData {
  serie_real: Array<{ dia: string; leads: number; acumulado: number }>;
  serie_proj: Array<{ dia: string; leads: number; acumulado: number }>;
}

interface ProjectionChartLinesProps {
  data: LinearProjectionData;
}

export function ProjectionChartLines({ data }: ProjectionChartLinesProps) {
  const fmtNumber = new Intl.NumberFormat('pt-BR');
  
  // Combine real and projected data for chart
  const chartData = [
    ...data.serie_real.map(item => ({
      dia: item.dia,
      data: new Date(item.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      realizado: item.acumulado,
      projetado: null,
    })),
    ...data.serie_proj.map(item => ({
      dia: item.dia,
      data: new Date(item.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      realizado: null,
      projetado: item.acumulado,
    }))
  ].sort((a, b) => a.dia.localeCompare(b.dia));

  const totalReal = data.serie_real.length > 0 ? data.serie_real[data.serie_real.length - 1].acumulado : 0;
  const totalProj = data.serie_proj.length > 0 ? data.serie_proj[data.serie_proj.length - 1].acumulado : 0;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Evolução Linear das Leads
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Linha contínua: realizado | Linha tracejada: projetado
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="data" 
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => fmtNumber.format(value)}
                />
                <Tooltip 
                  labelFormatter={(label) => `Data: ${label}`}
                  formatter={(value: number, name: string) => [
                    value !== null ? fmtNumber.format(value) : '-',
                    name === 'realizado' ? 'Realizado' : 'Projetado'
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="realizado"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  connectNulls={false}
                  name="Realizado"
                />
                <Line
                  type="monotone"
                  dataKey="projetado"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls={false}
                  name="Projetado"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Realizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {fmtNumber.format(totalReal)} leads
            </div>
            <p className="text-xs text-muted-foreground">Até hoje</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Projetado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {fmtNumber.format(totalProj)} leads
            </div>
            <p className="text-xs text-muted-foreground">Até o final do período</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}