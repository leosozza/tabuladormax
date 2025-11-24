import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { TrendingUp, Clock, Target } from "lucide-react";

interface HourlyData {
  hour: number;
  total_leads: number;
  confirmed_leads: number;
  conversion_rate: number;
}

interface HourlyProductivityChartProps {
  data: HourlyData[];
  clockIn?: string;
  clockOut?: string;
}

const fillHourlyGaps = (data: HourlyData[], startHour: number, endHour: number): HourlyData[] => {
  const filledData: HourlyData[] = [];
  const dataMap = new Map(data.map(d => [d.hour, d]));
  
  for (let hour = startHour; hour <= endHour; hour++) {
    filledData.push(
      dataMap.get(hour) || {
        hour,
        total_leads: 0,
        confirmed_leads: 0,
        conversion_rate: 0
      }
    );
  }
  
  return filledData;
};

const calculateTrendLine = (data: HourlyData[]): number[] => {
  const n = data.length;
  if (n === 0) return [];
  
  const sumX = data.reduce((sum, _, i) => sum + i, 0);
  const sumY = data.reduce((sum, d) => sum + d.total_leads, 0);
  const sumXY = data.reduce((sum, d, i) => sum + i * d.total_leads, 0);
  const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return data.map((_, i) => Math.max(0, slope * i + intercept));
};

const findBestHour = (data: HourlyData[]): { hour: number; leads: number; rate: number } | null => {
  if (data.length === 0) return null;
  
  const best = data.reduce((best, current) => {
    const currentScore = current.total_leads * (1 + current.conversion_rate / 100);
    const bestScore = best.total_leads * (1 + best.conversion_rate / 100);
    return currentScore > bestScore ? current : best;
  });
  
  return {
    hour: best.hour,
    leads: best.total_leads,
    rate: best.conversion_rate
  };
};

export function HourlyProductivityChart({ data, clockIn, clockOut }: HourlyProductivityChartProps) {
  const startHour = clockIn ? parseInt(clockIn.split(':')[0]) : 0;
  const endHour = clockOut ? parseInt(clockOut.split(':')[0]) : 23;
  
  const filledData = fillHourlyGaps(data, startHour, endHour);
  const trendLine = calculateTrendLine(filledData);
  const bestHour = findBestHour(data);
  
  const chartData = filledData.map((d, i) => ({
    ...d,
    hourLabel: `${d.hour.toString().padStart(2, '0')}:00`,
    trend: trendLine[i]
  }));
  
  const totalLeads = data.reduce((sum, d) => sum + d.total_leads, 0);
  const avgPerHour = data.length > 0 ? (totalLeads / data.length).toFixed(1) : '0';
  const avgConversion = data.length > 0 
    ? (data.reduce((sum, d) => sum + d.conversion_rate, 0) / data.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Produtividade por Horário
          </CardTitle>
          <CardDescription>
            Distribuição de fichas e taxa de conversão ao longo do dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="hourLabel" 
                className="text-xs"
                label={{ value: 'Horário', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                yAxisId="left"
                className="text-xs"
                label={{ value: 'Fichas', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                className="text-xs"
                label={{ value: 'Conversão (%)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'conversion_rate') return [`${value}%`, 'Taxa de Conversão'];
                  if (name === 'total_leads') return [value, 'Total de Fichas'];
                  if (name === 'confirmed_leads') return [value, 'Fichas Confirmadas'];
                  if (name === 'trend') return [value.toFixed(1), 'Tendência'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="total_leads" 
                fill="hsl(var(--primary))" 
                name="Total de Fichas"
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                yAxisId="left"
                dataKey="confirmed_leads" 
                fill="hsl(var(--secondary))" 
                name="Confirmadas"
                radius={[8, 8, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="conversion_rate" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                name="Taxa de Conversão"
                dot={{ r: 4 }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="trend" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Tendência"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bestHour && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Melhor Horário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bestHour.hour.toString().padStart(2, '0')}:00</div>
              <p className="text-xs text-muted-foreground mt-1">
                {bestHour.leads} fichas ({bestHour.rate}% conversão)
              </p>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-secondary" />
              Média por Hora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPerHour}</div>
            <p className="text-xs text-muted-foreground mt-1">
              fichas por hora trabalhada
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" />
              Conversão Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConversion}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              taxa de conversão geral
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
