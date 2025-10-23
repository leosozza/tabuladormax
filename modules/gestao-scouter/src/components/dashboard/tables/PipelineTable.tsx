
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Workflow } from "lucide-react";

interface PipelineData {
  projeto: string;
  aguardando: number;
  confirmadas: number;
  naoConfirmadas: number;
  total: number;
  taxaConversao: number;
  tempoMedioConfirmacao: number; // em horas
}

interface PipelineTableProps {
  data: PipelineData[];
  isLoading?: boolean;
}

export const PipelineTable = ({ data, isLoading }: PipelineTableProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            Pipeline de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const getTaxaBadge = (taxa: number) => {
    if (taxa >= 70) return <Badge className="bg-success text-success-foreground">Excelente</Badge>;
    if (taxa >= 50) return <Badge variant="secondary">Bom</Badge>;
    if (taxa >= 30) return <Badge variant="outline">Regular</Badge>;
    return <Badge variant="destructive">Crítico</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="w-5 h-5" />
          Pipeline de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead className="text-right">Aguardando</TableHead>
              <TableHead className="text-right">Confirmadas</TableHead>
              <TableHead className="text-right">Não Confirmadas</TableHead>
              <TableHead className="text-center">Taxa Conversão</TableHead>
              <TableHead className="text-right">Tempo Médio (h)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((pipeline) => (
              <TableRow key={pipeline.projeto}>
                <TableCell className="font-medium max-w-48 truncate" title={pipeline.projeto}>
                  {pipeline.projeto}
                </TableCell>
                <TableCell className="text-right">
                  <span className={pipeline.aguardando > 50 ? 'text-warning' : ''}>
                    {pipeline.aguardando}
                  </span>
                </TableCell>
                <TableCell className="text-right text-success font-medium">
                  {pipeline.confirmadas}
                </TableCell>
                <TableCell className="text-right text-destructive">
                  {pipeline.naoConfirmadas}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center gap-2">
                    <Progress value={pipeline.taxaConversao} className="flex-1" />
                    <span className="text-sm font-medium min-w-12">
                      {pipeline.taxaConversao.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className={pipeline.tempoMedioConfirmacao > 48 ? 'text-warning' : ''}>
                    {pipeline.tempoMedioConfirmacao.toFixed(1)}h
                  </span>
                </TableCell>
                <TableCell>{getTaxaBadge(pipeline.taxaConversao)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
