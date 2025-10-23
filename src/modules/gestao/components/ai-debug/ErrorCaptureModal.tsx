import { useState } from 'react';
import { useErrorHunt } from '@/contexts/ErrorHuntContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface ErrorCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalyze: (data: any) => Promise<void>;
}

export function ErrorCaptureModal({ open, onOpenChange, onAnalyze }: ErrorCaptureModalProps) {
  const { clickedElement, capturedLogs, capturedErrors, networkRequests, clearContext } = useErrorHunt();
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await onAnalyze({
        description,
        element_context: clickedElement,
        console_logs: capturedLogs,
        captured_errors: capturedErrors,
        network_requests: networkRequests,
      });
      onOpenChange(false);
      setDescription('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setDescription('');
  };

  const handleClearContext = () => {
    clearContext();
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle>🐛 Analisar Erro com IA</DialogTitle>
          <DialogDescription>
            Contexto capturado automaticamente. Adicione uma descrição opcional e clique em "Analisar".
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="element" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="element">
              Elemento {clickedElement && <Badge variant="secondary" className="ml-1">1</Badge>}
            </TabsTrigger>
            <TabsTrigger value="logs">
              Console {capturedLogs.length > 0 && <Badge variant="secondary" className="ml-1">{capturedLogs.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="errors">
              Erros {capturedErrors.length > 0 && <Badge variant="destructive" className="ml-1">{capturedErrors.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="network">
              Network {networkRequests.length > 0 && <Badge variant="secondary" className="ml-1">{networkRequests.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[300px] mt-4">
            <TabsContent value="element" className="space-y-2">
              {clickedElement ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Componente:</span>{' '}
                    <code className="bg-muted px-1 py-0.5 rounded">{clickedElement.react_component || 'Desconhecido'}</code>
                  </div>
                  <div>
                    <span className="font-semibold">DOM Path:</span>{' '}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">{clickedElement.dom_path}</code>
                  </div>
                  <div>
                    <span className="font-semibold">Página:</span> {clickedElement.page_url}
                  </div>
                  {clickedElement.react_props && (
                    <div>
                      <span className="font-semibold">Props:</span>
                      <pre className="bg-muted p-2 rounded mt-1 text-xs overflow-x-auto">
                        {(() => {
                          try {
                            return JSON.stringify(clickedElement.react_props, null, 2);
                          } catch (e) {
                            return '[Erro ao serializar props]';
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum elemento capturado</p>
              )}
            </TabsContent>

            <TabsContent value="logs" className="space-y-1">
              {capturedLogs.length > 0 ? (
                capturedLogs.map((log, i) => (
                  <div key={i} className="text-xs font-mono bg-muted p-2 rounded">
                    <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'} className="mr-2">
                      {log.level}
                    </Badge>
                    <span className="text-muted-foreground mr-2">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {log.args.map((arg, j) => (
                      <span key={j}>
                        {typeof arg === 'object' ? 
                          (() => {
                            try {
                              return JSON.stringify(arg);
                            } catch {
                              return '[Circular]';
                            }
                          })() 
                          : String(arg)
                        }
                      </span>
                    ))}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Nenhum log capturado</p>
              )}
            </TabsContent>

            <TabsContent value="errors" className="space-y-1">
              {capturedErrors.length > 0 ? (
                capturedErrors.map((error, i) => (
                  <div key={i} className="text-xs bg-destructive/10 p-2 rounded border border-destructive/20">
                    <div className="font-semibold text-destructive">{error.message}</div>
                    {error.stack && (
                      <pre className="mt-1 text-muted-foreground whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Nenhum erro capturado</p>
              )}
            </TabsContent>

            <TabsContent value="network" className="space-y-1">
              {networkRequests.length > 0 ? (
                networkRequests.map((req, i) => (
                  <div key={i} className="text-xs bg-muted p-2 rounded flex items-center gap-2">
                    <Badge variant={req.status && req.status >= 400 ? 'destructive' : 'secondary'}>
                      {req.method}
                    </Badge>
                    <span className="font-mono text-muted-foreground">
                      {req.status || '...'}
                    </span>
                    <span className="flex-1 truncate">{req.url}</span>
                    {req.duration && (
                      <span className="text-muted-foreground">{req.duration}ms</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Nenhuma requisição capturada</p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Descrição do Problema (opcional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: O filtro de datas não está funcionando quando seleciono um período..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleClearContext}>
              Limpar Contexto
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analisar com IA
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
