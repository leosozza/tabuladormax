import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Check, Save, Zap, Loader2, ArrowRight } from 'lucide-react';
import { useResyncFieldMappings } from '@/hooks/useResyncFieldMappings';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { GenericFieldMappingDragDrop, type FieldDefinition, type FieldMapping } from '@/components/common/GenericFieldMappingDragDrop';
import { supabase } from '@/integrations/supabase/client';

interface ResyncFieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMappingSelected: (mappingName: string, mappingId: string) => void;
  currentMappingName?: string;
}

export function ResyncFieldMappingDialog({
  open,
  onOpenChange,
  onMappingSelected,
  currentMappingName
}: ResyncFieldMappingDialogProps) {
  const { mappings, mappingNames, saveMappings, isLoading } = useResyncFieldMappings();
  const [mappingName, setMappingName] = useState(currentMappingName || '');
  const [selectedMappingToLoad, setSelectedMappingToLoad] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Campos Bitrix disponíveis (lista completa dos campos mais usados)
  const bitrixFields: FieldDefinition[] = [
    { id: 'ID', name: 'ID', type: 'integer' },
    { id: 'NAME', name: 'Nome', type: 'string' },
    { id: 'ADDRESS', name: 'Endereço', type: 'string' },
    { id: 'PHONE', name: 'Telefones', type: 'array' },
    { id: 'EMAIL', name: 'E-mail', type: 'array' },
    { id: 'ASSIGNED_BY_ID', name: 'Responsável ID', type: 'integer' },
    { id: 'SOURCE_ID', name: 'Fonte', type: 'string' },
    { id: 'STATUS_ID', name: 'Status/Etapa', type: 'string' },
    { id: 'DATE_CREATE', name: 'Data de Criação', type: 'datetime' },
    { id: 'DATE_MODIFY', name: 'Data de Modificação', type: 'datetime' },
    { id: 'PARENT_ID_1120', name: 'Projeto Comercial', type: 'string' },
    { id: 'PARENT_ID_1144', name: 'Telemarketing ID', type: 'integer' },
    { id: 'PARENT_ID_1096', name: 'Gestor Scouter', type: 'string' },
    { id: 'UF_CRM_1742226427', name: 'Scouter', type: 'string' },
    { id: 'UF_CRM_VALORFICHA', name: 'Valor da Ficha', type: 'string' },
    { id: 'UF_CRM_AGEND_EM', name: 'Agendado Em', type: 'datetime' },
    { id: 'UF_CRM_1740755279', name: 'Data Criação Ficha', type: 'datetime' },
    { id: 'UF_CRM_1737378043893', name: 'Ficha Confirmada', type: 'string' },
    { id: 'UF_CRM_1744320647', name: 'Gerenciamento Funil', type: 'string' },
    { id: 'UF_CRM_1744324211', name: 'Etapa Funil', type: 'string' },
    { id: 'UF_CRM_1751289856232', name: 'Funil Fichas', type: 'string' },
    { id: 'UF_CRM_1742410301', name: 'Status Tabulação', type: 'array' },
    { id: 'UF_CRM_1741961401', name: 'Etapa Fluxo', type: 'array' },
    { id: 'UF_CRM_1742391534', name: 'Status Fluxo', type: 'boolean' },
    { id: 'UF_CRM_LEAD_1732627097745', name: 'Nome Modelo', type: 'array' },
    { id: 'UF_CRM_1748961149', name: 'OP Telemarketing', type: 'array' },
    { id: 'UF_CRM_1741806030756', name: 'MaxSystem ID Ficha', type: 'string' },
    { id: 'UF_CRM_1740503916697', name: 'Local de Abordagem', type: 'string' },
  ];

  // Campos da tabela leads (buscar dinamicamente)
  const [leadsFields, setLeadsFields] = useState<FieldDefinition[]>([]);

  useEffect(() => {
    async function fetchLeadsFields() {
      const { data, error } = await supabase.rpc('get_leads_table_columns');
      if (error) {
        console.error('Error fetching leads fields:', error);
        return;
      }
      
      const fields: FieldDefinition[] = data.map((col: any) => ({
        id: col.column_name,
        name: col.column_name,
        type: col.data_type
      }));
      
      setLeadsFields(fields);
    }
    
    if (open) {
      fetchLeadsFields();
    }
  }, [open]);

  // Converter mapeamentos para formato genérico
  const genericMappings: FieldMapping[] = (mappings || [])
    .filter(m => m.mapping_name === (mappingName || currentMappingName))
    .map(m => ({
      id: m.id,
      source_field: m.bitrix_field,
      target_field: m.leads_column,
      transform_function: m.transform_function,
      priority: m.priority,
      active: m.active,
      notes: m.notes,
    }));

  const createDefaultMapping = () => {
    const timestamp = format(new Date(), 'dd-MM-yyyy-HHmm');
    const defaultName = `Resync_${timestamp}`;
    setMappingName(defaultName);
    toast.info('Mapeamento padrão criado', {
      description: 'Revise os campos e salve quando estiver pronto.'
    });
  };

  const handleLoadMapping = async () => {
    if (!selectedMappingToLoad) return;
    
    const mapping = mappingNames?.find(m => m.id === selectedMappingToLoad);
    if (mapping) {
      setMappingName(mapping.name);
      toast.success('Mapeamento carregado', {
        description: `"${mapping.name}" está pronto para uso.`
      });
    }
  };

  const handleSave = async () => {
    if (!mappingName.trim()) {
      toast.error('Digite um nome para o mapeamento');
      return;
    }

    // Buscar mapeamentos atuais da interface GenericFieldMappingDragDrop
    const { data: currentMappings, error } = await supabase
      .from('resync_field_mappings')
      .select('*')
      .eq('mapping_name', mappingName)
      .eq('active', true);

    if (error) {
      toast.error('Erro ao buscar mapeamentos atuais');
      return;
    }

    if (!currentMappings || currentMappings.length === 0) {
      toast.error('Configure pelo menos um mapeamento de campo');
      return;
    }

    setIsSaving(true);
    try {
      await saveMappings.mutateAsync({
        mappingName,
        mappings: currentMappings.map((m, idx) => ({
          bitrix_field: m.bitrix_field,
          leads_column: m.leads_column,
          transform_function: m.transform_function,
          priority: idx,
          skip_if_null: m.skip_if_null ?? true
        }))
      });

      // Pegar o ID do primeiro mapeamento (todos têm o mesmo mapping_name)
      const mappingId = currentMappings[0].id;
      onMappingSelected(mappingName, mappingId);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving mapping:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Campos de Resincronização</DialogTitle>
          <DialogDescription>
            Configure quais campos do Bitrix serão sincronizados com a tabela de leads.
            Arraste os campos do Bitrix para os campos correspondentes no Supabase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seção de Nome e Ações */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mapping-name">Nome do Mapeamento</Label>
              <Input
                id="mapping-name"
                placeholder="Ex: Resincronização Completa"
                value={mappingName}
                onChange={(e) => setMappingName(e.target.value)}
              />
              <Button 
                variant="secondary" 
                onClick={createDefaultMapping}
                className="w-full"
              >
                <Zap className="mr-2 h-4 w-4" />
                Criar Mapeamento Padrão
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="load-mapping">Carregar Mapeamento Existente</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedMappingToLoad}
                  onValueChange={setSelectedMappingToLoad}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um mapeamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {mappingNames?.map((mapping) => (
                      <SelectItem key={mapping.id} value={mapping.id}>
                        {mapping.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleLoadMapping}
                  disabled={!selectedMappingToLoad}
                >
                  Carregar
                </Button>
              </div>
            </div>
          </div>

          {/* Alert Informativo */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Campos UUID Protegidos</AlertTitle>
            <AlertDescription>
              Campos como <Badge variant="secondary">responsible_user_id</Badge>, 
              <Badge variant="secondary">commercial_project_id</Badge> e 
              <Badge variant="secondary">analisado_por</Badge> são validados automaticamente 
              para evitar erros. Valores inválidos serão ignorados.
            </AlertDescription>
          </Alert>

          {/* Componente de Drag and Drop */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <GenericFieldMappingDragDrop
              sourceSystem="Bitrix"
              targetSystem="Leads (Supabase)"
              sourceFields={bitrixFields}
              targetFields={leadsFields}
              mappings={genericMappings}
              tableName="resync_field_mappings"
              onUpdate={() => {
                // Atualizar estado quando mapeamentos mudarem
              }}
              groupByCategory={false}
              showSuggestions={true}
            />
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!mappingName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar e Usar Mapeamento
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
