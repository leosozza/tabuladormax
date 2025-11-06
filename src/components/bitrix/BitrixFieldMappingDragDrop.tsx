// FASE 2.1: Componente Drag-and-Drop para Bitrix Integration

import { GenericFieldMappingDragDrop, type FieldDefinition, type FieldMapping } from '@/components/common/GenericFieldMappingDragDrop';

interface BitrixFieldMappingDragDropProps {
  bitrixFields: Array<{ field_id: string; field_title: string; field_type: string; display_name?: string | null }>;
  supabaseFields: Array<{ column_name: string; data_type: string }>;
  mappings: Array<{
    id: string;
    bitrix_field: string;
    tabuladormax_field: string;
    transform_function?: string | null;
    priority?: number;
    active: boolean;
    bitrix_field_type?: string | null;
    tabuladormax_field_type?: string | null;
    notes?: string | null;
  }>;
  onUpdate: () => void;
}

export function BitrixFieldMappingDragDrop({ 
  bitrixFields, 
  supabaseFields, 
  mappings, 
  onUpdate 
}: BitrixFieldMappingDragDropProps) {
  // Converter campos do Bitrix para formato genérico
  const sourceFields: FieldDefinition[] = bitrixFields.map(field => ({
    id: field.field_id,
    name: field.display_name || field.field_title,
    type: field.field_type,
    description: field.field_id.startsWith('UF_CRM_') 
      ? 'Campo personalizado do Bitrix' 
      : undefined
  }));
  
  // Converter campos do Supabase para formato genérico
  const targetFields: FieldDefinition[] = supabaseFields.map(field => ({
    id: field.column_name,
    name: field.column_name,
    type: field.data_type,
  }));
  
  // Converter mapeamentos para formato genérico
  const genericMappings: FieldMapping[] = mappings.map(m => ({
    id: m.id,
    source_field: m.bitrix_field,
    target_field: m.tabuladormax_field,
    transform_function: m.transform_function,
    priority: m.priority,
    active: m.active,
    source_field_type: m.bitrix_field_type,
    target_field_type: m.tabuladormax_field_type,
    notes: m.notes,
  }));
  
  return (
    <GenericFieldMappingDragDrop
      sourceSystem="Bitrix"
      targetSystem="Supabase"
      sourceFields={sourceFields}
      targetFields={targetFields}
      mappings={genericMappings}
      tableName="bitrix_field_mappings"
      onUpdate={onUpdate}
      groupByCategory={true}
      showSuggestions={true}
    />
  );
}
