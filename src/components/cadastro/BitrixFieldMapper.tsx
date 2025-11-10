import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface FieldMapping {
  formField: string;
  bitrixField: string;
  type: string;
}

interface BitrixFieldMapperProps {
  mappings: FieldMapping[];
  title?: string;
  description?: string;
}

export const BitrixFieldMapper: React.FC<BitrixFieldMapperProps> = ({
  mappings,
  title = 'Mapeamento de Campos',
  description = 'Campos do formulário e seus correspondentes no Bitrix24'
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {mappings.map((mapping, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{mapping.formField}</p>
                <p className="text-xs text-muted-foreground">
                  Campo: {mapping.bitrixField}
                </p>
              </div>
              <Badge variant="outline">{mapping.type}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
