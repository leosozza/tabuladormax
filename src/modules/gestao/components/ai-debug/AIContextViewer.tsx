import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface AIContextViewerProps {
  analysis: any;
  databaseContext?: any;
  sourceContext?: any;
  logContext?: any;
}

export function AIContextViewer({ analysis, databaseContext, sourceContext, logContext }: AIContextViewerProps) {
  return (
    <Tabs defaultValue="analysis" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <TabsTrigger value="analysis">Análise IA</TabsTrigger>
        <TabsTrigger value="database">
          Banco {databaseContext && <Badge variant="secondary" className="ml-1">✓</Badge>}
        </TabsTrigger>
        <TabsTrigger value="source">
          Código {sourceContext && <Badge variant="secondary" className="ml-1">✓</Badge>}
        </TabsTrigger>
        <TabsTrigger value="logs">
          Logs {logContext && <Badge variant="secondary" className="ml-1">✓</Badge>}
        </TabsTrigger>
        <TabsTrigger value="element">Elemento</TabsTrigger>
      </TabsList>

      <ScrollArea className="h-[500px] mt-4">
        <TabsContent value="analysis" className="space-y-4">
          {analysis?.analysis_result ? (
            <div className="space-y-4">
              {analysis.analysis_result.root_cause && (
                <Card className="p-4">
                  <h3 className="font-semibold text-lg mb-2">🎯 Causa Raiz</h3>
                  <p className="text-sm">{analysis.analysis_result.root_cause.summary}</p>
                  {analysis.analysis_result.root_cause.file && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-mono">
                        {analysis.analysis_result.root_cause.file}
                        {analysis.analysis_result.root_cause.line && `:${analysis.analysis_result.root_cause.line}`}
                      </span>
                    </div>
                  )}
                </Card>
              )}

              {analysis.analysis_result.fixes && analysis.analysis_result.fixes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">🔧 Correções Sugeridas</h3>
                  {analysis.analysis_result.fixes.map((fix: any, i: number) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{fix.title}</h4>
                        <Badge variant={fix.priority === 'critical' ? 'destructive' : 'secondary'}>
                          {fix.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{fix.description}</p>
                      {fix.confidence && (
                        <Badge variant="outline" className="mb-2">Confiança: {fix.confidence}</Badge>
                      )}
                      {fix.suggested_code && (
                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                          {fix.suggested_code}
                        </pre>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Análise não disponível</p>
          )}
        </TabsContent>

        <TabsContent value="database" className="space-y-2">
          {databaseContext ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">📊 Estatísticas</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total de Tabelas: <span className="font-semibold">{databaseContext.total_tables}</span></div>
                  <div>Total de Registros: <span className="font-semibold">{databaseContext.total_records}</span></div>
                </div>
              </div>

              {databaseContext.tables && databaseContext.tables.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">📋 Tabelas</h3>
                  <div className="space-y-2">
                    {databaseContext.tables.slice(0, 5).map((table: any, i: number) => (
                      <Card key={i} className="p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono text-sm">{table.name}</span>
                          <Badge variant="secondary">{table.row_count} registros</Badge>
                        </div>
                        {table.columns && (
                          <div className="text-xs text-muted-foreground">
                            {table.columns.length} colunas
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Contexto do banco não disponível</p>
          )}
        </TabsContent>

        <TabsContent value="source" className="space-y-2">
          {sourceContext ? (
            <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
              {JSON.stringify(sourceContext, null, 2)}
            </pre>
          ) : (
            <p className="text-muted-foreground">Contexto de código-fonte não disponível</p>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-1">
          {logContext?.aggregated_timeline ? (
            logContext.aggregated_timeline.slice(0, 50).map((log: any, i: number) => (
              <div key={i} className="text-xs font-mono bg-muted p-2 rounded flex gap-2">
                <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'}>
                  {log.source}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="flex-1">{log.message}</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">Logs não disponíveis</p>
          )}
        </TabsContent>

        <TabsContent value="element" className="space-y-2">
          {analysis?.element_context ? (
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Componente:</span>{' '}
                <code className="bg-muted px-1 py-0.5 rounded">
                  {analysis.element_context.react_component || 'Desconhecido'}
                </code>
              </div>
              <div>
                <span className="font-semibold">DOM Path:</span>{' '}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  {analysis.element_context.dom_path}
                </code>
              </div>
              <div>
                <span className="font-semibold">Página:</span> {analysis.element_context.page_url}
              </div>
              {analysis.element_context.react_props && (
                <div>
                  <span className="font-semibold">Props:</span>
                  <pre className="bg-muted p-2 rounded mt-1 text-xs overflow-x-auto">
                    {JSON.stringify(analysis.element_context.react_props, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Contexto do elemento não disponível</p>
          )}
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
}
