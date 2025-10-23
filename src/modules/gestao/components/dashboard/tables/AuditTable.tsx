
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface AuditData {
  id: string;
  scouter: string;
  projeto: string;
  dataFicha: string;
  problema: string;
  severidade: 'high' | 'medium' | 'low';
  detalhes: string;
}

interface AuditTableProps {
  data: AuditData[];
  isLoading?: boolean;
}

export const AuditTable = ({ data, isLoading }: AuditTableProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Auditoria de Qualidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const getSeverityBadge = (severidade: string) => {
    switch (severidade) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-warning text-warning">Média</Badge>;
      case 'low':
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Auditoria de Qualidade
          {data.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {data.length} issue{data.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum problema de qualidade detectado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Ficha</TableHead>
                <TableHead>Scouter</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Problema</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={`${item.id}-${item.problema}`}>
                  <TableCell className="font-mono text-sm">{item.id}</TableCell>
                  <TableCell>{item.scouter}</TableCell>
                  <TableCell className="max-w-32 truncate" title={item.projeto}>
                    {item.projeto}
                  </TableCell>
                  <TableCell>{item.dataFicha}</TableCell>
                  <TableCell>{item.problema}</TableCell>
                  <TableCell>{getSeverityBadge(item.severidade)}</TableCell>
                  <TableCell className="max-w-48 truncate" title={item.detalhes}>
                    {item.detalhes}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
