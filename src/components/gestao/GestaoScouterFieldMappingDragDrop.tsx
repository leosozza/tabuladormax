import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useState } from 'react';
import { GripVertical, Plus, Trash2, Edit, Save, X, RefreshCw } from 'lucide-react';

interface FieldMapping {
  id: string;
  database_field: string;
  display_name: string;
  field_type: string;
  category: string;
  default_visible: boolean;
  sortable: boolean;
  priority: number;
  formatter_function: string | null;
  active: boolean;
}

export function GestaoScouterFieldMappingDragDrop() {
  const queryClient = useQueryClient();
  const [searchSource, setSearchSource] = useState('');
  const [draggingMapping, setDraggingMapping] = useState<string | null>(null);
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FieldMapping>>({});

  // Buscar campos disponíveis da tabela leads
  const { data: databaseFields, isLoading: loadingFields } = useQuery({
    queryKey: ['gestao-database-fields'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leads_schema');
      if (error) throw error;
      return data;
    }
  });

  // Buscar mapeamentos existentes
  const { data: mappings, isLoading: loadingMappings } = useQuery({
    queryKey: ['gestao-field-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_scouter_field_mappings')
        .select('*')
        .order('priority');
      if (error) throw error;
      return data as FieldMapping[];
    }
  });

  const mappedFields = new Set(mappings?.map(m => m.database_field) || []);
  const availableFields = databaseFields?.filter(f => !mappedFields.has(f.column_name)) || [];
  const filteredFields = availableFields.filter(f => 
    f.column_name.toLowerCase().includes(searchSource.toLowerCase())
  );

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, mappingId: string) => {
    setDraggingMapping(mappingId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingMapping || draggingMapping === targetId || !mappings) return;

    const draggedIndex = mappings.findIndex(m => m.id === draggingMapping);
    const targetIndex = mappings.findIndex(m => m.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reordenar localmente
    const newMappings = [...mappings];
    const [removed] = newMappings.splice(draggedIndex, 1);
    newMappings.splice(targetIndex, 0, removed);

    // Atualizar prioridades no banco
    const updates = newMappings.map((m, idx) => ({
      id: m.id,
      priority: idx
    }));

    try {
      for (const update of updates) {
        await supabase
          .from('gestao_scouter_field_mappings' as any)
          .update({ priority: update.priority } as any)
          .eq('id', update.id);
      }
      queryClient.invalidateQueries({ queryKey: ['gestao-field-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-field-mappings-active'] });
      toast.success('Ordem atualizada');
    } catch (error) {
      toast.error('Erro ao reordenar campos');
      console.error(error);
    }
  };

  const handleDragEnd = () => {
    setDraggingMapping(null);
  };

  const handleAddMapping = async (fieldName: string) => {
    const field = databaseFields?.find(f => f.column_name === fieldName);
    if (!field) return;

    const newMapping = {
      database_field: field.column_name,
      display_name: formatFieldName(field.column_name),
      field_type: mapPostgresTypeToFieldType(field.data_type),
      category: detectCategory(field.column_name),
      default_visible: false,
      sortable: true,
      priority: mappings?.length || 0,
      formatter_function: null,
      active: true
    };

    try {
      const { error } = await supabase
        .from('gestao_scouter_field_mappings')
        .insert([newMapping]);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['gestao-field-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-database-fields'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-field-mappings-active'] });
      toast.success('Campo adicionado');
    } catch (error) {
      toast.error('Erro ao adicionar campo');
      console.error(error);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gestao_scouter_field_mappings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['gestao-field-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-database-fields'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-field-mappings-active'] });
      toast.success('Campo removido');
    } catch (error) {
      toast.error('Erro ao remover campo');
      console.error(error);
    }
  };

  const startEditing = (mapping: FieldMapping) => {
    setEditingMapping(mapping.id);
    setEditForm(mapping);
  };

  const cancelEditing = () => {
    setEditingMapping(null);
    setEditForm({});
  };

  const saveEditing = async () => {
    if (!editingMapping) return;

    try {
      const { error } = await supabase
        .from('gestao_scouter_field_mappings')
        .update(editForm)
        .eq('id', editingMapping);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['gestao-field-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-field-mappings-active'] });
      toast.success('Campo atualizado');
      cancelEditing();
    } catch (error) {
      toast.error('Erro ao atualizar campo');
      console.error(error);
    }
  };

  const handleSyncFields = async () => {
    try {
      const { error } = await supabase.functions.invoke('sync-gestao-scouter-fields');
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['gestao-field-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-database-fields'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-field-mappings-active'] });
      toast.success('Campos sincronizados com sucesso');
    } catch (error) {
      toast.error('Erro ao sincronizar campos');
      console.error(error);
    }
  };

  if (loadingFields || loadingMappings) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Coluna da Esquerda: Campos Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Campos Disponíveis do Banco</CardTitle>
          <CardDescription>
            Arraste campos para adicionar ao mapeamento
          </CardDescription>
          <div className="flex gap-2">
            <Input
              placeholder="Buscar campo..."
              value={searchSource}
              onChange={(e) => setSearchSource(e.target.value)}
            />
            <Button onClick={handleSyncFields} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredFields.map((field) => (
                <div
                  key={field.column_name}
                  className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleAddMapping(field.column_name)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{field.column_name}</p>
                      <p className="text-sm text-muted-foreground">{field.data_type}</p>
                    </div>
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Coluna da Direita: Campos Mapeados */}
      <Card>
        <CardHeader>
          <CardTitle>Campos Mapeados</CardTitle>
          <CardDescription>
            {mappings?.length || 0} campos configurados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {mappings?.map((mapping) => (
                <Card
                  key={mapping.id}
                  draggable={editingMapping !== mapping.id}
                  onDragStart={(e) => handleDragStart(e, mapping.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, mapping.id)}
                  onDragEnd={handleDragEnd}
                  className={`cursor-move transition-all ${
                    draggingMapping === mapping.id ? 'opacity-50' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    {editingMapping === mapping.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label>Nome de Exibição</Label>
                          <Input
                            value={editForm.display_name || ''}
                            onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Tipo</Label>
                          <Select
                            value={editForm.field_type}
                            onValueChange={(value) => setEditForm({ ...editForm, field_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="boolean">Booleano</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="currency">Moeda</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Categoria</Label>
                          <Select
                            value={editForm.category}
                            onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">Básico</SelectItem>
                              <SelectItem value="contact">Contato</SelectItem>
                              <SelectItem value="status">Status</SelectItem>
                              <SelectItem value="location">Localização</SelectItem>
                              <SelectItem value="dates">Datas</SelectItem>
                              <SelectItem value="sync">Sincronização</SelectItem>
                              <SelectItem value="other">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Visível por padrão</Label>
                          <Switch
                            checked={editForm.default_visible}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, default_visible: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Ordenável</Label>
                          <Switch
                            checked={editForm.sortable}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, sortable: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Ativo</Label>
                          <Switch
                            checked={editForm.active}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, active: checked })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={saveEditing} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar
                          </Button>
                          <Button onClick={cancelEditing} variant="outline" size="sm">
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{mapping.display_name}</p>
                              <p className="text-sm text-muted-foreground">{mapping.database_field}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => startEditing(mapping)}
                              variant="ghost"
                              size="icon"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteMapping(mapping.id)}
                              variant="ghost"
                              size="icon"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary">{mapping.field_type}</Badge>
                          <Badge variant="outline">{mapping.category}</Badge>
                          {mapping.default_visible && <Badge>Visível</Badge>}
                          {!mapping.active && <Badge variant="destructive">Inativo</Badge>}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Funções auxiliares
function formatFieldName(field: string): string {
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function mapPostgresTypeToFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    'text': 'text',
    'integer': 'number',
    'bigint': 'number',
    'boolean': 'boolean',
    'timestamp with time zone': 'date',
    'date': 'date',
    'numeric': 'currency',
  };
  return typeMap[type] || 'text';
}

function detectCategory(field: string): string {
  if (field.includes('telefone') || field.includes('celular') || field.includes('email')) {
    return 'contact';
  }
  if (field.includes('data') || field.includes('criado') || field.includes('modificado')) {
    return 'dates';
  }
  if (field.includes('status') || field.includes('etapa') || field.includes('confirmad')) {
    return 'status';
  }
  if (field.includes('lat') || field.includes('long') || field.includes('local') || field.includes('address')) {
    return 'location';
  }
  if (field.includes('sync')) {
    return 'sync';
  }
  return 'basic';
}
