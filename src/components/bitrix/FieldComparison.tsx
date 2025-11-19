import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface BitrixField {
  field_id: string;
  field_title: string;
  field_type: string;
}

interface SupabaseField {
  column_name: string;
  data_type: string;
}

interface FieldMapping {
  bitrix_field: string | null;
  supabase_field: string;
  sync_active: boolean;
}

interface Props {
  bitrixFields: BitrixField[];
  supabaseFields: SupabaseField[];
  mappings: FieldMapping[];
}

export function FieldComparison({ bitrixFields, supabaseFields, mappings }: Props) {
  const getMappingStatus = (fieldId: string, isBitrix: boolean) => {
    const mapped = mappings.find(m => 
      m.sync_active && (isBitrix ? m.bitrix_field === fieldId : m.supabase_field === fieldId)
    );
    return mapped ? 'mapped' : 'unmapped';
  };

  const getMappedField = (fieldId: string, isBitrix: boolean) => {
    const mapping = mappings.find(m => 
      m.sync_active && (isBitrix ? m.bitrix_field === fieldId : m.supabase_field === fieldId)
    );
    return mapping ? (isBitrix ? mapping.supabase_field : mapping.bitrix_field) : null;
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Campos do Bitrix */}
      <Card className="p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Campos Bitrix24
            <Badge variant="secondary">{bitrixFields.length}</Badge>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {bitrixFields.filter(f => getMappingStatus(f.field_id, true) === 'mapped').length} mapeados
          </p>
        </div>
        
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {bitrixFields.map((field) => {
            const status = getMappingStatus(field.field_id, true);
            const mappedTo = getMappedField(field.field_id, true);
            
            return (
              <div
                key={field.field_id}
                className={`p-3 rounded-lg border transition-colors ${
                  status === 'mapped' 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-card border-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded truncate">
                        {field.field_id}
                      </code>
                      {status === 'mapped' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm mt-1 truncate">{field.field_title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{field.field_type}</Badge>
                      {mappedTo && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ArrowRight className="w-3 h-3" />
                          <code className="bg-muted px-1 rounded">{mappedTo}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Campos do Supabase */}
      <Card className="p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Campos Supabase
            <Badge variant="secondary">{supabaseFields.length}</Badge>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {supabaseFields.filter(f => getMappingStatus(f.column_name, false) === 'mapped').length} mapeados
          </p>
        </div>
        
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {supabaseFields.map((field) => {
            const status = getMappingStatus(field.column_name, false);
            const mappedFrom = getMappedField(field.column_name, false);
            
            return (
              <div
                key={field.column_name}
                className={`p-3 rounded-lg border transition-colors ${
                  status === 'mapped' 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-card border-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded truncate">
                        {field.column_name}
                      </code>
                      {status === 'mapped' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{field.data_type}</Badge>
                      {mappedFrom && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <code className="bg-muted px-1 rounded">{mappedFrom}</code>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
