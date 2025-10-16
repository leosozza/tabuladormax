import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { ResetStuckJobsButton } from "@/components/ResetStuckJobsButton";

export function CSVImportJobsTable() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["csv-import-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("csv_import_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 3000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        Nenhum job de importação encontrado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ResetStuckJobsButton />
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Importados</TableHead>
              <TableHead>Erros</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const progressPercent = job.total_rows 
                ? Math.round((job.processed_rows / job.total_rows) * 100)
                : 0;

              return (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs">
                    {job.file_path.split('-').slice(1).join('-')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        job.status === 'completed' ? 'default' :
                        job.status === 'processing' ? 'outline' :
                        job.status === 'failed' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {job.status === 'pending' && '⏳ Pendente'}
                      {job.status === 'processing' && '▶️ Processando'}
                      {job.status === 'completed' && '✅ Concluído'}
                      {job.status === 'failed' && '❌ Falhou'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {job.status === 'processing' ? (
                      <div className="space-y-1">
                        <Progress value={progressPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {job.processed_rows}/{job.total_rows} ({progressPercent}%)
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {job.processed_rows || 0}/{job.total_rows || 0}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-green-600 font-medium">
                    {job.imported_rows || 0}
                  </TableCell>
                  <TableCell className="text-red-600 font-medium">
                    {job.error_rows || 0}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(job.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
