
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface ScouterData {
  scouter: string;
  leads: number;
  mediaDia: number;
  diasPagos: number;
  ajudaCusto: number;
  pagamentoFichas: number;
  total: number;
  percentFoto: number;
  percentConfirmacao: number;
  score: number;
}

interface ScouterTableProps {
  data: ScouterData[];
  isLoading?: boolean;
}

export const ScouterTable = ({ data, isLoading }: ScouterTableProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Performance por Scouter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-success text-success-foreground">Excelente</Badge>;
    if (score >= 60) return <Badge variant="secondary">Bom</Badge>;
    if (score >= 40) return <Badge variant="outline">Regular</Badge>;
    return <Badge variant="destructive">Atenção</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Performance por Scouter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scouter</TableHead>
              <TableHead className="text-right">Fichas</TableHead>
              <TableHead className="text-right">Média/Dia</TableHead>
              <TableHead className="text-right">Dias Pagos</TableHead>
              <TableHead className="text-right">Ajuda Custo</TableHead>
              <TableHead className="text-right">Pag. Leads</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">% Foto</TableHead>
              <TableHead className="text-right">% Confirm.</TableHead>
              <TableHead>Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((scouter) => (
              <TableRow key={scouter.scouter}>
                <TableCell className="font-medium">{scouter.scouter}</TableCell>
                <TableCell className="text-right">{scouter.leads || 0}</TableCell>
                <TableCell className="text-right">{(scouter.mediaDia || 0).toFixed(1)}</TableCell>
                <TableCell className="text-right">{scouter.diasPagos || 0}</TableCell>
                <TableCell className="text-right">
                  R$ {(scouter.ajudaCusto || 0).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  R$ {(scouter.pagamentoFichas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  R$ {(scouter.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">{(scouter.percentFoto || 0).toFixed(1)}%</TableCell>
                <TableCell className="text-right">{(scouter.percentConfirmacao || 0).toFixed(1)}%</TableCell>
                <TableCell>{getScoreBadge(scouter.score || 0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
