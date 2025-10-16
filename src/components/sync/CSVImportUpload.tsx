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

  const parseBoolean = (value: string | null): boolean => {
    if (!value) return false;
    const v = value.toLowerCase().trim();
    return v === 'sim' || v === 'yes' || v === 'true' || v === '1' || v === 'y';
  };

  const parseNumeric = (value: string | null): number | null => {
    if (!value) return null;
    const cleaned = value.replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const parseBrazilianDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    try {
      const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
      if (match) {
        const [, day, month, year, hour, minute, second] = match;
        return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
      }
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date.toISOString();
      return null;
    } catch {
      return null;
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setJobStatus('uploading');
    setProgress(0);

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Criar job
      const { data: job, error: jobError } = await supabase
        .from('csv_import_jobs')
        .insert({
          file_path: fileName,
          status: 'processing',
          started_at: new Date().toISOString(),
          created_by: userId
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setProgress(10);

      // Ler e processar CSV no navegador
      const text = await file.text();
      const lines = text.split('\n');
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

      let processedRows = 0;
      let importedRows = 0;
      let errorRows = 0;
      const errorDetails: any[] = [];
      const BATCH_SIZE = 100;
      let leads: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        processedRows++;
        const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || null;
        });

        const lead = {
          id: row.ID ? parseInt(row.ID) : null,
          name: row['Nome do Lead'] || row.NAME || null,
          age: row.Idade ? parseInt(row.Idade) : null,
          address: row['Localização'] || row.ADDRESS || null,
          photo_url: row['Foto do modelo'] || null,
          responsible: row['Responsável'] || null,
          scouter: row.Scouter || null,
          date_modify: new Date().toISOString(),
          etapa: row.Etapa || null,
          nome_modelo: row['Nome do Modelo'] || row['nome modelo'] || null,
          criado: parseBrazilianDate(row.Criado) || null,
          fonte: row.Fonte || null,
          telefone_trabalho: row['Telefone de trabalho'] || null,
          celular: row.Celular || null,
          telefone_casa: row['Telefone de casa'] || null,
          local_abordagem: row['Local da Abordagem'] || null,
          ficha_confirmada: parseBoolean(row['Ficha confirmada']),
          data_criacao_ficha: parseBrazilianDate(row['Data de criação da Ficha']) || null,
          data_confirmacao_ficha: parseBrazilianDate(row['Data da confirmação de ficha']) || null,
          presenca_confirmada: parseBoolean(row['Presença Confirmada']),
          compareceu: parseBoolean(row.Compareceu),
          cadastro_existe_foto: parseBoolean(row['Cadastro Existe Foto?']),
          valor_ficha: parseNumeric(row['Valor da Ficha']) || null,
          data_criacao_agendamento: parseBrazilianDate(row['Data da criação do agendamento']) || null,
          horario_agendamento: row['Horário do agendamento - Cliente - Campo Lista'] || null,
          data_agendamento: parseBrazilianDate(row['Data do agendamento  - Cliente - Campo Data']) || null,
          gerenciamento_funil: row['GERENCIAMENTO FUNIL DE QUALIFICAÇAO/AGENDAMENTO'] || null,
          status_fluxo: row['Status de Fluxo'] || null,
          etapa_funil: row['ETAPA FUNIL QUALIFICAÇÃO/AGENDAMENTO'] || null,
          etapa_fluxo: row['Etapa de fluxo'] || null,
          funil_fichas: row['Funil Fichas'] || null,
          status_tabulacao: row['Status Tabulação'] || null,
          maxsystem_id_ficha: row['MaxSystem - ID da Ficha'] || null,
          gestao_scouter: row['Gestão de Scouter'] || null,
          op_telemarketing: row['Op Telemarketing'] || null,
          data_retorno_ligacao: parseBrazilianDate(row['Data Retorno de ligação']) || null,
          raw: row,
          sync_source: 'csv_import',
          sync_status: 'synced',
          commercial_project_id: null,
          responsible_user_id: null,
          bitrix_telemarketing_id: row.PARENT_ID_1144 ? parseInt(row.PARENT_ID_1144) : null
        };

        if (lead.id) leads.push(lead);

        // Inserir batch
        if (leads.length >= BATCH_SIZE) {
          try {
            const { error } = await supabase
              .from('leads')
              .upsert(leads, { onConflict: 'id' });

            if (error) throw error;
            importedRows += leads.length;
          } catch (error: any) {
            console.error('Erro no batch:', error);
            errorRows += leads.length;
            errorDetails.push({ linha: i, count: leads.length, error: error.message });
          }

          leads = [];

          // Atualizar progresso
          const currentProgress = 10 + Math.round((processedRows / (lines.length - 1)) * 85);
          setProgress(currentProgress);

          await supabase
            .from('csv_import_jobs')
            .update({ 
              total_rows: lines.length - 1,
              processed_rows: processedRows,
              imported_rows: importedRows,
              error_rows: errorRows,
              error_details: errorDetails.slice(-10)
            })
            .eq('id', job.id);
        }
      }

      // Processar últimas linhas
      if (leads.length > 0) {
        try {
          const { error } = await supabase
            .from('leads')
            .upsert(leads, { onConflict: 'id' });

          if (error) throw error;
          importedRows += leads.length;
        } catch (error: any) {
          errorRows += leads.length;
          errorDetails.push({ count: leads.length, error: error.message });
        }
      }

      // Upload arquivo para histórico
      await supabase.storage.from('leads-csv-import').upload(fileName, file);

      // Finalizar job
      await supabase
        .from('csv_import_jobs')
        .update({ 
          status: errorRows > 0 ? 'completed_with_errors' : 'completed',
          total_rows: processedRows,
          processed_rows: processedRows,
          imported_rows: importedRows,
          error_rows: errorRows,
          error_details: errorDetails.slice(-20),
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);

      setProgress(100);
      setJobStatus('completed');
      toast.success(`Importação concluída! ${importedRows} leads importados${errorRows > 0 ? `, ${errorRows} com erro` : ''}.`);
      
      setFile(null);
      setPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onImportComplete) onImportComplete();
    } catch (error: any) {
      console.error('Erro:', error);
      setJobStatus('error');
      toast.error(error.message || 'Erro ao processar arquivo');
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
