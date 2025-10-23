import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Row = {
  created_at?: string;
  data_criacao_ficha?: string;
  criado?: string;
  [key: string]: any;
};

type Props = {
  startDate: Date;
  endDate: Date;
  rows: Row[];
  height?: number;
};

export function LeadsPorDiaChart({ startDate, endDate, rows, height = 280 }: Props) {
  const chartData = useMemo(() => {
    // Criar mapa de contagem por data
    const countByDate = new Map<string, number>();
    
    for (const row of rows) {
      let dateStr = row.data_criacao_ficha ?? row.created_at ?? row.criado ?? "";
      
      // Se for formato brasileiro (dd/MM/yyyy), converter para ISO (yyyy-MM-dd)
      if (dateStr.includes("/")) {
        const [day, month, year] = dateStr.split(" ")[0].split("/");
        if (day && month && year) {
          dateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
      } else {
        dateStr = dateStr.slice(0, 10);
      }
      
      if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        countByDate.set(dateStr, (countByDate.get(dateStr) ?? 0) + 1);
      }
    }

    // Gerar todos os dias do intervalo
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    return allDays.map(day => {
      const isoDate = format(day, "yyyy-MM-dd");
      return {
        date: format(day, "dd/MM", { locale: ptBR }),
        fullDate: isoDate,
        leads: countByDate.get(isoDate) ?? 0
      };
    });
  }, [startDate, endDate, rows]);

  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    
    // Validar se value é um número válido
    if (isNaN(value) || value === null || value === undefined) {
      return null;
    }
    
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill="hsl(var(--foreground))"
        textAnchor="middle"
        fontSize="12"
        fontWeight="500"
      >
        {value}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 25, right: 10, left: 10, bottom: 5 }}>
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
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
          labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
        />
        <Bar 
          dataKey="leads" 
          fill="hsl(var(--primary))" 
          radius={[4, 4, 0, 0]}
        >
          <LabelList content={renderCustomizedLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
