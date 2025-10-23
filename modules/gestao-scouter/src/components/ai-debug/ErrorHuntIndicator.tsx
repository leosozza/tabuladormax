import { useErrorHunt } from '@/contexts/ErrorHuntContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function ErrorHuntIndicator() {
  const { isActive, capturedLogs, capturedErrors, networkRequests, clearContext, toggleMode, modalOpen } = useErrorHunt();

  if (!isActive || modalOpen) return null;

  const hasNewData = capturedLogs.length > 0 || capturedErrors.length > 0 || networkRequests.length > 0;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-card border rounded-lg shadow-lg p-4 space-y-2 min-w-[200px]">
      <div className="flex items-center justify-between">
        <Badge variant="default" className={hasNewData ? 'animate-pulse' : ''}>
          🔍 Caça Erro Ativo
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={toggleMode}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">📋 Logs:</span>
          <span className="font-semibold">{capturedLogs.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">❌ Erros:</span>
          <span className="font-semibold text-destructive">{capturedErrors.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">🌐 Network:</span>
          <span className="font-semibold">{networkRequests.length}</span>
        </div>
      </div>

      {hasNewData && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearContext}
          className="w-full"
        >
          Limpar Cache
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Duplo-clique em qualquer elemento
      </p>
    </div>
  );
}
