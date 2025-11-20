import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { SyncFieldMappings, formatFieldMappingsForDisplay, getFieldMappingSummary } from '@/lib/fieldMappingUtils';
import { useMemo } from 'react';
import { useBitrixEnums } from '@/hooks/useBitrixEnums';

interface FieldMappingDisplayProps {
  mappings: SyncFieldMappings;
  compact?: boolean;
}

export function FieldMappingDisplay({ mappings, compact = false }: FieldMappingDisplayProps) {
  const formattedMappings = formatFieldMappingsForDisplay(mappings);
  const summary = getFieldMappingSummary(mappings);

  // Coletar todas as solicitações de resolução de enum
  const enumRequests = useMemo(() => {
    return formattedMappings
      .filter(m => m.bitrixField && m.rawValue)
      .map(m => ({
        bitrixField: m.bitrixField!,
        value: m.rawValue,
        bitrixFieldType: m.bitrixFieldType,
      }));
  }, [formattedMappings]);

  // Resolver todos os enums de uma vez
  const { getResolution } = useBitrixEnums(enumRequests);

  if (compact) {
    return (
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">{summary.totalFields} campos</span>
        {summary.transformedFields > 0 && (
          <span className="ml-2">
            ({summary.transformedFields} transformados)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <span className="font-medium">{summary.totalFields} campos sincronizados</span>
        {summary.transformedFields > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            {summary.transformedFields} transformados
          </Badge>
        )}
      </div>

      {/* Field Mappings */}
      <div className="space-y-2">
        {formattedMappings.map((mapping, index) => {
          // Tentar resolver enum se disponível
          const enumResolution = mapping.bitrixField && mapping.rawValue
            ? getResolution(mapping.bitrixField, mapping.rawValue)
            : null;
          
          const displayValue = enumResolution 
            ? enumResolution.formatted 
            : mapping.value;

          return (
            <div
              key={index}
              className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              <code className="text-xs bg-background px-2 py-1 rounded border">
                {mapping.from}
              </code>
              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <code className="text-xs bg-background px-2 py-1 rounded border">
                {mapping.to}
              </code>
              {mapping.transformed && (
                <Sparkles className="w-3 h-3 text-yellow-600 flex-shrink-0" aria-label="Valor transformado" />
              )}
              <span className="text-xs text-muted-foreground truncate ml-auto max-w-[200px]" title={displayValue}>
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>

      {/* Direction Summary */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {summary.bitrixToSupabaseCount > 0 && (
          <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md">
            <div className="font-medium text-blue-700 dark:text-blue-400">
              Bitrix → Supabase
            </div>
            <div className="text-blue-600 dark:text-blue-500">
              {summary.bitrixToSupabaseCount} campos
            </div>
          </div>
        )}
        {summary.supabaseToBitrixCount > 0 && (
          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
            <div className="font-medium text-green-700 dark:text-green-400">
              Supabase → Bitrix
            </div>
            <div className="text-green-600 dark:text-green-500">
              {summary.supabaseToBitrixCount} campos
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FieldMappingCardProps {
  mappings: SyncFieldMappings;
  title?: string;
  description?: string;
}

export function FieldMappingCard({ mappings, title, description }: FieldMappingCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          {title || 'Mapeamento de Campos'}
        </CardTitle>
        {description && (
          <CardDescription className="text-xs">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <FieldMappingDisplay mappings={mappings} />
      </CardContent>
    </Card>
  );
}
