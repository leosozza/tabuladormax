import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TestTube, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function SyncTestPanel() {
  const [leadId, setLeadId] = useState('');
  const [direction, setDirection] = useState<'bitrix_to_supabase' | 'supabase_to_bitrix'>('bitrix_to_supabase');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [listItemsMap, setListItemsMap] = useState<Record<string, Record<string, string>>>({});

  const loadBitrixFieldsCache = async () => {
    try {
      const { data: bitrixFieldsCache } = await supabase
        .from('bitrix_fields_cache')
        .select('field_id, field_title, list_items');

      // Criar mapas para lookup rápido
      const labels: Record<string, string> = {};
      const items: Record<string, Record<string, string>> = {};

      bitrixFieldsCache?.forEach((field: any) => {
        // Mapa: field_id -> field_title
        if (field.field_title) {
          labels[field.field_id] = field.field_title;
        }
        
        // Mapa: field_id -> { itemId -> itemLabel }
        if (field.list_items && Array.isArray(field.list_items)) {
          items[field.field_id] = {};
          field.list_items.forEach((item: any) => {
            items[field.field_id][String(item.ID)] = item.VALUE;
          });
        }
      });

      setFieldLabels(labels);
      setListItemsMap(items);
    } catch (error) {
      console.error('Erro ao carregar cache de campos:', error);
    }
  };

  useEffect(() => {
    loadBitrixFieldsCache();
  }, []);

  // Resolver nome amigável do campo
  const getFieldLabel = (fieldId: string): string => {
    return fieldLabels[fieldId] || fieldId;
  };

  // Resolver valor da lista
  const resolveListValue = (fieldId: string, value: any): string => {
    if (value === null || value === undefined) return '—';
    
    // Se o campo tem lista de items, tentar resolver
    if (listItemsMap[fieldId]) {
      const label = listItemsMap[fieldId][String(value)];
      if (label) return label;
    }
    
    // Senão, retornar o valor original
    if (typeof value === 'object') {
      return JSON.stringify(value).substring(0, 50);
    }
    return String(value).substring(0, 50);
  };

  const handleTest = async () => {
    if (!leadId) {
      toast.error('Digite o ID do lead');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-sync', {
        body: { leadId: parseInt(leadId), direction, dryRun: true }
      });

      if (error) throw error;

      setResult(data);
      toast.success('Teste concluído com sucesso');
    } catch (error) {
      console.error('Erro ao testar:', error);
      toast.error('Erro ao executar teste');
      setResult({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Testar Sincronização
        </CardTitle>
        <CardDescription>
          Execute um teste de sincronização sem salvar alterações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="leadId">ID do Lead</Label>
            <Input
              id="leadId"
              type="number"
              placeholder="Ex: 12345"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction">Direção</Label>
            <Select value={direction} onValueChange={(value: any) => setDirection(value)}>
              <SelectTrigger id="direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bitrix_to_supabase">Bitrix → Supabase</SelectItem>
                <SelectItem value="supabase_to_bitrix">Supabase → Bitrix</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleTest} disabled={loading} className="w-full">
          {loading ? 'Testando...' : 'Executar Teste'}
        </Button>

        {result && (
          <div className="mt-4 space-y-4">
            {result.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <CheckCircle2 className="w-4 h-4" />
                  <AlertDescription>
                    Teste executado com sucesso! {result.fieldsCount} campos seriam sincronizados.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Preview dos Dados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {result.appliedMappings?.map((mapping: any, index: number) => (
                        <div key={index} className="flex flex-col gap-2 p-3 rounded bg-muted/50 border border-border">
                          {/* Cabeçalho com mapeamento */}
                          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <div className="flex items-center gap-1.5 flex-1">
                              {/* Campo Origem */}
                              <div className="flex flex-col gap-0.5">
                                <code className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                                  {direction === 'bitrix_to_supabase' 
                                    ? getFieldLabel(mapping.bitrix_field)
                                    : mapping.tabuladormax_field}
                                </code>
                                {direction === 'bitrix_to_supabase' && fieldLabels[mapping.bitrix_field] && (
                                  <span className="text-[9px] text-muted-foreground/50 font-mono">
                                    {mapping.bitrix_field}
                                  </span>
                                )}
                              </div>

                              <span className="text-muted-foreground">→</span>

                              {/* Campo Destino */}
                              <div className="flex flex-col gap-0.5">
                                <code className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded font-medium">
                                  {direction === 'bitrix_to_supabase' 
                                    ? mapping.tabuladormax_field
                                    : getFieldLabel(mapping.bitrix_field)}
                                </code>
                                {direction === 'supabase_to_bitrix' && fieldLabels[mapping.bitrix_field] && (
                                  <span className="text-[9px] text-muted-foreground/50 font-mono">
                                    {mapping.bitrix_field}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Badge de transformação */}
                            {mapping.transformed && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {mapping.transform_function}
                              </Badge>
                            )}
                          </div>

                          {/* Valor transformado */}
                          <div className="flex items-start gap-2 pl-2 border-l-2 border-primary/30">
                            <span className="text-xs font-medium text-muted-foreground/70">Valor:</span>
                            <div className="flex flex-col gap-0.5 flex-1">
                              <span className="text-sm text-foreground font-medium">
                                {direction === 'bitrix_to_supabase'
                                  ? resolveListValue(mapping.bitrix_field, mapping.value)
                                  : resolveListValue(mapping.bitrix_field, mapping.value)}
                              </span>
                              {/* Mostrar ID técnico se for valor de lista */}
                              {direction === 'bitrix_to_supabase' && 
                               listItemsMap[mapping.bitrix_field] && 
                               listItemsMap[mapping.bitrix_field][String(mapping.value)] && (
                                <span className="text-[9px] text-muted-foreground/40 font-mono">
                                  (ID: {mapping.value})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
