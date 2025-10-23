
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface IntervalData {
  scouter: string;
  mediaMinutos: number;
  intervalos: {
    curtos: number; // <5min
    medios: number; // 5-20min
    longos: number; // >20min
  };
  percentCurtos: number;
  eficiencia: 'alta' | 'media' | 'baixa';
}

interface IntervalTableProps {
  data: IntervalData[];
  isLoading?: boolean;
}

export const IntervalTable = ({ data, isLoading }: IntervalTableProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Análise de Intervalos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const getEficienciaBadge = (eficiencia: string) => {
    switch (eficiencia) {
      case 'alta':
        return <Badge className="bg-success text-success-foreground">Alta</Badge>;
      case 'media':
        return <Badge variant="secondary">Média</Badge>;
      case 'baixa':
        return <Badge variant="destructive">Baixa</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Análise de Intervalos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scouter</TableHead>
              <TableHead className="text-right">Média (min)</TableHead>
              <TableHead className="text-right">Curtos (&lt;5min)</TableHead>
              <TableHead className="text-right">Médios (5-20min)</TableHead>
              <TableHead className="text-right">Longos (&gt;20min)</TableHead>
              <TableHead className="text-right">% Curtos</TableHead>
              <TableHead>Eficiência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.scouter}>
                <TableCell className="font-medium">{item.scouter}</TableCell>
                <TableCell className="text-right">{item.mediaMinutos.toFixed(1)}</TableCell>
                <TableCell className="text-right">{item.intervalos.curtos}</TableCell>
                <TableCell className="text-right">{item.intervalos.medios}</TableCell>
                <TableCell className="text-right">{item.intervalos.longos}</TableCell>
                <TableCell className="text-right">
                  <span className={item.percentCurtos >= 60 ? 'text-success' : item.percentCurtos >= 30 ? 'text-warning' : 'text-destructive'}>
                    {item.percentCurtos.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell>{getEficienciaBadge(item.eficiencia)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
