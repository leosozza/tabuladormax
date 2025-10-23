
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2 } from "lucide-react";

interface ProjectData {
  projeto: string;
  meta: number;
  progresso: number;
  esperado: number;
  delta: number;
  status: 'on-track' | 'warning' | 'critical';
  roi: number;
  percentConcluido: number;
}

interface ProjectTableProps {
  data: ProjectData[];
  isLoading?: boolean;
}

export const ProjectTable = ({ data, isLoading }: ProjectTableProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Status dos Projetos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on-track':
        return <Badge className="bg-success text-success-foreground">No Prazo</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-warning text-warning">Atenção</Badge>;
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Status dos Projetos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">Progresso</TableHead>
              <TableHead className="text-right">Esperado</TableHead>
              <TableHead className="text-right">Delta</TableHead>
              <TableHead className="text-center">% Concluído</TableHead>
              <TableHead className="text-right">ROI</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((projeto) => (
              <TableRow key={projeto.projeto}>
                <TableCell className="font-medium max-w-48 truncate" title={projeto.projeto}>
                  {projeto.projeto}
                </TableCell>
                <TableCell className="text-right">{projeto.meta.toLocaleString('pt-BR')}</TableCell>
                <TableCell className="text-right">{projeto.progresso.toLocaleString('pt-BR')}</TableCell>
                <TableCell className="text-right">{projeto.esperado.toLocaleString('pt-BR')}</TableCell>
                <TableCell className={`text-right font-medium ${projeto.delta >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {projeto.delta > 0 ? '+' : ''}{projeto.delta.toLocaleString('pt-BR')}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center gap-2">
                    <Progress value={projeto.percentConcluido} className="flex-1" />
                    <span className="text-sm font-medium min-w-12">
                      {projeto.percentConcluido.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{projeto.roi.toFixed(1)}x</TableCell>
                <TableCell>{getStatusBadge(projeto.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
