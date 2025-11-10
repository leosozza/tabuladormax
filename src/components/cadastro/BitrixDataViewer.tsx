import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

interface BitrixDataViewerProps {
  data: Record<string, unknown>;
  title?: string;
  description?: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export const BitrixDataViewer: React.FC<BitrixDataViewerProps> = ({
  data,
  title = 'Dados do Bitrix24',
  description = 'Visualização dos dados sincronizados',
  syncStatus = 'pending'
}) => {
  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Eye className="w-5 h-5" />;
    }
  };

  const getStatusBadge = () => {
    switch (syncStatus) {
      case 'synced':
        return <Badge variant="default" className="bg-green-500">Sincronizado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            {title}
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {Object.keys(data).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum dado disponível
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(data).map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col space-y-1 p-3 rounded-lg bg-muted/50"
              >
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="text-sm">
                  {value !== null && value !== undefined
                    ? String(value)
                    : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
