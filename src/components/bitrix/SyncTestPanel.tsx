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
  const [fieldTypes, setFieldTypes] = useState<Record<string, string>>({});
  const [spaEntitiesMap, setSpaEntitiesMap] = useState<Record<number, Record<number, string>>>({});

  const loadBitrixFieldsCache = async () => {
    try {
      const { data: fields, error } = await supabase
        .from('bitrix_fields_cache')
        .select('field_id, display_name, field_title, list_items, field_type');

      if (error) {
        console.error('Erro ao carregar cache de campos Bitrix:', error);
        return;
      }

      // Mapear field_id -> display_name
      const labels: Record<string, string> = {};
      const items: Record<string, Record<string, string>> = {};
      const types: Record<string, string> = {};

      for (const field of fields || []) {
        labels[field.field_id] = field.display_name || field.field_title || field.field_id;
        types[field.field_id] = field.field_type || 'string';

        // Se tem list_items, criar mapa ID -> VALUE
        if (field.list_items) {
          const listItems = typeof field.list_items === 'string'
            ? JSON.parse(field.list_items)
            : field.list_items;

          if (Array.isArray(listItems)) {
            const itemMap: Record<string, string> = {};
            for (const item of listItems) {
              if (item.ID && item.VALUE) {
                itemMap[String(item.ID)] = String(item.VALUE);
              } else if (item.ID && item.NAME) {
                itemMap[String(item.ID)] = String(item.NAME);
              }
            }
            if (Object.keys(itemMap).length > 0) {
              items[field.field_id] = itemMap;
            }
          }
        }
      }

      setFieldLabels(labels);
      setListItemsMap(items);
      setFieldTypes(types);

      // Carregar entidades SPA
      await loadSpaEntities();
    } catch (error) {
      console.error('Erro ao processar cache de campos:', error);
    }
  };

  const loadSpaEntities = async () => {
    try {
      const { data: entities, error } = await supabase
        .from('bitrix_spa_entities')
        .select('entity_type_id, bitrix_item_id, title');

      if (error) {
        console.error('Erro ao carregar entidades SPA:', error);
        return;
      }

      // Mapear entity_type_id -> { bitrix_item_id -> title }
      const spaMap: Record<number, Record<number, string>> = {};
      for (const entity of entities || []) {
        if (!spaMap[entity.entity_type_id]) {
          spaMap[entity.entity_type_id] = {};
        }
        spaMap[entity.entity_type_id][entity.bitrix_item_id] = entity.title;
      }

      setSpaEntitiesMap(spaMap);
    } catch (error) {
      console.error('Erro ao processar entidades SPA:', error);
    }
  };

  useEffect(() => {
    loadBitrixFieldsCache();
  }, []);

  // Resolver nome amigável do campo
  const getFieldLabel = (fieldId: string): string => {
    return fieldLabels[fieldId] || fieldId;
  };

  // Resolver valor com suporte para enums, money, arrays de strings e entidades SPA
  const resolveListValue = (fieldId: string, value: any, fieldType?: string): string => {
    if (value === null || value === undefined || value === '') return '—';

    const actualFieldType = fieldType || fieldTypes[fieldId];

    // TRATAMENTO ESPECIAL: campo money (ex.: "6|BRL" -> "6")
    if (actualFieldType === 'money' && typeof value === 'string' && value.includes('|')) {
      const [amount] = value.split('|');
      return amount.trim();
    }

    // TRATAMENTO ESPECIAL: arrays de strings (ex.: ["Miguel ","Rafael "] -> "Miguel, Rafael")
    if (Array.isArray(value) && value.every((v: any) => typeof v === 'string')) {
      const trimmedValues = value.map((v: string) => v.trim()).filter(Boolean);
      if (trimmedValues.length > 0) {
        return trimmedValues.join(', ');
      }
    }

    // TRATAMENTO ESPECIAL: campos PARENT_ID_* (entidades SPA)
    if (fieldId.startsWith('PARENT_ID_')) {
      const entityTypeId = parseInt(fieldId.replace('PARENT_ID_', ''));
      const itemId = typeof value === 'object' ? value.id || value.ID : parseInt(String(value));
      
      if (spaEntitiesMap[entityTypeId] && spaEntitiesMap[entityTypeId][itemId]) {
        return spaEntitiesMap[entityTypeId][itemId];
      }
      // Se não encontrou no cache, retorna o ID
      return `ID: ${itemId}`;
    }

    const itemsForField = listItemsMap[fieldId];
    
    // Se não temos lista para esse campo, só devolve o valor em string
    if (!itemsForField) {
      if (typeof value === 'object') {
        return JSON.stringify(value).substring(0, 80);
      }
      return String(value);
    }
    
    // Normalizar para um array de IDs (string)
    let ids: string[] = [];
    
    if (Array.isArray(value)) {
      // Ex.: ["3616","3620"] ou [{ID:"3616"}, ...]
      ids = value.map((v: any) => {
        if (typeof v === 'object' && v !== null) {
          return String(v.ID ?? v.id ?? v.value ?? v.VALUE ?? '');
        }
        return String(v);
      }).filter(Boolean);
    } else if (typeof value === 'string' && value.includes(',')) {
      // Ex.: "3616,3620"
      ids = value.split(',').map(v => v.trim()).filter(Boolean);
    } else {
      // Valor simples
      ids = [String(value)];
    }
    
    // Mapear cada ID para label, se existir
    const labels = ids.map(id => {
      const label = itemsForField[id];
      return label ?? id; // se não achar, mostra o próprio ID
    });
    
    // Se só tem 1, devolve direto; se tem vários, junta com " | "
    if (labels.length === 1) return labels[0];
    
    return labels.join(' | ');
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
                                  ? resolveListValue(mapping.bitrix_field, mapping.value, fieldTypes[mapping.bitrix_field])
                                  : resolveListValue(mapping.bitrix_field, mapping.value, fieldTypes[mapping.bitrix_field])}
                              </span>
                              {/* Mostrar ID técnico se for valor de lista ou SPA */}
                              {direction === 'bitrix_to_supabase' && 
                               (listItemsMap[mapping.bitrix_field] || mapping.bitrix_field.startsWith('PARENT_ID_')) && (
                                <span className="text-[9px] text-muted-foreground/40 font-mono">
                                  (ID bruto: {typeof mapping.value === 'object' ? JSON.stringify(mapping.value) : String(mapping.value)})
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
