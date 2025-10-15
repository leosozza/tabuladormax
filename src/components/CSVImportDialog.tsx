import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface ImportStats {
  total: number;
  imported: number;
  errors: number;
  errorDetails?: any[];
}

export function CSVImportDialog({ onImportComplete }: { onImportComplete?: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [progress, setProgress] = useState(0); // FASE 4: Estado de progresso

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    // Upload via Storage suporta até 5GB
    if (selectedFile.size > 5 * 1024 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5GB');
      return;
    }

    setFile(selectedFile);
    
    // Preview primeiras 10 linhas
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(0, 11); // Header + 10 rows
      const rows = lines.map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
      setPreview(rows);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setStats(null);
    setProgress(0);

    try {
      // 1. Upload para Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase
        .storage
        .from('leads-csv-import')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Criar job de importação
      const { data: job, error: jobError } = await supabase
        .from('csv_import_jobs')
        .insert({
          file_path: fileName,
          status: 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // 3. Iniciar processamento em background
      supabase.functions.invoke('process-large-csv-import', {
        body: { jobId: job.id, filePath: fileName }
      });

      toast.success('Upload iniciado! Processando em background...');

      // 4. Monitorar progresso via Realtime
      const channel = supabase
        .channel(`csv-import-${job.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'csv_import_jobs',
            filter: `id=eq.${job.id}`
          },
          (payload) => {
            const updatedJob = payload.new as any;
            const progress = updatedJob.total_rows 
              ? Math.round((updatedJob.processed_rows / updatedJob.total_rows) * 100)
              : 0;
            
            setProgress(progress);

            if (updatedJob.status === 'completed' || updatedJob.status === 'completed_with_errors') {
              setStats({
                total: updatedJob.total_rows,
                imported: updatedJob.imported_rows,
                errors: updatedJob.error_rows,
                errorDetails: updatedJob.error_details
              });
              setImporting(false);
              channel.unsubscribe();

              if (updatedJob.error_rows > 0) {
                toast.warning(`Importados ${updatedJob.imported_rows} de ${updatedJob.total_rows} leads. ${updatedJob.error_rows} erros.`);
              } else {
                toast.success(`${updatedJob.imported_rows} leads importados com sucesso!`);
              }

              if (onImportComplete) {
                onImportComplete();
              }
            }
          }
        )
        .subscribe();

    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao iniciar importação');
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setPreview([]);
    setStats(null);
    setImporting(false);
    setProgress(0); // FASE 4: Resetar progresso
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Leads via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!stats && (
            <>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                  disabled={importing}
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {file ? file.name : 'Clique para selecionar arquivo CSV'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Máximo 5GB - Processamento automático em background
                  </p>
                </label>
              </div>

              {preview.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Preview (primeiras 10 linhas):</h3>
                  <div className="border rounded overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          {preview[0]?.map((header, idx) => (
                            <th key={idx} className="p-2 text-left border-r last:border-r-0">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(1, 11).map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-t">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="p-2 border-r last:border-r-0">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importing && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Importando leads... {progress}%
                  </p>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={importing}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Confirmar Importação
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {stats && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {stats.errors > 0 ? (
                  <AlertCircle className="w-8 h-8 text-yellow-500" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
                <div>
                  <h3 className="font-semibold">Importação Concluída</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.imported} de {stats.total} leads importados
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded">
                  <p className="text-sm text-muted-foreground">Importados</p>
                  <p className="text-2xl font-bold text-green-600">{stats.imported}</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded">
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                </div>
              </div>

              {stats.errorDetails && stats.errorDetails.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Detalhes dos Erros:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {stats.errorDetails.map((detail, idx) => (
                      <div key={idx} className="p-2 bg-muted rounded text-sm">
                        <p><strong>Lote {detail.batch}:</strong> {detail.count} leads</p>
                        <p className="text-red-600">{detail.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => setOpen(false)} className="w-full">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
