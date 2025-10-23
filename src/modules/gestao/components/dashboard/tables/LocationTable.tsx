
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

interface LocationData {
  local: string;
  leads: number;
  fichas: number; // alias para compatibilidade
  percentFoto: number;
  percentConfirmacao: number;
  scouters: string[];
  lat?: number;
  lon?: number;
}

interface LocationTableProps {
  data: LocationData[];
  isLoading?: boolean;
}

export const LocationTable = ({ data, isLoading }: LocationTableProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Análise por Local
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 80) return <Badge className="bg-success text-success-foreground">Excelente</Badge>;
    if (percentage >= 60) return <Badge variant="secondary">Bom</Badge>;
    if (percentage >= 40) return <Badge variant="outline">Regular</Badge>;
    return <Badge variant="destructive">Atenção</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Análise por Local
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Fichas</TableHead>
              <TableHead className="text-right">% Foto</TableHead>
              <TableHead className="text-right">% Confirmação</TableHead>
              <TableHead>Scouters</TableHead>
              <TableHead>Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((local, index) => (
              <TableRow key={`${local.local}-${index}`}>
                <TableCell className="font-medium max-w-48 truncate" title={local.local}>
                  {local.local}
                </TableCell>
                <TableCell className="text-right">{local.fichas}</TableCell>
                <TableCell className="text-right">{local.percentFoto.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{local.percentConfirmacao.toFixed(1)}%</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {local.scouters.slice(0, 3).map(scouter => (
                      <Badge key={scouter} variant="outline" className="text-xs">
                        {scouter}
                      </Badge>
                    ))}
                    {local.scouters.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{local.scouters.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getPerformanceBadge((local.percentFoto + local.percentConfirmacao) / 2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
