import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, AlertCircle, Clock, Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticResult {
  timestamp: string;
  overall_status: 'ok' | 'warning' | 'error';
  tests: {
    environment: TestResult;
    connectivity: TestResult;
    authentication: TestResult;
    tables: TestResult;
    permissions: TestResult;
    data_structure: TestResult;
  };
  recommendations: string[];
  errors: string[];
}

interface TestResult {
  status: 'ok' | 'warning' | 'error' | 'skipped';
  message: string;
  details?: any;
  duration_ms?: number;
}

interface DiagnosticModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: DiagnosticResult | null;
}

export function DiagnosticModal({ open, onOpenChange, result }: DiagnosticModalProps) {
  const { toast } = useToast();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'skipped':
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline">UNKNOWN</Badge>;
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ok: 'default',
      warning: 'secondary',
      error: 'destructive',
      skipped: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      toast({
        title: 'Copiado!',
        description: 'Resultado do diagnóstico copiado para área de transferência',
      });
    }
  };

  const exportAsJSON = () => {
    if (result) {
      const dataStr = JSON.stringify(result, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diagnostic-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportado!',
        description: 'Resultado do diagnóstico exportado como JSON',
      });
    }
  };

  const exportAsPDF = async () => {
    if (!result) return;

    try {
      // Dynamic import to avoid bundling jspdf unless needed
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      let yPos = 20;
      const lineHeight = 7;
      const pageHeight = doc.internal.pageSize.height;

      // Title
      doc.setFontSize(16);
      doc.text('Relatório de Diagnóstico TabuladorMax', 20, yPos);
      yPos += lineHeight * 2;

      // Timestamp
      doc.setFontSize(10);
      doc.text(`Data: ${new Date(result.timestamp).toLocaleString('pt-BR')}`, 20, yPos);
      yPos += lineHeight;
      doc.text(`Status Geral: ${result.overall_status.toUpperCase()}`, 20, yPos);
      yPos += lineHeight * 2;

      // Tests
      doc.setFontSize(14);
      doc.text('Resultados dos Testes:', 20, yPos);
      yPos += lineHeight;

      doc.setFontSize(10);
      Object.entries(result.tests).forEach(([testName, testResult]) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(`• ${testName}: ${testResult.status}`, 25, yPos);
        yPos += lineHeight;
        doc.text(`  ${testResult.message}`, 30, yPos);
        yPos += lineHeight;
        
        if (testResult.duration_ms) {
          doc.text(`  Tempo: ${testResult.duration_ms}ms`, 30, yPos);
          yPos += lineHeight;
        }
        yPos += lineHeight / 2;
      });

      // Recommendations
      if (result.recommendations.length > 0) {
        yPos += lineHeight;
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Recomendações:', 20, yPos);
        yPos += lineHeight;

        doc.setFontSize(10);
        result.recommendations.forEach((rec, idx) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${idx + 1}. ${rec}`, 25, yPos);
          yPos += lineHeight;
        });
      }

      // Errors
      if (result.errors.length > 0) {
        yPos += lineHeight;
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Erros Encontrados:', 20, yPos);
        yPos += lineHeight;

        doc.setFontSize(10);
        result.errors.forEach((err, idx) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${idx + 1}. ${err}`, 25, yPos);
          yPos += lineHeight;
        });
      }

      doc.save(`diagnostic-${new Date().toISOString()}.pdf`);

      toast({
        title: 'Exportado!',
        description: 'Relatório exportado como PDF',
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar o relatório como PDF',
        variant: 'destructive',
      });
    }
  };

  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Resultado do Diagnóstico</DialogTitle>
              <DialogDescription>
                Executado em {new Date(result.timestamp).toLocaleString('pt-BR')}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={exportAsJSON}>
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={exportAsPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall Status */}
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            {getStatusIcon(result.overall_status)}
            <div className="flex-1">
              <h3 className="font-semibold">Status Geral</h3>
              <p className="text-sm text-muted-foreground">
                {result.overall_status === 'ok' && 'Todos os testes passaram com sucesso'}
                {result.overall_status === 'warning' && 'Alguns avisos foram encontrados'}
                {result.overall_status === 'error' && 'Problemas críticos detectados'}
              </p>
            </div>
            {getStatusBadge(result.overall_status)}
          </div>

          {/* Tabs for different sections */}
          <Tabs defaultValue="tests" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tests">Testes</TabsTrigger>
              <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
            </TabsList>

            {/* Tests Tab */}
            <TabsContent value="tests" className="space-y-3">
              {Object.entries(result.tests).map(([testName, testResult]) => (
                <div key={testName} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(testResult.status)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium capitalize">
                          {testName.replace(/_/g, ' ')}
                        </h4>
                        {getStatusBadge(testResult.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {testResult.message}
                      </p>
                      {testResult.duration_ms && (
                        <p className="text-xs text-muted-foreground">
                          ⏱️ Tempo de execução: {testResult.duration_ms}ms
                        </p>
                      )}
                      {testResult.details && (
                        <div className="mt-2 p-3 bg-muted rounded text-xs font-mono overflow-x-auto">
                          <pre>{JSON.stringify(testResult.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-3">
              {result.recommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma recomendação disponível
                </p>
              ) : (
                <div className="space-y-2">
                  {result.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-muted rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <p className="text-sm flex-1">{rec}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-3">
              {result.errors.length > 0 && (
                <div className="border border-destructive rounded-lg p-4">
                  <h4 className="font-medium text-destructive mb-3">
                    Erros Encontrados
                  </h4>
                  <div className="space-y-2">
                    {result.errors.map((error, idx) => (
                      <div key={idx} className="flex gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Informações Técnicas</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span className="font-mono">{result.timestamp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status Geral:</span>
                    <span className="font-mono">{result.overall_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de Testes:</span>
                    <span className="font-mono">{Object.keys(result.tests).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Testes Passados:</span>
                    <span className="font-mono">
                      {Object.values(result.tests).filter(t => t.status === 'ok').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avisos:</span>
                    <span className="font-mono">
                      {Object.values(result.tests).filter(t => t.status === 'warning').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Erros:</span>
                    <span className="font-mono">
                      {Object.values(result.tests).filter(t => t.status === 'error').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">JSON Completo</h4>
                <div className="p-3 bg-muted rounded text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
