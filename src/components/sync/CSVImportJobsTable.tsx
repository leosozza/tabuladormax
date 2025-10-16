import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { ResetStuckJobsButton } from "@/components/ResetStuckJobsButton";
import { useState } from "react";

export function CSVImportJobsTable() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: allJobs, isLoading } = useQuery({
    queryKey: ["csv-import-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("csv_import_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    refetchInterval: 3000,
  });

  const jobs = statusFilter === "all" 
    ? allJobs 
    : allJobs?.filter(job => job.status === statusFilter);

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

  const toggleRow = (jobId: string) => {
    setExpandedRow(expandedRow === jobId ? null : jobId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="processing">Processando</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
          </SelectContent>
        </Select>
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
              
              const isExpanded = expandedRow === job.id;
              const hasError = job.status === 'failed' && job.error_details;

              return (
                <>
                  <TableRow key={job.id} className={job.status === 'processing' ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasError && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleRow(job.id)}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        )}
                        <span className="font-mono text-xs max-w-[200px] truncate" title={job.file_path}>
                          {job.file_path.split('-').slice(1).join('-')}
                        </span>
                      </div>
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
                        <div className="space-y-1 min-w-[120px]">
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
                  
                  {hasError && isExpanded && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-destructive/5 p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                            <FileText className="w-4 h-4" />
                            Detalhes do Erro
                          </div>
                          <pre className="text-xs bg-background p-3 rounded border overflow-auto max-h-[200px]">
                            {JSON.stringify(job.error_details, null, 2)}
                          </pre>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
