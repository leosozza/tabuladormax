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
import { Download, Loader2, Pause, Play, Info, Database, Clock } from "lucide-react";

export function BitrixImportTab() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("2024-10-14");
  const [endDate, setEndDate] = useState("");
  const [importing, setImporting] = useState(false);

  const { data: jobs } = useQuery({
    queryKey: ["bitrix-import-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bitrix_import_jobs")
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
      .channel("bitrix-import-jobs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bitrix_import_jobs",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["bitrix-import-jobs"] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);

  const handleStartImport = async () => {
    try {
      setImporting(true);

      const { data, error } = await supabase.functions.invoke("bitrix-import-batch", {
        body: {
          action: "create",
          startDate,
          endDate: endDate || null,
        },
      });

      if (error) throw error;

      toast.success("Importação iniciada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["bitrix-import-jobs"] });
    } catch (error: any) {
      console.error("Erro ao iniciar importação:", error);
      toast.error(error.message || "Erro ao iniciar importação");
    } finally {
      setImporting(false);
    }
  };

  const pauseJob = async (jobId: string) => {
    try {
      await supabase.functions.invoke("bitrix-import-batch", {
        body: { action: "pause", jobId },
      });

      toast.success("Importação pausada");
      queryClient.invalidateQueries({ queryKey: ["bitrix-import-jobs"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao pausar");
    }
  };

  const resumeJob = async (jobId: string) => {
    try {
      await supabase.functions.invoke("bitrix-import-batch", {
        body: { action: "resume", jobId },
      });

      toast.success("Importação retomada");
      queryClient.invalidateQueries({ queryKey: ["bitrix-import-jobs"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao retomar");
    }
  };

  const resetJob = async (jobId: string) => {
    const loading = toast.loading("Resetando job travado...");
    
    try {
      const { error } = await supabase
        .from("bitrix_import_jobs")
        .update({
          status: "paused",
          pause_reason: "Reset manual",
        })
        .eq("id", jobId);
      
      if (error) throw error;
      
      toast.success("Job resetado! Clique em 'Retomar' para continuar.", { id: loading });
      queryClient.invalidateQueries({ queryKey: ["bitrix-import-jobs"] });
    } catch (error: any) {
      toast.error("Erro ao resetar job", { id: loading });
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const getNextDate = (lastCompletedDate: string) => {
    const date = new Date(lastCompletedDate);
    date.setDate(date.getDate() - 1);
    return formatDate(date.toISOString().split("T")[0]);
  };

  return (
    <div className="grid gap-6 max-w-4xl">
      {/* Card de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar Importação do Bitrix</CardTitle>
          <CardDescription>
            A importação começa pela data mais recente e vai para trás no tempo.
            <br />
            Você pode pausar a qualquer momento e decidir continuar ou importar o restante via CSV.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Inicial (mais recente)</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Começar a importar a partir desta data
              </p>
            </div>

            <div>
              <Label>Data Final (mais antiga) - Opcional</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Deixe vazio para importar tudo"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Sistema para nesta data. Vazio = sem limite
              </p>
            </div>
          </div>

          <Button
            onClick={handleStartImport}
            disabled={importing || !!activeJob}
            className="w-full"
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Iniciar Importação
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Card de Job Ativo */}
      <Card>
        <CardHeader>
          <CardTitle>Importação em Andamento</CardTitle>
        </CardHeader>

        <CardContent>
          {activeJob ? (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <Badge
                    variant={
                      activeJob.status === "running"
                        ? "default"
                        : activeJob.status === "paused"
                        ? "outline"
                        : "default"
                    }
                  >
                    {activeJob.status === "running" && "▶️ Rodando"}
                    {activeJob.status === "paused" && "⏸️ Pausado (Manual)"}
                  </Badge>

                  {activeJob.status === "paused" && activeJob.pause_reason && (
                    <Alert className="mt-2">
                      <Clock className="w-4 h-4" />
                      <AlertDescription>{activeJob.pause_reason}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex gap-2">
                  {activeJob.status === "running" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => pauseJob(activeJob.id)}>
                        <Pause className="w-4 h-4 mr-1" />
                        Pausar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => resetJob(activeJob.id)}>
                        Reset
                      </Button>
                    </>
                  )}

                  {activeJob.status === "paused" && (
                    <>
                      <Button size="sm" onClick={() => resumeJob(activeJob.id)}>
                        <Play className="w-4 h-4 mr-1" />
                        Retomar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resetJob(activeJob.id)}>
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Período:</span>
                  <span className="font-medium">
                    {formatDate(activeJob.start_date)} →{" "}
                    {activeJob.end_date ? formatDate(activeJob.end_date) : "Início"}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data sendo processada:</span>
                  <span className="font-medium">
                    {activeJob.processing_date ? formatDate(activeJob.processing_date) : "-"}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Última data concluída:</span>
                  <span className="font-bold text-green-600">
                    {activeJob.last_completed_date
                      ? formatDate(activeJob.last_completed_date)
                      : "Nenhuma ainda"}
                  </span>
                </div>

                {activeJob.last_completed_date && (
                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Próxima data a importar:</strong>{" "}
                      {getNextDate(activeJob.last_completed_date)}
                      <br />
                      Você pode retomar a importação ou fazer upload via CSV dos leads anteriores a
                      esta data.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{activeJob.total_leads || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Processados</p>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {activeJob.imported_leads || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Importados</p>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{activeJob.error_leads || 0}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>

              {activeJob.status === "running" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <Progress value={undefined} className="h-2" />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma importação em andamento</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de Histórico */}
      {jobs && jobs.filter((j) => j.status === "completed").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobs
                .filter((j) => j.status === "completed")
                .map((job) => (
                  <div key={job.id} className="p-3 border rounded text-sm">
                    <div className="flex justify-between">
                      <span>
                        {formatDate(job.start_date)} → {formatDate(job.last_completed_date || "")}
                      </span>
                      <Badge variant="outline">Concluído</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {job.imported_leads} leads importados
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
