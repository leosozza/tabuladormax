import { Loader2, Check, X, Database, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchStep {
  name: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  message?: string;
  duration?: number;
}

interface LeadSearchProgressProps {
  steps: SearchStep[];
  onClose?: () => void;
}

export function LeadSearchProgress({ steps, onClose }: LeadSearchProgressProps) {
  const getStepIcon = (status: SearchStep['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'error':
        return <X className="w-5 h-5 text-destructive" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted" />;
    }
  };

  const totalDuration = steps.reduce((acc, step) => acc + (step.duration || 0), 0);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Buscando Lead</h3>
            {totalDuration > 0 && (
              <span className="text-sm text-muted-foreground">
                {(totalDuration / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-md transition-colors",
                  step.status === 'loading' && "bg-primary/5",
                  step.status === 'success' && "bg-green-500/5",
                  step.status === 'error' && "bg-destructive/5"
                )}
              >
                <div className="mt-0.5">{getStepIcon(step.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{step.name}</p>
                    {step.name === 'Supabase' && <Database className="w-3 h-3 text-muted-foreground" />}
                    {step.name === 'Bitrix' && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  {step.message && (
                    <p className="text-xs text-muted-foreground mt-1">{step.message}</p>
                  )}
                  {step.duration && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(step.duration / 1000).toFixed(2)}s
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {onClose && steps.every(s => s.status !== 'loading') && (
            <button
              onClick={onClose}
              className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
