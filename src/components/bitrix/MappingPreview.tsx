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
      
      // Buscar mapeamentos ativos
      const { data: mappings, error: mappingsError } = await supabase
        .from(tableName as any)
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: true });
      
      if (mappingsError) throw mappingsError;
      
      if (!mappings || mappings.length === 0) {
        toast.info('Nenhum mapeamento ativo encontrado');
        setPreview([]);
        return;
      }
      
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
            const bitrixValue = rawData[mapping.bitrix_field || mapping.source_field];
            source[mapping.bitrix_field || mapping.source_field] = bitrixValue;
            
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
            
            target[mapping.tabuladormax_field || mapping.target_field] = transformedValue;
            
            // Verificar compatibilidade de tipos
            if (bitrixValue && mapping.bitrix_field_type && mapping.tabuladormax_field_type) {
              if (mapping.bitrix_field_type !== mapping.tabuladormax_field_type && !mapping.transform_function) {
                warnings.push(
                  `Tipos incompatíveis sem transformação: ${mapping.bitrix_field} (${mapping.bitrix_field_type}) → ${mapping.tabuladormax_field} (${mapping.tabuladormax_field_type})`
                );
              }
            }
          });
        } else {
          // Simular Supabase → Bitrix
          mappings?.forEach((mapping: any) => {
            const field = mapping.tabuladormax_field || mapping.target_field;
            const supabaseValue = (lead as any)[field];
            source[field] = supabaseValue;
            
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
                errors.push(`Erro ao transformar ${mapping.tabuladormax_field}: ${e}`);
              }
            }
            
            target[mapping.bitrix_field || mapping.source_field] = transformedValue;
          });
        }
        
        return { source, target, warnings, errors };
      });
      
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
                            <div key={key} className="text-xs">
                              <code className="text-xs bg-muted px-1 rounded">{key}</code>
                              <span className="mx-1">:</span>
                              <span className="text-muted-foreground">
                                {value === null || value === undefined ? '—' : String(value).substring(0, 30)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-medium mb-2 text-muted-foreground">Destino</div>
                        <div className="space-y-1">
                          {Object.entries(item.target).slice(0, 5).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <code className="text-xs bg-muted px-1 rounded">{key}</code>
                              <span className="mx-1">:</span>
                              <span className="text-muted-foreground">
                                {value === null || value === undefined ? '—' : String(value).substring(0, 30)}
                              </span>
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
