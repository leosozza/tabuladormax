import { useState, useEffect } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCsvImport, calculateJobStats } from '@/hooks/useCsvImport';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, Loader2, Trash2, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

export default function CsvImport() {
  const { jobs, uploadCsv, isUploading, deleteJob, isDeletingJob } = useCsvImport();
  const [file, setFile] = useState<File | null>(null);
  const [syncWithBitrix, setSyncWithBitrix] = useState(false);
  const [preview, setPreview] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const MAX_FILE_SIZE_MB = 1024; // 1 GB

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tamanho do arquivo
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast.error(
        `Arquivo muito grande (${fileSizeMB.toFixed(1)} MB)`,
        {
          description: `Tamanho máximo: ${MAX_FILE_SIZE_MB} MB. Divida o arquivo em partes menores.`,
          duration: 8000
        }
      );
      e.target.value = '';
      return;
    }

    setFile(selectedFile);

    // Preview otimizado: ler apenas primeiros 100 KB para evitar travar navegador
    try {
      const PREVIEW_SIZE = 100 * 1024; // 100 KB
      const slice = selectedFile.slice(0, PREVIEW_SIZE);
      const text = await slice.text();
      
      const lines = text.split('\n').slice(0, 6);
      const delimiter = lines[0]?.includes(';') ? ';' : ',';
      
      const parsedHeaders = lines[0]?.split(delimiter).map(h => h.trim().replace(/^"|"$/g, '')) || [];
      setHeaders(parsedHeaders);

      const parsedLines = lines.slice(1, 6).map(line => 
        line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''))
      );
      setPreview(parsedLines);
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      toast.error('Não foi possível gerar preview do arquivo');
    }
  };

  const handleUpload = () => {
    if (!file) return;
    uploadCsv.mutate({ file, syncWithBitrix });
    setFile(null);
    setPreview([]);
    setHeaders([]);
  };

  const handleResumeJob = async (jobId: string) => {
    try {
      toast.info('Retomando importação...');
      
      const { error } = await supabase.functions.invoke('resume-csv-import', {
        body: { jobId }
      });

      if (error) throw error;
      
      toast.success('Importação retomada com sucesso');
    } catch (error) {
      console.error('Erro ao retomar job:', error);
      toast.error('Erro ao retomar importação');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      processing: { label: 'Processando', variant: 'default' as const, icon: Loader2 },
      paused: { label: 'Pausado', variant: 'outline' as const, icon: Clock },
      completed: { label: 'Concluído', variant: 'default' as const, icon: CheckCircle },
      completed_with_errors: { label: 'Concluído c/ Erros', variant: 'destructive' as const, icon: AlertCircle },
      failed: { label: 'Falhou', variant: 'destructive' as const, icon: AlertCircle },
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1.5">
        <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  return (
    <AdminPageLayout
      title="Importação CSV"
      description="Importe leads em lote através de arquivos CSV"
    >
      <div className="space-y-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              <CardTitle>Upload de Arquivo CSV</CardTitle>
            </div>
            <CardDescription>
              Selecione um arquivo CSV com os leads para importar
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>Tamanho máximo: 1 GB. Arquivos muito grandes podem levar vários minutos para processar.</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Arquivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sync-bitrix"
                checked={syncWithBitrix}
                onCheckedChange={(checked) => setSyncWithBitrix(checked as boolean)}
                disabled={isUploading}
              />
              <Label 
                htmlFor="sync-bitrix"
                className="text-sm font-normal cursor-pointer"
              >
                Sincronizar automaticamente com Bitrix após importação
              </Label>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Iniciar Importação
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Estimativa de Tempo */}
        {file && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>Tempo Estimado de Processamento</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1 text-sm">
                <p><strong>Até 100 MB:</strong> ~2-5 minutos</p>
                <p><strong>100-500 MB:</strong> ~5-15 minutos</p>
                <p><strong>500 MB - 1 GB:</strong> ~15-30 minutos</p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                ⚠️ Não feche esta aba durante o processamento. O progresso será atualizado automaticamente.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview Section */}
        {preview.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>Preview dos Dados</CardTitle>
              </div>
              <CardDescription>
                Primeiras 5 linhas do arquivo (total de {headers.length} colunas detectadas)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((header, idx) => (
                        <TableHead key={idx} className="font-semibold">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <TableCell key={cellIdx} className="text-sm">
                            {cell || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Jobs History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Importações</CardTitle>
            <CardDescription>
              Acompanhe o status e progresso das importações realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!jobs || jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma importação realizada ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => {
                  const progress = job.total_rows 
                    ? (job.processed_rows / job.total_rows) * 100 
                    : 0;

                  return (
                    <Card key={job.id} className="border shadow-sm">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                <p className="text-sm font-medium truncate">
                                  {job.file_path.split('/').pop()}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {job.created_at && format(
                                  new Date(job.created_at), 
                                  "dd/MM/yyyy 'às' HH:mm",
                                  { locale: ptBR }
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(job.status)}
                              
                              {/* Botão de retomar para jobs pausados */}
                              {job.status === 'paused' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResumeJob(job.id)}
                                  className="gap-1.5"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  Retomar
                                </Button>
                              )}
                              
                              {/* Botão de deletar para jobs finalizados ou pausados */}
                              {['failed', 'completed', 'completed_with_errors', 'paused'].includes(job.status) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm('Deseja realmente remover esta importação do histórico?')) {
                                      deleteJob(job.id);
                                    }
                                  }}
                                  disabled={isDeletingJob}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {job.status === 'processing' && job.total_rows && (
                            <div className="space-y-3">
                              {/* Barra de progresso */}
                              <div className="space-y-2">
                                <Progress 
                                  value={progress} 
                                  className="h-2"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{job.processed_rows?.toLocaleString('pt-BR')} / {job.total_rows.toLocaleString('pt-BR')}</span>
                                  <span>{progress.toFixed(1)}%</span>
                                </div>
                              </div>

                              {/* Estatísticas em tempo real */}
                              {(() => {
                                const stats = calculateJobStats(job);
                                if (!stats) return null;
                                
                                const elapsedMin = stats.elapsedMs / (60 * 1000);
                                const isNearTimeout = elapsedMin >= 4; // 4 minutos = 80% de 5min
                                
                                return (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
                                      <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Velocidade</p>
                                        <p className="text-sm font-semibold">{stats.rate} linhas/seg</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Tempo decorrido</p>
                                        <p className="text-sm font-semibold">{stats.elapsedTime}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Tempo restante</p>
                                        <p className="text-sm font-semibold">{stats.eta}</p>
                                      </div>
                                    </div>

                                    {/* Alerta de timeout próximo */}
                                    {isNearTimeout && (
                                      <Badge variant="outline" className="gap-1.5 w-full justify-center border-warning text-warning">
                                        <Clock className="w-3 h-3 animate-pulse" />
                                        Próximo ao limite de tempo - job será pausado automaticamente
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {job.status === 'paused' && (
                            <div className="space-y-3">
                              <Alert className="border-amber-200 bg-amber-50">
                                <Clock className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-900">Importação Pausada</AlertTitle>
                                <AlertDescription className="text-amber-800 text-sm">
                                  {(job as any).timeout_reason || 'O processamento foi pausado. Use o botão "Retomar" para continuar.'}
                                </AlertDescription>
                              </Alert>
                              
                              <div className="space-y-2">
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-muted-foreground">
                                  Pausado em: {job.processed_rows?.toLocaleString('pt-BR')} linhas ({progress.toFixed(1)}%)
                                </p>
                              </div>
                            </div>
                          )}

                          {(job.status === 'completed' || job.status === 'completed_with_errors') && (
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="space-y-1">
                                <p className="text-2xl font-bold text-green-600">
                                  {job.imported_rows?.toLocaleString('pt-BR') || 0}
                                </p>
                                <p className="text-xs text-muted-foreground">Importados</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-2xl font-bold">
                                  {job.total_rows?.toLocaleString('pt-BR') || 0}
                                </p>
                                <p className="text-xs text-muted-foreground">Total</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-2xl font-bold text-red-600">
                                  {job.error_rows?.toLocaleString('pt-BR') || 0}
                                </p>
                                <p className="text-xs text-muted-foreground">Erros</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  );
}
