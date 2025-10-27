import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, AlertCircle, Clock, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface ServiceError {
  service: string;
  message: string;
  timestamp: string;
  severity: "warning" | "critical";
  suggestion?: string;
}

interface ErrorDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: ServiceError[];
}

export function ErrorDetailsDialog({ open, onOpenChange, errors }: ErrorDetailsDialogProps) {
  const copyToClipboard = () => {
    const errorText = errors.map(err => 
      `[${err.severity.toUpperCase()}] ${err.service}\n` +
      `Mensagem: ${err.message}\n` +
      `Timestamp: ${new Date(err.timestamp).toLocaleString()}\n` +
      `${err.suggestion ? `Sugestão: ${err.suggestion}\n` : ''}\n`
    ).join('\n---\n\n');
    
    navigator.clipboard.writeText(errorText);
    toast.success("Detalhes copiados para a área de transferência");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Detalhes dos Erros do Sistema
          </DialogTitle>
          <DialogDescription>
            Lista completa de erros e alertas detectados no sistema
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Badge variant="destructive">{errors.length}</Badge>
            <span className="text-sm text-muted-foreground">
              {errors.length === 1 ? 'erro encontrado' : 'erros encontrados'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar Detalhes
          </Button>
        </div>

        <Separator />

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {errors.map((error, index) => (
              <div 
                key={index}
                className="p-4 border rounded-lg space-y-3 bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant={error.severity === "critical" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {error.severity === "critical" ? "CRÍTICO" : "ATENÇÃO"}
                      </Badge>
                      <h4 className="font-semibold text-sm">{error.service}</h4>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Descrição do Erro</p>
                          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                        </div>
                      </div>

                      {error.suggestion && (
                        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                          <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Sugestão de Resolução</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{error.suggestion}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(error.timestamp).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'medium'
                        })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}