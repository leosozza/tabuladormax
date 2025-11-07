// FASE 3.1: Componente Genérico Reutilizável de Mapeamento Drag-and-Drop
// Usando HTML5 drag-and-drop nativo (mais simples e confiável)

import { useState, useEffect, type DragEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GripVertical, Plus, Trash2, Search, AlertCircle, CheckCircle2, 
  Info, ArrowRight, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  suggestFieldMappings, 
  validateMapping, 
  type FieldSuggestion 
} from '@/lib/fieldMappingSuggestions';
import { cn } from '@/lib/utils';

export interface FieldDefinition {
  id: string;
  name: string;
  type?: string;
  description?: string;
}

export interface FieldMapping {
  id: string;
  source_field: string;
  target_field: string;
  transform_function?: string | null;
  priority?: number;
  active: boolean;
  source_field_type?: string | null;
  target_field_type?: string | null;
  notes?: string | null;
}

export interface GenericFieldMappingDragDropProps {
  sourceSystem: string;
  targetSystem: string;
  sourceFields: FieldDefinition[];
  targetFields: FieldDefinition[];
  mappings: FieldMapping[];
  tableName: string;
  onUpdate: () => void;
  transformOptions?: Array<{ value: string; label: string }>;
  groupByCategory?: boolean;
  showSuggestions?: boolean;
}

const DEFAULT_TRANSFORMS = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'toNumber', label: 'toNumber' },
  { value: 'toString', label: 'toString' },
  { value: 'toBoolean', label: 'toBoolean' },
  { value: 'toDate', label: 'toDate' },
  { value: 'toTimestamp', label: 'toTimestamp' },
];

export function GenericFieldMappingDragDrop({
  sourceSystem,
  targetSystem,
  sourceFields,
  targetFields,
  mappings: initialMappings,
  tableName,
  onUpdate,
  transformOptions = DEFAULT_TRANSFORMS,
  showSuggestions = true,
}: GenericFieldMappingDragDropProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>(initialMappings);
  const [searchSource, setSearchSource] = useState('');
  const [draggingMapping, setDraggingMapping] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>([]);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FieldMapping | null>(null);
  
  useEffect(() => {
    setMappings(initialMappings);
  }, [initialMappings]);
  
  // Carregar sugestões
  useEffect(() => {
    if (showSuggestions && sourceFields.length > 0 && targetFields.length > 0) {
      const suggested = suggestFieldMappings(
        sourceFields.map(f => ({ field_id: f.id, field_title: f.name, field_type: f.type || '' })),
        targetFields.map(f => ({ column_name: f.id, data_type: f.type || '' })),
        mappings.map(m => ({ source_field: m.source_field, target_field: m.target_field }))
      );
      setSuggestions(suggested);
    }
  }, [sourceFields, targetFields, mappings, showSuggestions]);
  
  const filteredSourceFields = sourceFields.filter(f => 
    f.name.toLowerCase().includes(searchSource.toLowerCase()) ||
    f.id.toLowerCase().includes(searchSource.toLowerCase())
  );
  
  const mappedSourceIds = new Set(mappings.map(m => m.source_field));
  
  // Drag-and-drop handlers
  const handleDragStart = (event: DragEvent<HTMLDivElement>, mappingId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('mappingId', mappingId);
    setDraggingMapping(mappingId);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('mappingId');
    
    if (!draggedId) return;

    const oldIndex = mappings.findIndex((m) => m.id === draggedId);
    if (oldIndex === -1 || oldIndex === targetIndex) return;

    const reordered = [...mappings];
    const [removed] = reordered.splice(oldIndex, 1);
    reordered.splice(targetIndex, 0, removed);
    
    setMappings(reordered);

    // Atualizar prioridades no banco
    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from(tableName as any)
          .update({ priority: i } as any)
          .eq('id', reordered[i].id);
      }
      toast.success('Ordem atualizada!');
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar ordem');
    }
  };

  const handleDragEnd = () => {
    setDraggingMapping(null);
  };
  
  const handleAddMapping = async () => {
    const { error } = await supabase
      .from(tableName as any)
      .insert({
        source_field: sourceFields[0]?.id || '',
        target_field: targetFields[0]?.id || '',
        active: true,
        priority: mappings.length,
      } as any);
    
    if (error) {
      toast.error('Erro ao adicionar mapeamento');
      console.error(error);
    } else {
      toast.success('Mapeamento adicionado!');
      onUpdate();
    }
  };
  
  const handleDeleteMapping = async (id: string) => {
    if (!confirm('Deseja realmente deletar este mapeamento?')) return;
    
    const { error } = await supabase
      .from(tableName as any)
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao deletar mapeamento');
      console.error(error);
    } else {
      toast.success('Mapeamento deletado!');
      onUpdate();
    }
  };
  
  const handleUpdateMapping = async (id: string, updates: Partial<FieldMapping>) => {
    const { error } = await supabase
      .from(tableName as any)
      .update(updates as any)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar mapeamento');
      console.error(error);
    } else {
      toast.success('Mapeamento atualizado!');
      onUpdate();
    }
  };

  const startEditing = (mapping: FieldMapping) => {
    setEditingMapping(mapping.id);
    setEditForm({ ...mapping });
  };

  const cancelEditing = () => {
    setEditingMapping(null);
    setEditForm(null);
  };

  const saveEditing = async () => {
    if (!editForm || !editingMapping) return;
    await handleUpdateMapping(editingMapping, editForm);
    cancelEditing();
  };
  
  const handleApplySuggestion = async (suggestion: FieldSuggestion) => {
    const { error } = await supabase
      .from(tableName as any)
      .insert({
        source_field: suggestion.sourceField,
        target_field: suggestion.targetField,
        transform_function: suggestion.transformationNeeded || null,
        active: true,
        priority: mappings.length,
        notes: suggestion.reason
      } as any);
    
    if (error) {
      toast.error('Erro ao aplicar sugestão');
    } else {
      toast.success('Sugestão aplicada!');
      onUpdate();
    }
  };

  const renderMappingCard = (mapping: FieldMapping, index: number) => {
    const sourceField = sourceFields.find(f => f.id === mapping.source_field);
    const targetField = targetFields.find(f => f.id === mapping.target_field);
    const isDragging = draggingMapping === mapping.id;
    const isEditing = editingMapping === mapping.id;
    const currentForm = isEditing ? editForm! : mapping;
    
    // Validar mapeamento
    const validation = sourceField && targetField ? validateMapping(
      { field_id: sourceField.id, field_type: sourceField.type },
      { column_name: targetField.id, data_type: targetField.type }
    ) : { valid: true, warnings: [], errors: [] };
    
    return (
      <Card 
        key={mapping.id}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStart(e, mapping.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, index)}
        onDragEnd={handleDragEnd}
        className={cn(
          "mb-2 border-border/50 hover:border-primary/50 transition-all cursor-move",
          isDragging && "opacity-50 scale-95",
          isEditing && "border-primary cursor-default"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="cursor-grab active:cursor-grabbing pt-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            
            <div className="flex-1 space-y-3">
              {/* Source → Target */}
              <div className="flex items-center gap-2 flex-wrap">
                {isEditing ? (
                  <>
                    <Select
                      value={currentForm.source_field}
                      onValueChange={(v) => setEditForm({ ...currentForm, source_field: v })}
                    >
                      <SelectTrigger className="flex-1 min-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceFields.map((field: FieldDefinition) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name}
                            {field.type && <span className="text-xs text-muted-foreground ml-2">({field.type})</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    
                    <Select
                      value={currentForm.target_field}
                      onValueChange={(v) => setEditForm({ ...currentForm, target_field: v })}
                    >
                      <SelectTrigger className="flex-1 min-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFields.map((field: FieldDefinition) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name}
                            {field.type && <span className="text-xs text-muted-foreground ml-2">({field.type})</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {sourceField?.name || mapping.source_field}
                    </code>
                    {sourceField?.type && (
                      <Badge variant="outline" className="text-xs">{sourceField.type}</Badge>
                    )}
                    
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {targetField?.name || mapping.target_field}
                    </code>
                    {targetField?.type && (
                      <Badge variant="outline" className="text-xs">{targetField.type}</Badge>
                    )}
                  </>
                )}
              </div>
              
              {/* Transformation & Priority */}
              <div className="flex items-center gap-3 flex-wrap">
                {isEditing ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Transformação:</Label>
                      <Select
                        value={currentForm.transform_function || 'none'}
                        onValueChange={(v) => setEditForm({ 
                          ...currentForm, 
                          transform_function: v === 'none' ? null : v 
                        })}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {transformOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Prioridade:</Label>
                      <Input
                        type="number"
                        value={currentForm.priority || 0}
                        onChange={(e) => setEditForm({ ...currentForm, priority: parseInt(e.target.value) || 0 })}
                        className="w-20"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Ativo:</Label>
                      <Switch
                        checked={currentForm.active}
                        onCheckedChange={(checked) => setEditForm({ ...currentForm, active: checked })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {mapping.transform_function && (
                      <Badge variant="secondary" className="text-xs">
                        {mapping.transform_function}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      Prioridade: {mapping.priority || 0}
                    </Badge>
                    <Badge variant={mapping.active ? "default" : "secondary"} className="text-xs">
                      {mapping.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </>
                )}
              </div>
              
              {/* Warnings/Errors */}
              {validation.warnings.length > 0 && (
                <div className="flex items-start gap-2 text-xs text-yellow-600 dark:text-yellow-500">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{validation.warnings[0]}</span>
                </div>
              )}
              {validation.errors.length > 0 && (
                <div className="flex items-start gap-2 text-xs text-destructive">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{validation.errors[0]}</span>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <Button size="sm" variant="ghost" onClick={saveEditing}>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditing}>
                    ✕
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={() => startEditing(mapping)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteMapping(mapping.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Coluna Esquerda: Campos de Origem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>📋 Campos {sourceSystem}</span>
            {showSuggestions && suggestions.length > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowSuggestionsPanel(!showSuggestionsPanel)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {suggestions.length} sugestões
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campos..."
                value={searchSource}
                onChange={(e) => setSearchSource(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {showSuggestionsPanel && suggestions.length > 0 && (
              <Card className="p-4 bg-primary/5">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Sugestões Automáticas
                </h4>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {suggestions.map((suggestion, idx) => (
                      <div key={idx} className="p-2 rounded bg-background border text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono">{suggestion.sourceField} → {suggestion.targetField}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {suggestion.confidence}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-2">{suggestion.reason}</p>
                        {suggestion.transformationNeeded && (
                          <Badge variant="outline" className="text-[10px] mb-2">
                            {suggestion.transformationNeeded}
                          </Badge>
                        )}
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleApplySuggestion(suggestion)}
                        >
                          Aplicar
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            )}
            
            <ScrollArea className="h-[600px]">
              <div className="space-y-2 pr-4">
                {filteredSourceFields.map(field => {
                  const isMapped = mappedSourceIds.has(field.id);
                  
                  return (
                    <div
                      key={field.id}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        isMapped 
                          ? 'bg-muted/50 border-muted' 
                          : 'bg-background border-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono">{field.name}</code>
                            {isMapped && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                          </div>
                          {field.type && (
                            <Badge variant="outline" className="text-xs mt-1">{field.type}</Badge>
                          )}
                          {field.description && (
                            <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
      
      {/* Coluna Direita: Mapeamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🔗 Mapeamentos Ativos ({mappings.length})</span>
            <Button size="sm" onClick={handleAddMapping}>
              <Plus className="w-4 h-4 mr-2" />
              Novo
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[700px]">
            <div className="space-y-2 pr-4">
              {mappings.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Nenhum mapeamento configurado.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique em "Novo" para adicionar um mapeamento.
                  </p>
                </div>
              ) : (
                mappings.map((mapping, index) => renderMappingCard(mapping, index))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
