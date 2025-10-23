import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMappingSuggestion } from '@/utils/fieldValidator';

interface MissingFieldsAlertProps {
  missingFields: string[];
  tableName: string;
}

export function MissingFieldsAlert({ 
  missingFields, 
  tableName 
}: MissingFieldsAlertProps) {
  if (!missingFields || missingFields.length === 0) return null;
  
  return (
    <Alert variant="destructive" className="rounded-2xl border-warning bg-warning-light">
      <AlertCircle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning-foreground">
        Campos Ausentes Detectados
      </AlertTitle>
      <AlertDescription className="text-warning-foreground/90">
        <p className="mb-3">
          Os seguintes campos não foram encontrados na tabela <code className="bg-warning/20 px-1.5 py-0.5 rounded">{tableName}</code>:
        </p>
        <ul className="list-disc list-inside space-y-2 mb-4">
          {missingFields.map(field => (
            <li key={field} className="text-sm">
              <strong className="font-semibold">{field}</strong>: {getMappingSuggestion(field)}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button 
            asChild 
            variant="outline" 
            size="sm" 
            className="bg-card hover:bg-card-hover"
          >
            <Link to="/configuracoes">
              <Settings className="h-4 w-4 mr-2" />
              Configurar Mapeamento
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
