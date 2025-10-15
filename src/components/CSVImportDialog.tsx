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

    // FASE 4: Reduzir limite de 250MB → 50MB
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 50MB');
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
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvData = event.target?.result as string;
        const lines = csvData.split('\n');
        
        // FASE 4: Processar em chunks de 5000 linhas
        const CHUNK_SIZE = 5000;
        const headerLine = lines[0];
        const dataLines = lines.slice(1).filter(line => line.trim() !== '');
        const totalChunks = Math.ceil(dataLines.length / CHUNK_SIZE);
        
        let totalImported = 0;
        let totalErrors = 0;
        const errorDetails: any[] = [];
        
        console.log(`📦 Processando ${dataLines.length} linhas em ${totalChunks} chunks de ${CHUNK_SIZE}`);
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = start + CHUNK_SIZE;
          const chunkLines = [headerLine, ...dataLines.slice(start, end)];
          const chunkData = chunkLines.join('\n');
          
          // Atualizar progresso
          const progressPercent = Math.round(((i + 1) / totalChunks) * 100);
          setProgress(progressPercent);
          console.log(`📊 Chunk ${i + 1}/${totalChunks} (${progressPercent}%)`);
          
          const { data, error } = await supabase.functions.invoke('import-csv-leads', {
            body: { csvData: chunkData }
          });
          
          if (error) {
            console.error(`❌ Erro no chunk ${i + 1}:`, error);
            totalErrors += chunkLines.length - 1; // -1 para o header
            errorDetails.push({
              batch: i + 1,
              count: chunkLines.length - 1,
              error: error.message
            });
          } else if (data) {
            totalImported += data.imported || 0;
            totalErrors += data.errors || 0;
            if (data.errors > 0 && data.errorDetails) {
              errorDetails.push(...data.errorDetails.map((d: any) => ({ ...d, batch: i + 1 })));
            }
          }
        }
        
        const finalStats: ImportStats = {
          total: dataLines.length,
          imported: totalImported,
          errors: totalErrors,
          errorDetails: errorDetails.length > 0 ? errorDetails : undefined
        };
        
        setStats(finalStats);
        setProgress(100);
        
        if (finalStats.errors > 0) {
          toast.warning(`Importados ${finalStats.imported} de ${finalStats.total} leads. ${finalStats.errors} erros.`);
        } else {
          toast.success(`${finalStats.imported} leads importados com sucesso!`);
        }

        if (onImportComplete) {
          onImportComplete();
        }

        setImporting(false);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Erro ao ler arquivo');
      setImporting(false);
      setProgress(0);
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
                    Máximo 50MB
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
