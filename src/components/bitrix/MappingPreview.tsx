// FASE 5.3: Preview de Mapeamento de Dados

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MappingPreviewProps {
  tableName: string;
  direction: 'bitrix_to_supabase' | 'supabase_to_bitrix';
}

interface PreviewItem {
  source: Record<string, any>;
  target: Record<string, any>;
  warnings: string[];
  errors: string[];
}

export function MappingPreview({ tableName, direction }: MappingPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [listItemsMap, setListItemsMap] = useState<Record<string, Record<string, string>>>({});
  
  const loadPreview = async () => {
    setLoading(true);
    try {
      // Buscar 5 leads recentes
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (leadsError) throw leadsError;
      
      if (!leads || leads.length === 0) {
        toast.info('Nenhum lead encontrado para preview');
        setPreview([]);
        return;
      }
      
      // Buscar mapeamentos ativos do unified_field_config
      const { data: mappings, error: mappingsError } = await supabase
        .from('unified_field_config')
        .select('*')
        .eq('sync_active', true)
        .eq('is_hidden', false)
        .order('sync_priority', { ascending: true });
      
      if (mappingsError) throw mappingsError;
      
      if (!mappings || mappings.length === 0) {
        toast.info('Nenhum mapeamento ativo encontrado');
        setPreview([]);
        return;
      }

      // Buscar cache de campos Bitrix para labels
      const { data: bitrixFieldsCache } = await supabase
        .from('bitrix_fields_cache')
        .select('field_id, field_title, list_items');

      // Criar mapas para lookup rápido
      const fieldLabelsMap: Record<string, string> = {};
      const listItemsMapping: Record<string, Record<string, string>> = {};

      bitrixFieldsCache?.forEach((field: any) => {
        // Mapa: field_id -> field_title
        if (field.field_title) {
          fieldLabelsMap[field.field_id] = field.field_title;
        }
        
        // Mapa: field_id -> { itemId -> itemLabel }
        if (field.list_items && Array.isArray(field.list_items)) {
          listItemsMapping[field.field_id] = {};
          field.list_items.forEach((item: any) => {
            listItemsMapping[field.field_id][String(item.ID)] = item.VALUE;
          });
        }
      });

      // Helper: Resolver nome do campo
      const getFieldLabel = (fieldId: string): string => {
        return fieldLabelsMap[fieldId] || fieldId;
      };

      // Helper: Resolver valor da lista
      const resolveListValue = (fieldId: string, value: any): string => {
        if (value === null || value === undefined) return '—';
        
        // Se o campo tem lista de items, tentar resolver
        if (listItemsMapping[fieldId]) {
          const label = listItemsMapping[fieldId][String(value)];
          if (label) return label;
        }
        
        // Senão, retornar o valor original
        return String(value);
      };
      
      // Simular transformação
      const previewItems: PreviewItem[] = leads.map(lead => {
        const source: Record<string, any> = {};
        const target: Record<string, any> = {};
        const warnings: string[] = [];
        const errors: string[] = [];
        
        if (direction === 'bitrix_to_supabase') {
          // Simular Bitrix → Supabase
          const rawData = lead.raw || {};
          
          mappings?.forEach((mapping: any) => {
            const bitrixValue = rawData[mapping.bitrix_field];
            source[mapping.bitrix_field] = bitrixValue;
            
            let transformedValue = bitrixValue;
            
            // Aplicar transformação
            if (mapping.transform_function && bitrixValue !== null && bitrixValue !== undefined) {
              try {
                switch (mapping.transform_function) {
                  case 'toNumber':
                    transformedValue = Number(bitrixValue);
                    if (isNaN(transformedValue)) {
                      errors.push(`Não foi possível converter "${bitrixValue}" para número em ${mapping.bitrix_field}`);
                    }
                    break;
                  case 'toString':
                    transformedValue = String(bitrixValue);
                    break;
                  case 'toBoolean':
                    transformedValue = bitrixValue === 'Y' || bitrixValue === '1' || bitrixValue === true;
                    break;
                  case 'toDate':
                  case 'toTimestamp':
                    transformedValue = new Date(bitrixValue).toISOString();
                    if (transformedValue === 'Invalid Date') {
                      errors.push(`Data inválida em ${mapping.bitrix_field}: ${bitrixValue}`);
                    }
                    break;
                }
              } catch (e) {
                errors.push(`Erro ao transformar ${mapping.bitrix_field}: ${e}`);
              }
            }
            
            target[mapping.supabase_field] = transformedValue;
            
            // Validação de tipo
            const expectedType = mapping.supabase_type;
            if (expectedType && transformedValue !== null && transformedValue !== undefined) {
              const actualType = typeof transformedValue;
              if (
                (expectedType === 'integer' && actualType !== 'number') ||
                (expectedType === 'text' && actualType !== 'string') ||
                (expectedType === 'boolean' && actualType !== 'boolean')
              ) {
                warnings.push(`Incompatibilidade de tipo: ${mapping.supabase_field} espera ${expectedType}, mas recebeu ${actualType}`);
              }
            }
          });
        } else {
          // Simular Supabase → Bitrix
          mappings?.forEach((mapping: any) => {
            const supabaseValue = lead[mapping.supabase_field];
            source[mapping.supabase_field] = supabaseValue;
            
            let transformedValue = supabaseValue;
            
            // Aplicar transformação reversa
            if (mapping.transform_function && supabaseValue !== null && supabaseValue !== undefined) {
              try {
                switch (mapping.transform_function) {
                  case 'toNumber':
                    transformedValue = Number(supabaseValue);
                    break;
                  case 'toString':
                    transformedValue = String(supabaseValue);
                    break;
                  case 'toBoolean':
                    transformedValue = supabaseValue ? 'Y' : 'N';
                    break;
                  case 'toDate':
                  case 'toTimestamp':
                    transformedValue = new Date(supabaseValue).toISOString().split('T')[0];
                    break;
                }
              } catch (e) {
                errors.push(`Erro ao transformar ${mapping.supabase_field}: ${e}`);
              }
            }
            
            target[mapping.bitrix_field] = transformedValue;
          });
        }
        
        return { source, target, warnings, errors };
      });
      
      setFieldLabels(fieldLabelsMap);
      setListItemsMap(listItemsMapping);
      setPreview(previewItems);
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      toast.error('Erro ao gerar preview');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadPreview();
  }, [tableName, direction]);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Preview de Sincronização</CardTitle>
            <CardDescription>
              Visualize como os dados serão transformados
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={loadPreview}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : preview.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum dado para preview
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-4">
              {preview.map((item, idx) => (
                <Card key={idx} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">Item {idx + 1}</Badge>
                      {item.errors.length > 0 && (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {item.errors.length} erro(s)
                        </Badge>
                      )}
                      {item.warnings.length > 0 && (
                        <Badge variant="secondary">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {item.warnings.length} aviso(s)
                        </Badge>
                      )}
                      {item.errors.length === 0 && item.warnings.length === 0 && (
                        <Badge variant="default">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          OK
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium mb-2 text-muted-foreground">Origem</div>
                        <div className="space-y-1">
                          {Object.entries(item.source).slice(0, 5).map(([key, value]) => (
                            <div key={key} className="text-xs flex flex-col gap-0.5">
                              {/* Label amigável do campo */}
                              <div className="flex items-center gap-1">
                                <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                                  {direction === 'bitrix_to_supabase' ? fieldLabels[key] || key : key}
                                </code>
                                {direction === 'bitrix_to_supabase' && fieldLabels[key] && fieldLabels[key] !== key && (
                                  <span className="text-[9px] text-muted-foreground/50 font-mono">
                                    ({key})
                                  </span>
                                )}
                              </div>
                              
                              {/* Valor resolvido */}
                              <div className="flex items-start gap-1 pl-2 border-l-2 border-muted">
                                <span className="text-xs text-muted-foreground font-medium">
                                  {direction === 'bitrix_to_supabase' 
                                    ? (listItemsMap[key] && listItemsMap[key][String(value)] 
                                        ? listItemsMap[key][String(value)]
                                        : (value === null || value === undefined ? '—' : String(value).substring(0, 50)))
                                    : (value === null || value === undefined ? '—' : String(value).substring(0, 50))}
                                </span>
                                {/* Mostrar valor técnico se for diferente do label */}
                                {direction === 'bitrix_to_supabase' && listItemsMap[key] && listItemsMap[key][String(value)] && (
                                  <span className="text-[9px] text-muted-foreground/40 font-mono">
                                    (ID: {value})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-medium mb-2 text-muted-foreground">Destino</div>
                        <div className="space-y-1">
                          {Object.entries(item.target).slice(0, 5).map(([key, value]) => (
                            <div key={key} className="text-xs flex flex-col gap-0.5">
                              {/* Label amigável do campo Supabase/Bitrix */}
                              <div className="flex items-center gap-1">
                                <code className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">
                                  {direction === 'supabase_to_bitrix' ? fieldLabels[key] || key : key}
                                </code>
                                {direction === 'supabase_to_bitrix' && fieldLabels[key] && fieldLabels[key] !== key && (
                                  <span className="text-[9px] text-muted-foreground/50 font-mono">
                                    ({key})
                                  </span>
                                )}
                              </div>
                              
                              {/* Valor transformado */}
                              <div className="flex items-start gap-1 pl-2 border-l-2 border-green-500/30">
                                <span className="text-xs text-muted-foreground">
                                  {value === null || value === undefined ? '—' : String(value).substring(0, 50)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {item.warnings.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {item.warnings.map((warning, wIdx) => (
                          <div key={wIdx} className="text-xs text-yellow-600 dark:text-yellow-500 flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{warning}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {item.errors.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {item.errors.map((error, eIdx) => (
                          <div key={eIdx} className="text-xs text-destructive flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
