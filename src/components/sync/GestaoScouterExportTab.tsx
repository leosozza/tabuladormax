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
import { toast } from "sonner";
import { Upload, Loader2, Pause, Play, Info, Database, Clock } from "lucide-react";

export function GestaoScouterExportTab() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

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

  const handleStartExport = async () => {
    try {
      setExporting(true);

      const { data, error } = await supabase.functions.invoke("export-to-gestao-scouter-batch", {
        body: {
          action: "create",
          startDate,
          endDate: endDate || null,
        },
      });

      if (error) throw error;

      toast.success("Exportação iniciada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["gestao-scouter-export-jobs"] });
    } catch (error: any) {
      console.error("Erro ao iniciar exportação:", error);
      toast.error(error.message || "Erro ao iniciar exportação");
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
    } catch (error: any) {
      toast.error(error.message || "Erro ao pausar");
    }
  };

  const resumeJob = async (jobId: string) => {
    try {
      await supabase.functions.invoke("export-to-gestao-scouter-batch", {
        body: { action: "resume", jobId },
      });

      toast.success("Exportação retomada");
      queryClient.invalidateQueries({ queryKey: ["gestao-scouter-export-jobs"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao retomar");
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
            Exporte leads existentes do TabuladorMax para a tabela fichas do gestao-scouter.
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
                <Button
                  onClick={() => resumeJob(activeJob.id)}
                  variant="outline"
                  className="flex-1"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Retomar
                </Button>
              )}
            </div>

            {activeJob.pause_reason && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Motivo da pausa:</strong> {activeJob.pause_reason}
                </AlertDescription>
              </Alert>
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
