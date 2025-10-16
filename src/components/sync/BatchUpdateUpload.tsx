import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2, AlertTriangle } from "lucide-react";

interface BatchUpdateUploadProps {
  onUploadComplete?: () => void;
}

export function BatchUpdateUpload({ onUploadComplete }: BatchUpdateUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [uploading, setUploading] = useState(false);
  const [fieldName, setFieldName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Limite: 10MB');
      return;
    }

    setFile(selectedFile);

    // Parse CSV
    const text = await selectedFile.text();
    const lines = text.trim().split('\n');
    
    if (lines.length < 2) {
      toast.error('CSV deve ter pelo menos 2 linhas (cabeçalho + dados)');
      setFile(null);
      return;
    }

    const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
    
    // Validar que tem coluna ID
    const header = rows[0];
    if (!header.includes('ID') && !header.includes('id')) {
      toast.error('CSV deve ter uma coluna "ID"');
      setFile(null);
      return;
    }

    // Extrair nome do campo (primeira coluna que não é ID)
    const field = header.find(h => h !== 'ID' && h !== 'id') || '';
    setFieldName(field);
    setPreview(rows.slice(0, 11)); // Header + 10 linhas
  };

  const handleUpload = async () => {
    if (!file || !fieldName) {
      toast.error('Arquivo ou campo inválido');
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileName = `batch-update-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase
        .storage
        .from('leads-csv-import')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create batch job
      const { data: job, error: jobError } = await supabase
        .from('batch_update_jobs')
        .insert({
          file_path: fileName,
          field_name: fieldName,
          status: 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Invoke edge function
      const { error: invokeError } = await supabase.functions.invoke(
        'process-batch-update',
        { body: { jobId: job.id, filePath: fileName, fieldName } }
      );

      if (invokeError) {
        await supabase
          .from('batch_update_jobs')
          .update({ 
            status: 'failed',
            error_details: [{ error: invokeError.message }]
          })
          .eq('id', job.id);
        
        throw new Error(`Falha ao processar: ${invokeError.message}`);
      }

      toast.success('Upload concluído! Atualização iniciada em background.');
      
      // Reset
      setFile(null);
      setPreview([]);
      setFieldName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onUploadComplete) onUploadComplete();
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(error.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          <strong>Formato do CSV:</strong> Primeira linha = cabeçalho com "ID" e o nome do campo a atualizar.
          Demais linhas = ID do lead e o novo valor.
        </AlertDescription>
      </Alert>

      {/* Upload Area */}
      <div className="border-2 border-dashed rounded-lg p-6 text-center">
        <Input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="batch-csv-upload"
        />
        <label htmlFor="batch-csv-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Selecione o arquivo CSV de atualização
            </p>
            <p className="text-xs text-muted-foreground">
              Máximo: 10MB
            </p>
          </div>
        </label>
      </div>

      {/* File Info */}
      {file && fieldName && (
        <Alert>
          <FileText className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p><strong>Arquivo:</strong> {file.name}</p>
              <p><strong>Campo a atualizar:</strong> <code className="bg-muted px-1 rounded">{fieldName}</code></p>
              <p><strong>Linhas:</strong> {preview.length - 1}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted p-2 text-sm font-medium">
            Preview (primeiras 10 linhas)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={i === 0 ? "bg-muted font-medium" : "border-b"}>
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
      )}

      {/* Upload Button */}
      {file && fieldName && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Confirmar Atualização em Lote
            </>
          )}
        </Button>
      )}
    </div>
  );
}
