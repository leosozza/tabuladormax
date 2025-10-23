import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LinearProjectionData {
  periodo: {
    inicio: string;
    fim: string;
    hoje_limite: string;
    dias_passados: number;
    dias_restantes: number;
    dias_totais: number;
  };
  realizado: {
    leads: number;
    valor: number;
  };
  projetado_restante: {
    leads: number;
    valor: number;
  };
  total_projetado: {
    leads: number;
    valor: number;
  };
  media_diaria: number;
  valor_medio_por_ficha: number;
}

interface ProjectionTableProps {
  data: LinearProjectionData;
  projectionType: 'scouter' | 'projeto';
  selectedFilter?: string;
}

export function ProjectionTable({ data, projectionType, selectedFilter }: ProjectionTableProps) {
  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtNumber = new Intl.NumberFormat('pt-BR');

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>
          Resumo da Projeção Linear
          {selectedFilter && ` - ${projectionType === 'scouter' ? 'Scouter' : 'Projeto'}: ${selectedFilter}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead className="text-center">Período</TableHead>
                <TableHead className="text-right">Fichas</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Realizado</TableCell>
                <TableCell className="text-center">
                  {new Date(data.periodo.inicio).toLocaleDateString('pt-BR')} - {new Date(data.periodo.hoje_limite).toLocaleDateString('pt-BR')}
                  <br />
                  <span className="text-xs text-muted-foreground">({data.periodo.dias_passados} dias)</span>
                </TableCell>
                <TableCell className="text-right font-semibold text-blue-600">
                  {fmtNumber.format(data.realizado.leads)}
                </TableCell>
                <TableCell className="text-right font-semibold text-blue-600">
                  {fmtBRL.format(data.realizado.valor)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Confirmado
                  </Badge>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium">Projeção Restante</TableCell>
                <TableCell className="text-center">
                  {new Date(data.periodo.hoje_limite).toLocaleDateString('pt-BR')} - {new Date(data.periodo.fim).toLocaleDateString('pt-BR')}
                  <br />
                  <span className="text-xs text-muted-foreground">({data.periodo.dias_restantes} dias)</span>
                </TableCell>
                <TableCell className="text-right font-semibold text-orange-600">
                  {fmtNumber.format(data.projetado_restante.leads)}
                </TableCell>
                <TableCell className="text-right font-semibold text-orange-600">
                  {fmtBRL.format(data.projetado_restante.valor)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="border-orange-200 text-orange-600">
                    Estimado
                  </Badge>
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">Total Projetado</TableCell>
                <TableCell className="text-center font-medium">
                  {new Date(data.periodo.inicio).toLocaleDateString('pt-BR')} - {new Date(data.periodo.fim).toLocaleDateString('pt-BR')}
                  <br />
                  <span className="text-xs text-muted-foreground">({data.periodo.dias_totais} dias)</span>
                </TableCell>
                <TableCell className="text-right font-bold text-lg text-green-600">
                  {fmtNumber.format(data.total_projetado.leads)}
                </TableCell>
                <TableCell className="text-right font-bold text-lg text-green-600">
                  {fmtBRL.format(data.total_projetado.valor)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-green-100 text-green-800">
                    Total
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-semibold">Métricas Calculadas:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Média diária: <strong>{data.media_diaria.toFixed(1)} leads/dia</strong></li>
              <li>• Valor médio por ficha: <strong>{fmtBRL.format(data.valor_medio_por_ficha)}</strong></li>
              <li>• Taxa diária estimada: <strong>{((data.media_diaria / data.periodo.dias_passados) * 100).toFixed(1)}%</strong></li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Filtros Aplicados:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Tipo: <strong>{projectionType === 'scouter' ? 'Por Scouter' : 'Por Projeto'}</strong></li>
              <li>• Filtro: <strong>{selectedFilter || 'Todos'}</strong></li>
              <li>• Base de cálculo: <strong>Performance linear</strong></li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}