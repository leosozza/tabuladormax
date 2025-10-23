import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, XCircle, Loader2, Clock, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_FICHAS_MAPPINGS, FieldMapping } from '@/config/fieldMappings';
import { ColumnMappingDragDrop } from './ColumnMappingDragDrop';
import { findBestMatch } from '@/utils/stringSimilarity';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ColumnMappingWithPriority } from '@/hooks/useColumnMapping';

interface WizardStep {
  step: 'upload' | 'mapping' | 'processing';
  csvHeaders: string[];
  sampleData: string[][];
  columnMapping: ColumnMappingWithPriority;
  fileName?: string;
  fileSize?: number;
  file?: File;
}

interface ProcessingProgress {
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  total_rows: number;
  processed_rows: number;
  inserted_rows: number;
  failed_rows: number;
  errors: Array<{ row: number; data: any; error: string }>;
  error_message?: string;
  started_at: Date;
}

interface CsvImportWizardProps {
  open: boolean;
  onClose: () => void;
}

export function CsvImportWizard({ open, onClose }: CsvImportWizardProps) {
  const [wizardState, setWizardState] = useState<WizardStep>({
    step: 'upload',
    csvHeaders: [],
    sampleData: [],
    columnMapping: {},
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);

  const handleFileUpload = async (file: File) => {
    try {
      setUploadingFile(true);
      toast.info('Analisando arquivo CSV...');

      Papa.parse(file, {
        preview: 10,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            toast.error('Arquivo CSV vazio');
            setUploadingFile(false);
            return;
          }

          const headers = results.data[0] as string[];
          const sampleData = results.data.slice(1) as string[][];

          // Auto-map columns com algoritmo inteligente
          const autoMapping: ColumnMappingWithPriority = {};
          const availableFields = DEFAULT_FICHAS_MAPPINGS.map(m => ({
            name: m.supabaseField,
            aliases: m.legacyAliases
          }));

          headers.forEach(csvHeader => {
            const match = findBestMatch(csvHeader, availableFields, 0.6);
            if (match) {
              autoMapping[match.field] = { primary: csvHeader };
            }
          });

          setWizardState({
            step: 'mapping',
            csvHeaders: headers,
            sampleData,
            columnMapping: autoMapping,
            fileName: file.name,
            fileSize: file.size,
            file
          });

          toast.success(`${Object.keys(autoMapping).length} campos auto-mapeados!`);
          setUploadingFile(false);
        },
        error: (error) => {
          toast.error(`Erro ao ler CSV: ${error.message}`);
          setUploadingFile(false);
        }
      });
    } catch (error: any) {
      toast.error(error.message);
      setUploadingFile(false);
    }
  };

  const handleAutoMap = () => {
    const autoMapping: ColumnMappingWithPriority = {};
    const mappingResults: { exact: number; high: number; contextual: number } = { 
      exact: 0, 
      high: 0, 
      contextual: 0 
    };

    // Preparar campos disponíveis com aliases
    const availableFields = DEFAULT_FICHAS_MAPPINGS.map(m => ({
      name: m.supabaseField,
      aliases: m.legacyAliases
    }));

    wizardState.csvHeaders.forEach(csvHeader => {
      const match = findBestMatch(csvHeader, availableFields, 0.6);
      
      if (match) {
        autoMapping[match.field] = { primary: csvHeader };
        
        // Contabilizar tipo de match
        if (match.matchType === 'exact') mappingResults.exact++;
        else if (match.matchType === 'high') mappingResults.high++;
        else if (match.matchType === 'contextual') mappingResults.contextual++;
      }
    });

    setWizardState(prev => ({ ...prev, columnMapping: autoMapping }));
    
    const total = Object.keys(autoMapping).length;
    const details = [
      mappingResults.exact > 0 ? `${mappingResults.exact} exato${mappingResults.exact > 1 ? 's' : ''}` : '',
      mappingResults.high > 0 ? `${mappingResults.high} similar${mappingResults.high > 1 ? 'es' : ''}` : '',
      mappingResults.contextual > 0 ? `${mappingResults.contextual} contextual${mappingResults.contextual > 1 ? 'is' : ''}` : ''
    ].filter(Boolean).join(', ');
    
    toast.success(`${total} campo${total !== 1 ? 's' : ''} mapeado${total !== 1 ? 's' : ''} (${details})`);
  };

  const mapRowToLead = (row: any, mapping: ColumnMappingWithPriority) => {
    const lead: any = {};
    
    Object.entries(mapping).forEach(([targetField, priorities]) => {
      const value = priorities.primary ? row[priorities.primary] : 
                    priorities.secondary ? row[priorities.secondary] : 
                    priorities.tertiary ? row[priorities.tertiary] : null;
      
      if (value !== null && value !== undefined && value !== '') {
        lead[targetField] = value;
      }
    });
    
    return lead;
  };

  const handleMappingConfirm = async () => {
    if (Object.keys(wizardState.columnMapping).length === 0) {
      toast.error('Mapeie pelo menos uma coluna');
      return;
    }

    if (!wizardState.file) {
      toast.error('Arquivo não encontrado');
      return;
    }

    // Iniciar processamento
    setWizardState(prev => ({ ...prev, step: 'processing' }));
    setCancelRequested(false);

    const progressState: ProcessingProgress = {
      status: 'processing',
      total_rows: 0,
      processed_rows: 0,
      inserted_rows: 0,
      failed_rows: 0,
      errors: [],
      started_at: new Date()
    };
    setProgress(progressState);

    toast.info('Processando CSV...');

    Papa.parse(wizardState.file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        progressState.total_rows = rows.length;
        setProgress({ ...progressState });

        const CHUNK_SIZE = 100; // Reduzir para melhor granularidade de erros
        
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          // Verificar cancelamento
          if (cancelRequested) {
            progressState.status = 'cancelled';
            progressState.error_message = 'Cancelado pelo usuário';
            setProgress({ ...progressState });
            toast.info('Importação cancelada');
            return;
          }

          const chunk = rows.slice(i, i + CHUNK_SIZE);
          
          // Inserir registro por registro para capturar erros específicos
          for (let j = 0; j < chunk.length; j++) {
            const rowIndex = i + j + 2; // +2 porque: +1 para linha do Excel, +1 para header
            const row = chunk[j];
            const record = mapRowToLead(row, wizardState.columnMapping);

            try {
              const { error } = await supabase
                .from('leads')
                .insert([record]);

              if (error) {
                progressState.failed_rows++;
                progressState.errors.push({
                  row: rowIndex,
                  data: record,
                  error: error.message
                });
              } else {
                progressState.inserted_rows++;
              }
            } catch (err: any) {
              progressState.failed_rows++;
              progressState.errors.push({
                row: rowIndex,
                data: record,
                error: err.message
              });
            }

            progressState.processed_rows++;
            
            // Atualizar UI a cada 10 registros
            if (progressState.processed_rows % 10 === 0) {
              setProgress({ ...progressState });
            }
          }

          setProgress({ ...progressState });
        }

        // Finalizar
        progressState.status = progressState.failed_rows === progressState.total_rows ? 'failed' : 'completed';
        if (progressState.status === 'failed') {
          progressState.error_message = 'Todos os registros falharam';
        }
        setProgress({ ...progressState });

        if (progressState.status === 'completed') {
          toast.success(`Importação concluída! ${progressState.inserted_rows} registros inseridos.`);
        } else {
          toast.error('Importação falhou. Verifique os erros.');
        }
      },
      error: (error) => {
        progressState.status = 'failed';
        progressState.error_message = error.message;
        setProgress({ ...progressState });
        toast.error(`Erro ao processar CSV: ${error.message}`);
      }
    });
  };

  const handleCancelImport = () => {
    setCancelRequested(true);
    setShowCancelDialog(false);
  };

  const handleClose = () => {
    // Não permitir fechar enquanto processa
    if (progress?.status === 'processing') {
      toast.warning('Aguarde o processamento terminar ou cancele a importação');
      return;
    }
    
    setWizardState({ step: 'upload', csvHeaders: [], sampleData: [], columnMapping: {} });
    setUploadingFile(false);
    setProgress(null);
    setCancelRequested(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importação de Leads via CSV
            </DialogTitle>
            <DialogDescription>
              {wizardState.step === 'upload' && 'Selecione um arquivo CSV'}
              {wizardState.step === 'mapping' && 'Configure o mapeamento de colunas'}
              {wizardState.step === 'processing' && 'Acompanhe o progresso'}
            </DialogDescription>
          </DialogHeader>

          {/* Upload Step */}
          {wizardState.step === 'upload' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4 py-8">
                  <Upload className="h-16 w-16 text-muted-foreground" />
                  <p className="text-lg font-medium">Selecione um arquivo CSV</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload">
                    <Button asChild disabled={uploadingFile}>
                      <span>
                        {uploadingFile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Selecionar Arquivo
                      </span>
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mapping Step */}
          {wizardState.step === 'mapping' && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{wizardState.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {wizardState.csvHeaders.length} colunas detectadas
                </p>
              </div>

              <ColumnMappingDragDrop
                csvHeaders={wizardState.csvHeaders}
                mapping={wizardState.columnMapping}
                onMappingChange={(mapping) => setWizardState(prev => ({ ...prev, columnMapping: mapping }))}
                onAutoMap={handleAutoMap}
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={handleMappingConfirm}>
                  Iniciar Importação
                </Button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {wizardState.step === 'processing' && progress && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  {progress.status === 'processing' ? (
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  ) : progress.status === 'completed' ? (
                    <CheckCircle2 className="h-16 w-16 text-green-600" />
                  ) : progress.status === 'cancelled' ? (
                    <XCircle className="h-16 w-16 text-yellow-600" />
                  ) : (
                    <XCircle className="h-16 w-16 text-red-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {progress.status === 'processing' ? 'Processando no navegador' :
                     progress.status === 'completed' ? 'Concluído' :
                     progress.status === 'cancelled' ? 'Cancelado' : 'Falhou'}
                  </h3>
                  <p className="text-sm text-muted-foreground">{wizardState.fileName}</p>
                </div>
              </div>

              {progress.total_rows > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{progress.processed_rows} / {progress.total_rows}</span>
                  </div>
                  <Progress value={(progress.processed_rows / progress.total_rows) * 100} />
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Total</div>
                      <div className="font-medium">{progress.total_rows}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Inseridos</div>
                      <div className="font-medium text-green-600">{progress.inserted_rows}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Falharam</div>
                      <div className="font-medium text-red-600">{progress.failed_rows}</div>
                    </div>
                  </div>

                  {progress.status === 'processing' && progress.processed_rows > 0 && (
                    <div className="text-xs text-center text-muted-foreground">
                      {(() => {
                        const elapsedMs = Date.now() - progress.started_at.getTime();
                        const recordsPerSecond = (progress.processed_rows / (elapsedMs / 1000)).toFixed(1);
                        const remainingRecords = progress.total_rows - progress.processed_rows;
                        const estimatedSeconds = Math.round(remainingRecords / parseFloat(recordsPerSecond));
                        return `${recordsPerSecond} registros/s • ~${estimatedSeconds}s restantes`;
                      })()}
                    </div>
                  )}
                </div>
              )}

              {progress.error_message && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{progress.error_message}</AlertDescription>
                </Alert>
              )}

              {progress.errors && progress.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erros Detalhados ({progress.errors.length})</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const errorText = progress.errors.map(e => 
                            `Linha ${e.row}: ${e.error}\nDados: ${JSON.stringify(e.data, null, 2)}`
                          ).join('\n\n---\n\n');
                          navigator.clipboard.writeText(errorText);
                          toast.success('Erros copiados para área de transferência');
                        }}
                      >
                        Copiar Todos os Erros
                      </Button>
                      <ScrollArea className="h-64 mt-2 border rounded-md p-2">
                        <div className="space-y-3 text-xs">
                          {progress.errors.map((error, i) => (
                            <div key={i} className="border-l-2 border-destructive pl-3 py-2">
                              <div className="font-semibold text-destructive mb-1">
                                Linha {error.row}: {error.error}
                              </div>
                              <div className="text-muted-foreground font-mono">
                                {Object.entries(error.data)
                                  .filter(([_, value]) => value)
                                  .map(([key, value]) => (
                                    <div key={key}>
                                      <span className="font-semibold">{key}:</span> {String(value)}
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                {progress.status === 'processing' && (
                  <Button onClick={() => setShowCancelDialog(true)} variant="destructive" className="flex-1">
                    Cancelar Importação
                  </Button>
                )}
                {progress.status !== 'processing' && (
                  <Button onClick={handleClose} className="flex-1">Fechar</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Importação?</AlertDialogTitle>
            <AlertDialogDescription>
              Os registros já processados permanecerão no banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Importando</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelImport}>Sim, Cancelar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
