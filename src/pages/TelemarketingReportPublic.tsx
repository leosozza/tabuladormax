import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, FileText, Users, Calendar, TrendingUp, AlertCircle, Trophy, CheckCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getReportByShortCode, TelemarketingReportData } from '@/services/telemarketingReportService';
import { ApexBarChart } from '@/components/dashboard/charts/ApexBarChart';
import { ApexHorizontalBarChart } from '@/components/dashboard/charts/ApexHorizontalBarChart';
import { ApexLineChart } from '@/components/dashboard/charts/ApexLineChart';
import { AgendamentosPorDataModal } from '@/components/portal-telemarketing/AgendamentosPorDataModal';
import { ComparecimentosDetailModal } from '@/components/portal-telemarketing/ComparecimentosDetailModal';

export default function TelemarketingReportPublic() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TelemarketingReportData | null>(null);
  
  // Modal states
  const [agendamentosModalOpen, setAgendamentosModalOpen] = useState(false);
  const [comparecimentosModalOpen, setComparecimentosModalOpen] = useState(false);

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

  // Prepare chart data
  const barChartCategories = report.operatorPerformance.map(op => op.name.split(' ')[0]);
  const barChartSeries = [
    { name: 'Agendamentos', data: report.operatorPerformance.map(op => op.agendamentos) },
    { name: 'Leads', data: report.operatorPerformance.map(op => op.leads) },
  ];

  const statusCategories = report.statusDistribution?.map(s => s.status) || [];
  const statusSeries = report.statusDistribution?.map(s => s.count) || [];

  const lineCategories = report.timeline?.map(t => t.date) || [];
  const lineSeries = [
    { name: 'Leads', data: report.timeline?.map(t => t.leads) || [] },
    { name: 'Agendados', data: report.timeline?.map(t => t.agendados) || [] },
  ];

  // Check if drill-down data is available
  const hasAgendamentosDetail = (report.agendamentosPorData?.length || 0) > 0;
  const hasComparecimentosDetail = (report.comparecimentosDetail?.length || 0) > 0;

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-6 sm:w-8 h-6 sm:h-8 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Relatório de Telemarketing</h1>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 sm:w-4 h-3 sm:h-4" />
              {report.date}
            </span>
            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
              {report.periodLabel}
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {/* Total de Leads - não clicável */}
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary">{report.totalLeads}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total de Leads</p>
            </CardContent>
          </Card>
          
          {/* Agendamentos - clicável */}
          <Card 
            className={hasAgendamentosDetail ? "cursor-pointer hover:ring-2 hover:ring-green-500/50 transition-all active:scale-[0.98]" : ""}
            onClick={() => hasAgendamentosDetail && setAgendamentosModalOpen(true)}
          >
            <CardContent className="pt-4 text-center relative">
              <p className="text-xl sm:text-2xl font-bold text-green-500">{report.agendamentos}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Agendamentos</p>
              {hasAgendamentosDetail && (
                <div className="flex items-center justify-center gap-1 mt-1 text-[9px] sm:text-[10px] text-green-500/70">
                  <span>Ver detalhes</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Comparecidos - clicável */}
          <Card 
            className={hasComparecimentosDetail ? "cursor-pointer hover:ring-2 hover:ring-teal-500/50 transition-all active:scale-[0.98]" : ""}
            onClick={() => hasComparecimentosDetail && setComparecimentosModalOpen(true)}
          >
            <CardContent className="pt-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-teal-500">{report.comparecimentos || 0}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Comparecidos</p>
              {hasComparecimentosDetail && (
                <div className="flex items-center justify-center gap-1 mt-1 text-[9px] sm:text-[10px] text-teal-500/70">
                  <span>Ver detalhes</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Taxa de Conversão - não clicável */}
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-amber-500">{report.taxaConversao.toFixed(1)}%</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Taxa de Conversão</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Performance por Operador */}
          {barChartCategories.length > 0 && (
            <ApexBarChart
              title="Performance por Operador"
              categories={barChartCategories}
              series={barChartSeries}
              height={300}
            />
          )}

          {/* Distribuição de Status */}
          {statusCategories.length > 0 && (
            <ApexHorizontalBarChart
              title="Distribuição de Status"
              categories={statusCategories}
              series={statusSeries}
              height={300}
            />
          )}
        </div>

        {/* Timeline de Atividade */}
        {lineCategories.length > 0 && (
          <ApexLineChart
            title={report.period === 'today' ? 'Atividade por Hora' : 'Atividade nos Últimos Dias'}
            categories={lineCategories}
            series={lineSeries}
            height={280}
          />
        )}

        {/* Operator Performance Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Performance por Operador
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead className="text-center">Agendados</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Scouter</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Meta</TableHead>
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
                        {medal} {op.name.split(' ')[0]}
                      </TableCell>
                      <TableCell className="text-center">{op.leads}</TableCell>
                      <TableCell className="text-center text-green-600 font-medium">
                        {op.agendamentos}
                      </TableCell>
                      <TableCell className="text-center text-teal-600 hidden sm:table-cell">{op.leadsScouter || 0}</TableCell>
                      <TableCell className="text-center text-purple-600 hidden sm:table-cell">{op.leadsMeta || 0}</TableCell>
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
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-teal-500" />
                Top 5 Scouters (por Agendamentos)
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Scouter</TableHead>
                    <TableHead className="text-center">Agendamentos</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Leads</TableHead>
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
                        <TableCell className="text-center hidden sm:table-cell">{scouter.totalLeads}</TableCell>
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
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Distribuição de Tabulações
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
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
        <p className="text-center text-[10px] sm:text-xs text-muted-foreground">
          Relatório gerado automaticamente pelo sistema de Telemarketing
        </p>
      </div>

      {/* Modais */}
      <AgendamentosPorDataModal
        open={agendamentosModalOpen}
        onOpenChange={setAgendamentosModalOpen}
        agendamentos={report.agendamentosPorData || []}
        totalAgendamentos={report.agendamentos}
      />

      <ComparecimentosDetailModal
        open={comparecimentosModalOpen}
        onOpenChange={setComparecimentosModalOpen}
        comparecimentos={report.comparecimentosDetail || []}
        totalComparecimentos={report.comparecimentos || 0}
      />
    </div>
  );
}