import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, FileText, Users, Calendar, TrendingUp, AlertCircle, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getReportByShortCode, TelemarketingReportData } from '@/services/telemarketingReportService';

export default function TelemarketingReportPublic() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TelemarketingReportData | null>(null);

  useEffect(() => {
    async function loadReport() {
      if (!shortCode) {
        setError('Código do relatório não fornecido');
        setLoading(false);
        return;
      }

      const result = await getReportByShortCode(shortCode);
      
      if (result.success && result.data) {
        setReport(result.data);
      } else {
        setError(result.error || 'Relatório não encontrado ou expirado');
      }
      setLoading(false);
    }

    loadReport();
  }, [shortCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Relatório Indisponível</h2>
            <p className="text-muted-foreground">
              {error || 'Este relatório não existe ou expirou.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Relatório de Telemarketing</h1>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {report.date}
            </span>
            <span className="bg-primary/10 text-primary px-2 py-1 rounded">
              {report.periodLabel}
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-primary">{report.totalLeads}</p>
              <p className="text-xs text-muted-foreground">Total de Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-500">{report.agendamentos}</p>
              <p className="text-xs text-muted-foreground">Agendamentos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{report.taxaConversao.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
            </CardContent>
          </Card>
        </div>

        {/* Operator Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Performance por Operador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead className="text-center">Agendados</TableHead>
                  <TableHead className="text-center">Scouter</TableHead>
                  <TableHead className="text-center">Meta</TableHead>
                  <TableHead className="text-center">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.operatorPerformance.map((op, idx) => {
                  const taxa = op.leads > 0 ? ((op.agendamentos / op.leads) * 100).toFixed(1) : '0.0';
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
                  return (
                    <TableRow key={op.name}>
                      <TableCell className="font-medium">
                        {medal} {op.name}
                      </TableCell>
                      <TableCell className="text-center">{op.leads}</TableCell>
                      <TableCell className="text-center text-green-600 font-medium">
                        {op.agendamentos}
                      </TableCell>
                      <TableCell className="text-center text-teal-600">{op.leadsScouter || 0}</TableCell>
                      <TableCell className="text-center text-purple-600">{op.leadsMeta || 0}</TableCell>
                      <TableCell className="text-center">{taxa}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top 5 Scouters */}
        {report.scouterPerformance && report.scouterPerformance.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-teal-500" />
                Top 5 Scouters (por Agendamentos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scouter</TableHead>
                    <TableHead className="text-center">Agendamentos</TableHead>
                    <TableHead className="text-center">Leads</TableHead>
                    <TableHead className="text-center">Conversão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.scouterPerformance.map((scouter, idx) => {
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
                    return (
                      <TableRow key={scouter.name}>
                        <TableCell className="font-medium">{medal} {scouter.name}</TableCell>
                        <TableCell className="text-center text-teal-600 font-bold">{scouter.agendamentos}</TableCell>
                        <TableCell className="text-center">{scouter.totalLeads}</TableCell>
                        <TableCell className="text-center">{scouter.taxaConversao.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tabulacao Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Distribuição de Tabulações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.tabulacaoDistribution.map((item) => (
                  <TableRow key={item.label}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell className="text-center">{item.count}</TableCell>
                    <TableCell className="text-center">{item.percentage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Relatório gerado automaticamente pelo sistema de Telemarketing
        </p>
      </div>
    </div>
  );
}
