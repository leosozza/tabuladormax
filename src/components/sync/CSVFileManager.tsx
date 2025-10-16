import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function CSVFileManager() {
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

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
  });

  const handleDelete = async (fileName: string) => {
    setDeletingFile(fileName);
    
    try {
      const { error } = await supabase
        .storage
        .from('leads-csv-import')
        .remove([fileName]);

      if (error) throw error;

      toast.success('Arquivo deletado com sucesso');
      refetch();
    } catch (error: any) {
      console.error('Erro ao deletar arquivo:', error);
      toast.error('Erro ao deletar arquivo');
    } finally {
      setDeletingFile(null);
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
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Arquivo</TableHead>
            <TableHead>Tamanho</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.name}>
              <TableCell className="font-mono text-sm">{file.name}</TableCell>
              <TableCell>{formatFileSize(file.metadata?.size || 0)}</TableCell>
              <TableCell>
                {file.created_at 
                  ? new Date(file.created_at).toLocaleDateString('pt-BR')
                  : '-'
                }
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(file.name)}
                  disabled={deletingFile === file.name}
                >
                  {deletingFile === file.name ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-destructive" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
