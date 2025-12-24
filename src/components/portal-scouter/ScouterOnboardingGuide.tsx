import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Portal do Scouter! 👋',
    description: 'Este guia rápido vai te mostrar como usar todas as funcionalidades do portal. Vamos começar?',
    position: 'center',
    icon: '🎉'
  },
  {
    id: 'date-filter',
    title: 'Filtro de Data 📅',
    description: 'Clique aqui para escolher o período que deseja visualizar os leads. Você pode selecionar Hoje, Ontem, Esta Semana, ou um intervalo personalizado.',
    targetSelector: '[data-tour="date-filter"]',
    position: 'bottom',
    icon: '📅'
  },
  {
    id: 'project-filter',
    title: 'Filtro de Projeto 🏢',
    description: 'Se você trabalha em mais de um projeto, clique aqui para filtrar os leads por projeto específico.',
    targetSelector: '[data-tour="project-filter"]',
    position: 'bottom',
    icon: '🏢'
  },
  {
    id: 'leads-cards',
    title: 'Cards de Estatísticas 📊',
    description: 'Clique em "Total de Leads" ou qualquer outro card para abrir a lista detalhada com todos os seus leads.',
    targetSelector: '[data-tour="stats-cards"]',
    position: 'top',
    icon: '📊'
  },
  {
    id: 'leads-modal-info',
    title: 'Gerenciando seus Leads 📋',
    description: 'Na lista de leads, você pode: clicar na foto para visualizar em tamanho maior, usar os 3 pontinhos para editar, reenviar confirmação ou excluir o lead.',
    position: 'center',
    icon: '📋'
  },
  {
    id: 'ai-analysis',
    title: 'Análise por IA ✨',
    description: 'Clique aqui para receber uma análise completa e detalhada sobre seus leads, gerada por Inteligência Artificial!',
    targetSelector: '[data-tour="ai-analysis"]',
    position: 'bottom',
    icon: '✨'
  },
  {
    id: 'complete',
    title: 'Tudo Pronto! 🎉',
    description: 'Agora você conhece todas as funcionalidades do Portal do Scouter. Bom trabalho e ótimas conversões!',
    position: 'center',
    icon: '🚀'
  }
];

interface ScouterOnboardingGuideProps {
  isOpen: boolean;
  onComplete: (dontShowAgain: boolean) => void;
}

export const ScouterOnboardingGuide = ({ isOpen, onComplete }: ScouterOnboardingGuideProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  // Find and highlight target element
  useEffect(() => {
    if (!isOpen || !step.targetSelector) {
      setTargetRect(null);
      return;
    }

    const findTarget = () => {
      const target = document.querySelector(step.targetSelector!);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };

    findTarget();
    
    // Update position on scroll/resize
    window.addEventListener('scroll', findTarget, true);
    window.addEventListener('resize', findTarget);
    
    return () => {
      window.removeEventListener('scroll', findTarget, true);
      window.removeEventListener('resize', findTarget);
    };
  }, [isOpen, step.targetSelector, currentStep]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete(dontShowAgain);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, onComplete, dontShowAgain]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    onComplete(dontShowAgain);
  }, [onComplete, dontShowAgain]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrevious, handleSkip]);

  if (!isOpen) return null;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || step.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 320;
    
    switch (step.position) {
      case 'bottom':
        return {
          position: 'fixed',
          top: targetRect.bottom + padding,
          left: Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        };
      case 'top':
        return {
          position: 'fixed',
          bottom: window.innerHeight - targetRect.top + padding,
          left: Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        };
      case 'left':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height / 2,
          right: window.innerWidth - targetRect.left + padding,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + padding,
          transform: 'translateY(-50%)',
        };
      default:
        return {};
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with spotlight */}
      <div className="absolute inset-0 bg-black/70 transition-opacity duration-300">
        {targetRect && (
          <div
            className="absolute bg-transparent rounded-lg ring-4 ring-primary ring-offset-4 ring-offset-transparent transition-all duration-300"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            }}
          />
        )}
      </div>

      {/* Tooltip Card */}
      <Card
        className="w-80 shadow-2xl border-primary/20 animate-in fade-in-0 zoom-in-95 duration-300"
        style={getTooltipStyle()}
      >
        <CardHeader className="pb-2 relative">
          {/* Skip button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Step icon */}
          <div className="text-3xl mb-2">{step.icon}</div>
          
          <CardTitle className="text-lg pr-6">{step.title}</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>

          {/* Progress indicators */}
          <div className="flex items-center justify-center gap-1.5">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentStep
                    ? "w-6 bg-primary"
                    : index < currentStep
                    ? "bg-primary/60"
                    : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Don't show again checkbox (only on last step) */}
          {isLastStep && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <label
                htmlFor="dont-show-again"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Não mostrar este guia novamente
              </label>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={cn(isFirstStep && "invisible")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1"
            >
              {isLastStep ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Começar
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
