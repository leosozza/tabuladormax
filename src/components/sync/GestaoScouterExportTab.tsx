import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, Loader2, Pause, Play, Info, Database, Clock, RotateCcw, Trash2, AlertCircle, FileText, Settings2 } from "lucide-react";
import { FieldMappingDialog } from "./FieldMappingDialog";

// Available fields for selection (kept for backward compatibility)
const AVAILABLE_FIELDS = [
  { id: "name", label: "Nome" },
  { id: "responsible", label: "Responsável" },
  { id: "age", label: "Idade" },
  { id: "address", label: "Endereço" },
  { id: "scouter", label: "Scouter" },
  { id: "celular", label: "Celular" },
  { id: "telefone_trabalho", label: "Telefone Trabalho" },
  { id: "telefone_casa", label: "Telefone Casa" },
  { id: "etapa", label: "Etapa" },
  { id: "fonte", label: "Fonte" },
  { id: "nome_modelo", label: "Nome Modelo" },
  { id: "local_abordagem", label: "Local Abordagem" },
  { id: "ficha_confirmada", label: "Ficha Confirmada" },
  { id: "presenca_confirmada", label: "Presença Confirmada" },
  { id: "compareceu", label: "Compareceu" },
  { id: "valor_ficha", label: "Valor Ficha" },
  { id: "horario_agendamento", label: "Horário Agendamento" },
  { id: "data_agendamento", label: "Data Agendamento" },
  { id: "gerenciamento_funil", label: "Gerenciamento Funil" },
  { id: "status_fluxo", label: "Status Fluxo" },
  { id: "etapa_funil", label: "Etapa Funil" },
  { id: "etapa_fluxo", label: "Etapa Fluxo" },
  { id: "funil_fichas", label: "Funil Fichas" },
  { id: "status_tabulacao", label: "Status Tabulação" },
];

interface FieldMapping {
  gestaoScouterField: string;
  tabuladormaxField: string | null;
}

export function GestaoScouterExportTab() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);
  const [fieldMappingOpen, setFieldMappingOpen] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  const { data: jobs } = useQuery({
    queryKey: ["gestao-scouter-export-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gestao_scouter_export_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 3000,
  });

  const activeJob = jobs?.find((j) => j.status === "running" || j.status === "paused");

  // Query for export errors for the active job
  const { data: exportErrors } = useQuery({
    queryKey: ["gestao-scouter-export-errors", activeJob?.id],
    queryFn: async () => {
      if (!activeJob) return [];
      
      const { data, error } = await supabase
        .from("gestao_scouter_export_errors")
        .select("*")
        .eq("job_id", activeJob.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!activeJob,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("gestao-scouter-export-jobs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gestao_scouter_export_jobs",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["gestao-scouter-export-jobs"] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);

  const handleSaveFieldMappings = (mappings: FieldMapping[]) => {
    setFieldMappings(mappings);
    toast.success(`${mappings.length} campo(s) mapeado(s) com sucesso!`);
  };

  const handleStartExport = async () => {
    try {
      setExporting(true);

      // Convert field mappings to the format expected by the backend
      const fieldsToSend = fieldMappings.length > 0 
        ? fieldMappings.reduce((acc, mapping) => {
            if (mapping.tabuladormaxField) {
              acc[mapping.gestaoScouterField] = mapping.tabuladormaxField;
            }
            return acc;
          }, {} as Record<string, string>)
        : null;

      const { data, error } = await supabase.functions.invoke("export-to-gestao-scouter-batch", {
        body: {
          action: "create",
          startDate,
          endDate: endDate || null,
          fieldMappings: fieldsToSend,
        },
      });

      if (error) throw error;

      toast.success("Exportação iniciada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["gestao-scouter-export-jobs"] });
    } catch (error: unknown) {
      console.error("Erro ao iniciar exportação:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao iniciar exportação";
      toast.error(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const pauseJob = async (jobId: string) => {
    try {
      await supabase.functions.invoke("export-to-gestao-scouter-batch", {
        body: { action: "pause", jobId },
      });

      toast.success("Exportação pausada");
      queryClient.invalidateQueries({ queryKey: ["gestao-scouter-export-jobs"] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao pausar";
      toast.error(errorMessage);
    }
  };

  const resumeJob = async (jobId: string) => {
    try {
      await supabase.functions.invoke("export-to-gestao-scouter-batch", {
        body: { action: "resume", jobId },
      });

      toast.success("Exportação retomada");
      queryClient.invalidateQueries({ queryKey: ["gestao-scouter-export-jobs"] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao retomar";
      toast.error(errorMessage);
    }
  };

  const resetJob = async (jobId: string) => {
    try {
      await supabase.functions.invoke("export-to-gestao-scouter-batch", {
        body: { action: "reset", jobId },
      });

      toast.success("Exportação resetada e reiniciada");
      queryClient.invalidateQueries({ queryKey: ["gestao-scouter-export-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["gestao-scouter-export-errors"] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao resetar";
      toast.error(errorMessage);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      await supabase.functions.invoke("export-to-gestao-scouter-batch", {
        body: { action: "delete", jobId },
      });

      toast.success("Job de exportação excluído");
      queryClient.invalidateQueries({ queryKey: ["gestao-scouter-export-jobs"] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao excluir";
      toast.error(errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "running":
        return "Em execução";
      case "completed":
        return "Concluído";
      case "paused":
        return "Pausado";
      case "failed":
        return "Falhou";
      case "pending":
        return "Pendente";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Exportação em Lote para Gestão Scouter
          </CardTitle>
          <CardDescription>
            Exporte leads existentes do TabuladorMax para a tabela leads do gestao-scouter.
            A exportação processa leads das datas mais recentes para as mais antigas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Esta exportação complementa a sincronização automática.
              Use para enviar a carga inicial de dados ou leads históricos que não foram sincronizados automaticamente.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Data Inicial (mais recente)</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!!activeJob}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Começar pela data mais recente
              </p>
            </div>

            <div>
              <Label htmlFor="endDate">Data Final (mais antiga) - Opcional</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!!activeJob}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para exportar até o início
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-base font-semibold mb-3 block">Mapeamento de Campos</Label>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Configure o mapeamento entre os campos do Tabuladormax e do Gestão Scouter
              </p>
              <Button
                variant="outline"
                onClick={() => setFieldMappingOpen(true)}
                disabled={!!activeJob}
                className="w-full"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Configurar Mapeamento de Campos
                {fieldMappings.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {fieldMappings.length} mapeado(s)
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          <FieldMappingDialog
            open={fieldMappingOpen}
            onOpenChange={setFieldMappingOpen}
            onSave={handleSaveFieldMappings}
            initialMappings={fieldMappings}
          />

          <Button
            onClick={handleStartExport}
            disabled={exporting || !!activeJob}
            className="w-full"
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Iniciar Exportação
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {activeJob && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Exportação em Andamento
              </CardTitle>
              <Badge className={getStatusColor(activeJob.status)}>
                {getStatusLabel(activeJob.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span className="font-mono">
                  {activeJob.exported_leads || 0} / {activeJob.total_leads || 0} leads
                </span>
              </div>
              <Progress
                value={
                  activeJob.total_leads
                    ? (activeJob.exported_leads / activeJob.total_leads) * 100
                    : 0
                }
                className="h-2"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Processado</p>
                <p className="text-lg font-semibold">{activeJob.total_leads || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Exportados</p>
                <p className="text-lg font-semibold text-green-600">
                  {activeJob.exported_leads || 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Erros</p>
                <p className="text-lg font-semibold text-red-600">
                  {activeJob.error_leads || 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Data Atual</p>
                <p className="text-sm font-mono">
                  {activeJob.processing_date || activeJob.start_date}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              {activeJob.status === "running" && (
                <Button
                  onClick={() => pauseJob(activeJob.id)}
                  variant="outline"
                  className="flex-1"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar
                </Button>
              )}
              {activeJob.status === "paused" && (
                <>
                  <Button
                    onClick={() => resumeJob(activeJob.id)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Retomar
                  </Button>
                  <Button
                    onClick={() => resetJob(activeJob.id)}
                    variant="outline"
                    className="flex-1"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Resetar
                  </Button>
                  <Button
                    onClick={() => deleteJob(activeJob.id)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </>
              )}
            </div>

            {activeJob.pause_reason && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Motivo da pausa:</strong> {activeJob.pause_reason}
                </AlertDescription>
              </Alert>
            )}

            {exportErrors && exportErrors.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2 text-base">
                    <AlertCircle className="w-4 h-4" />
                    Log de Erros ({exportErrors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {exportErrors.map((error) => (
                        <Dialog key={error.id}>
                          <DialogTrigger asChild>
                            <div 
                              className="p-3 border rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-red-900 truncate">
                                    {error.error_message}
                                  </p>
                                  <p className="text-xs text-red-700 mt-1">
                                    Lead ID: {error.lead_id || 'N/A'}
                                  </p>
                                </div>
                                <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Erro</DialogTitle>
                              <DialogDescription>
                                Informações completas sobre o erro de exportação
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh]">
                              <div className="space-y-4 pr-4">
                                <div>
                                  <Label className="font-semibold">Mensagem de Erro</Label>
                                  <p className="text-sm mt-1 p-3 bg-red-50 border border-red-200 rounded">
                                    {error.error_message}
                                  </p>
                                </div>
                                
                                <div>
                                  <Label className="font-semibold">Lead ID</Label>
                                  <p className="text-sm mt-1">{error.lead_id || 'N/A'}</p>
                                </div>

                                {error.response_status && (
                                  <div>
                                    <Label className="font-semibold">Status HTTP</Label>
                                    <p className="text-sm mt-1">{error.response_status}</p>
                                  </div>
                                )}

                                <div>
                                  <Label className="font-semibold">Data/Hora</Label>
                                  <p className="text-sm mt-1">
                                    {new Date(error.created_at).toLocaleString('pt-BR')}
                                  </p>
                                </div>

                                <Separator />

                                <div>
                                  <Label className="font-semibold">Campos Enviados</Label>
                                  <ScrollArea className="h-32 mt-2">
                                    <pre className="text-xs p-3 bg-gray-50 border rounded">
                                      {JSON.stringify(error.fields_sent, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                </div>

                                <div>
                                  <Label className="font-semibold">Snapshot do Lead</Label>
                                  <ScrollArea className="h-32 mt-2">
                                    <pre className="text-xs p-3 bg-gray-50 border rounded">
                                      {JSON.stringify(error.lead_snapshot, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                </div>

                                {error.error_details && (
                                  <div>
                                    <Label className="font-semibold">Detalhes Técnicos</Label>
                                    <ScrollArea className="h-32 mt-2">
                                      <pre className="text-xs p-3 bg-gray-50 border rounded">
                                        {JSON.stringify(error.error_details, null, 2)}
                                      </pre>
                                    </ScrollArea>
                                  </div>
                                )}

                                {error.response_body && (
                                  <div>
                                    <Label className="font-semibold">Resposta do Servidor</Label>
                                    <ScrollArea className="h-32 mt-2">
                                      <pre className="text-xs p-3 bg-gray-50 border rounded">
                                        {JSON.stringify(error.response_body, null, 2)}
                                      </pre>
                                    </ScrollArea>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {jobs && jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Histórico de Exportações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobs.slice(0, 10).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                      <span className="text-sm font-mono">
                        {job.start_date}
                        {job.end_date && ` → ${job.end_date}`}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {job.exported_leads || 0} exportados • {job.error_leads || 0} erros
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(job.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
