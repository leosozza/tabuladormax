import { Loader2, Check, X, Database, ExternalLink, MessageSquare, ChevronDown, ChevronUp, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SearchStep {
  name: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  message?: string;
  duration?: number;
}

interface LeadSearchProgressProps {
  steps: SearchStep[];
  onClose?: () => void;
  compact?: boolean;
}

export function LeadSearchProgress({ steps, onClose, compact = true }: LeadSearchProgressProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
  const completedSteps = steps.filter(s => s.status === 'success' || s.status === 'error').length;
  const totalSteps = steps.length;
  const currentStep = steps.find(s => s.status === 'loading');
  const allDone = steps.every(s => s.status !== 'loading');

  // Modo compacto - barra no topo
  if (compact && !isExpanded) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div 
          className="bg-card border border-border rounded-lg shadow-lg p-3 cursor-pointer hover:shadow-xl transition-all hover:scale-105"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-3">
            {!allDone ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Check className="w-4 h-4 text-green-500" />
            )}
            <div className="text-sm min-w-[140px]">
              <div className="font-medium">Buscando Lead</div>
              <div className="text-xs text-muted-foreground">
                {completedSteps}/{totalSteps} 
                {totalDuration > 0 && ` • ${(totalDuration / 1000).toFixed(1)}s`}
              </div>
              {currentStep && (
                <div className="text-xs text-primary mt-0.5">
                  {currentStep.name}...
                </div>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  // Modo expandido - modal completo
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Buscando Lead</h3>
            <div className="flex items-center gap-2">
              {totalDuration > 0 && (
                <span className="text-sm text-muted-foreground">
                  {(totalDuration / 1000).toFixed(1)}s
                </span>
              )}
              {compact && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                  title="Minimizar"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
            </div>
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
                    {step.name === 'Chatwoot' && <MessageSquare className="w-3 h-3 text-muted-foreground" />}
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
