import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CSVImportUploadProps {
  onImportComplete?: () => void;
}

export function CSVImportUpload({ onImportComplete }: CSVImportUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    if (selectedFile.size > 500 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Limite: 500MB');
      return;
    }

    setFile(selectedFile);
    setJobStatus('idle');

    // Preview
    const text = await selectedFile.text();
    const lines = text.split('\n').slice(0, 10);
    const rows = lines.map(line => line.split(','));
    setPreview(rows);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setJobStatus('uploading');
    setProgress(0);

    try {
      // Upload file
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase
        .storage
        .from('leads-csv-import')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setProgress(50);
      setJobStatus('processing');

      // Create job
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

      // Invoke edge function
      const { error: invokeError } = await supabase.functions.invoke(
        'process-large-csv-import',
        { body: { jobId: job.id, filePath: fileName } }
      );

      if (invokeError) {
        await supabase
          .from('csv_import_jobs')
          .update({ 
            status: 'failed',
            error_details: [{ error: invokeError.message }]
          })
          .eq('id', job.id);
        
        throw new Error(`Falha ao processar: ${invokeError.message}`);
      }

      setProgress(100);
      setJobStatus('completed');
      toast.success('Upload concluído! Processamento iniciado em background.');
      
      // Reset
      setFile(null);
      setPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onImportComplete) onImportComplete();
    } catch (error: any) {
      console.error('Erro:', error);
      setJobStatus('error');
      toast.error(error.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed rounded-lg p-6 text-center">
        <Input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Clique para selecionar ou arraste um arquivo CSV
            </p>
            <p className="text-xs text-muted-foreground">
              Máximo: 500MB
            </p>
          </div>
        </label>
      </div>

      {/* File Selected */}
      {file && (
        <Alert>
          <FileText className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>Arquivo selecionado:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
            {preview.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Ocultar' : 'Ver'} preview
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Collapsible */}
      {preview.length > 0 && (
        <Collapsible open={showPreview} onOpenChange={setShowPreview}>
          <CollapsibleContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-2 text-sm font-medium">
                Preview (primeiras 10 linhas)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b">
                        {row.map((cell, j) => (
                          <td key={j} className="p-2 border-r">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Upload Button */}
      {file && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {jobStatus === 'uploading' ? 'Fazendo upload...' : 'Processando...'}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Confirmar Upload
            </>
          )}
        </Button>
      )}

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-center text-muted-foreground">
            {progress}% concluído
          </p>
        </div>
      )}

      {/* Status */}
      {jobStatus === 'completed' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Upload concluído com sucesso! O processamento continua em background.
          </AlertDescription>
        </Alert>
      )}

      {jobStatus === 'error' && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Erro ao processar o arquivo. Tente novamente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
