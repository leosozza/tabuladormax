import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Edit, ExternalLink, Code, Database, 
  Filter, FileCode, BarChart3, BookOpen, Copy, Check
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Metric {
  id: string;
  metric_name: string;
  metric_key: string | null;
  data_source: string;
  source_type: string;
  fields_used: string[];
  calculation_formula: string | null;
  filters_applied: string | null;
  sql_example: string | null;
  business_rule: string | null;
  notes: string | null;
  sort_order: number;
}

interface Documentation {
  id: string;
  name: string;
  description: string | null;
  page_route: string;
  category: string;
  module: string;
  main_component: string | null;
  hooks_used: string[];
  rpcs_used: string[];
  tables_accessed: string[];
  filters_available: string[];
  notes: string | null;
  app_metrics_documentation: Metric[];
}

interface Props {
  documentation: Documentation;
  onBack: () => void;
  onEdit: () => void;
}

export function DocumentationDetailView({ documentation, onBack, onEdit }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copiado para a área de transferência');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const metrics = documentation.app_metrics_documentation || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onEdit} className="gap-2">
          <Edit className="h-4 w-4" />
          Editar
        </Button>
      </div>

      {/* Main Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{documentation.name}</CardTitle>
              <p className="text-muted-foreground mt-1">{documentation.description}</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {documentation.category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Rota</label>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <code className="bg-muted px-2 py-1 rounded text-sm">{documentation.page_route}</code>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Componente Principal</label>
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-muted-foreground" />
                <code className="bg-muted px-2 py-1 rounded text-sm">{documentation.main_component || '-'}</code>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hooks */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Code className="h-4 w-4" />
                Hooks Utilizados
              </label>
              <div className="flex flex-wrap gap-1">
                {documentation.hooks_used?.length > 0 ? (
                  documentation.hooks_used.map((hook, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {hook}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Nenhum</span>
                )}
              </div>
            </div>

            {/* RPCs */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                RPCs Utilizados
              </label>
              <div className="flex flex-wrap gap-1">
                {documentation.rpcs_used?.length > 0 ? (
                  documentation.rpcs_used.map((rpc, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-mono">
                      {rpc}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Nenhum</span>
                )}
              </div>
            </div>

            {/* Tables */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Tabelas Acessadas
              </label>
              <div className="flex flex-wrap gap-1">
                {documentation.tables_accessed?.length > 0 ? (
                  documentation.tables_accessed.map((table, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono">
                      {table}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Nenhuma</span>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          {documentation.filters_available?.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros Disponíveis
                </label>
                <div className="flex flex-wrap gap-1">
                  {documentation.filters_available.map((filter, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {filter}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {documentation.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Observações
                </label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {documentation.notes}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Métricas ({metrics.length})</h2>
        </div>

        {metrics.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma métrica documentada
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {metrics.sort((a, b) => a.sort_order - b.sort_order).map(metric => (
              <Card key={metric.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{metric.metric_name}</CardTitle>
                      {metric.metric_key && (
                        <code className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                          {metric.metric_key}
                        </code>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {metric.source_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Fonte de Dados</label>
                      <div className="flex items-center gap-2">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">{metric.data_source}</code>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Campos Utilizados</label>
                      <div className="flex flex-wrap gap-1">
                        {metric.fields_used?.map((field, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-mono">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {metric.calculation_formula && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Fórmula de Cálculo</label>
                      <p className="text-sm">{metric.calculation_formula}</p>
                    </div>
                  )}

                  {metric.filters_applied && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Filtros Aplicados</label>
                      <code className="text-sm block bg-muted px-2 py-1 rounded">
                        {metric.filters_applied}
                      </code>
                    </div>
                  )}

                  {metric.business_rule && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Regra de Negócio</label>
                      <p className="text-sm text-muted-foreground">{metric.business_rule}</p>
                    </div>
                  )}

                  {metric.sql_example && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">SQL de Exemplo</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(metric.sql_example!, metric.id)}
                          className="h-6 px-2"
                        >
                          {copiedId === metric.id ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <ScrollArea className="max-h-40">
                        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                          <code>{metric.sql_example}</code>
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
