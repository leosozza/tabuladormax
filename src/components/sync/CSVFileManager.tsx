import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Loader2, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function CSVFileManager() {
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const { data: files, isLoading, refetch } = useQuery({
    queryKey: ["csv-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .storage
        .from('leads-csv-import')
        .list();

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
  });

  const { data: jobs } = useQuery({
    queryKey: ["csv-import-jobs-for-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("csv_import_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const getJobForFile = (fileName: string) => {
    if (!jobs) return null;
    return jobs.find(job => job.file_path === fileName);
  };

  const getStatusBadge = (fileName: string) => {
    const job = getJobForFile(fileName);
    
    if (!job) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="w-3 h-3" />
          Sem job
        </Badge>
      );
    }

    switch (job.status) {
      case 'completed':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="w-3 h-3" />
            Concluído
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processando
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Erro
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Pendente
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleDeleteClick = (fileName: string) => {
    const job = getJobForFile(fileName);
    
    if (job?.status === 'processing') {
      toast.error('Não é possível deletar arquivo com job em processamento');
      return;
    }

    setFileToDelete(fileName);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    
    setDeletingFile(fileToDelete);
    
    try {
      const { error } = await supabase
        .storage
        .from('leads-csv-import')
        .remove([fileToDelete]);

      if (error) throw error;

      toast.success('Arquivo deletado com sucesso');
      refetch();
    } catch (error: any) {
      console.error('Erro ao deletar arquivo:', error);
      toast.error('Erro ao deletar arquivo');
    } finally {
      setDeletingFile(null);
      setFileToDelete(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        Nenhum arquivo encontrado
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => {
              const job = getJobForFile(file.name);
              const isProcessing = job?.status === 'processing';
              
              return (
                <TableRow key={file.name} className={isProcessing ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}>
                  <TableCell className="font-mono text-xs max-w-[300px] truncate" title={file.name}>
                    {file.name}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(file.name)}
                  </TableCell>
                  <TableCell className="text-sm">{formatFileSize(file.metadata?.size || 0)}</TableCell>
                  <TableCell className="text-sm">
                    {file.created_at 
                      ? new Date(file.created_at).toLocaleString('pt-BR')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(file.name)}
                      disabled={deletingFile === file.name || isProcessing}
                      title={isProcessing ? 'Aguarde o processamento terminar' : 'Deletar arquivo'}
                    >
                      {deletingFile === file.name ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o arquivo <strong className="font-mono text-xs">{fileToDelete}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
