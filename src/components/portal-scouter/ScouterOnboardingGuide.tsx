import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  action?: 'openLeadsModal' | 'closeLeadsModal';
  requiresModalOpen?: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo! 👋',
    description: 'Vamos conhecer o Portal do Scouter.',
    position: 'center',
    icon: '🎉'
  },
  {
    id: 'date-filter',
    title: 'Filtro de Data 📅',
    description: 'Escolha o período para ver seus leads.',
    targetSelector: '[data-tour="date-filter"]',
    position: 'bottom',
    icon: '📅'
  },
  {
    id: 'project-filter',
    title: 'Filtro de Projeto 🏢',
    description: 'Filtre por projeto específico.',
    targetSelector: '[data-tour="project-filter"]',
    position: 'bottom',
    icon: '🏢'
  },
  {
    id: 'leads-cards',
    title: 'Estatísticas 📊',
    description: 'Clique nos cards para ver a lista de leads.',
    targetSelector: '[data-tour="stats-cards"]',
    position: 'top',
    icon: '📊'
  },
  {
    id: 'photo-badge',
    title: 'Ver Foto 📷',
    description: 'Clique no badge azul "Foto" para ver a imagem do lead.',
    targetSelector: '[data-tour="lead-photo-badge"]',
    position: 'left',
    icon: '📷',
    action: 'openLeadsModal',
    requiresModalOpen: true
  },
  {
    id: 'lead-actions',
    title: 'Ações do Lead ⚙️',
    description: 'Clique nos 3 pontinhos para Editar, Reenviar ou Excluir.',
    targetSelector: '[data-tour="lead-actions-menu"]',
    position: 'left',
    icon: '⚙️',
    requiresModalOpen: true
  },
  {
    id: 'ai-analysis',
    title: 'Análise por IA ✨',
    description: 'Receba uma análise completa dos seus leads.',
    targetSelector: '[data-tour="ai-analysis"]',
    position: 'bottom',
    icon: '✨',
    action: 'closeLeadsModal'
  },
  {
    id: 'complete',
    title: 'Tudo Pronto! 🎉',
    description: 'Bom trabalho e ótimas conversões!',
    position: 'center',
    icon: '🚀'
  }
];

interface ScouterOnboardingGuideProps {
  isOpen: boolean;
  onComplete: (dontShowAgain: boolean) => void;
  onStepChange?: (stepId: string, action?: 'openLeadsModal' | 'closeLeadsModal') => void;
}

export const ScouterOnboardingGuide = ({ isOpen, onComplete, onStepChange }: ScouterOnboardingGuideProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  // Helper para verificar se elemento está realmente visível
  const isElementVisible = (el: Element): boolean => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    
    // Verificar se tem dimensões
    if (rect.width <= 0 || rect.height <= 0) return false;
    
    // Verificar se não está escondido via CSS
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    
    // Verificar se está na viewport (pelo menos parcialmente)
    if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
    if (rect.right < 0 || rect.left > window.innerWidth) return false;
    
    return true;
  };

  // Find and highlight target element with retry for modal elements
  useEffect(() => {
    if (!isOpen || !step.targetSelector) {
      setTargetRect(null);
      return;
    }

    let attempts = 0;
    const maxAttempts = 30; // Aumentado para dar mais tempo
    let retryTimeout: NodeJS.Timeout | null = null;

    const findTarget = () => {
      // Buscar TODOS os elementos que correspondem ao seletor
      const candidates = document.querySelectorAll(step.targetSelector!);
      
      // Encontrar o primeiro que está realmente visível
      let visibleTarget: Element | null = null;
      for (const candidate of candidates) {
        if (isElementVisible(candidate)) {
          visibleTarget = candidate;
          break;
        }
      }
      
      if (visibleTarget) {
        const rect = visibleTarget.getBoundingClientRect();
        setTargetRect(rect);
        
        // Scroll suave para garantir que o elemento esteja visível no centro
        visibleTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } else if (attempts < maxAttempts) {
        // Retry if no visible element found (modal might still be rendering)
        attempts++;
        retryTimeout = setTimeout(findTarget, 200); // Intervalo um pouco maior
      } else {
        setTargetRect(null);
      }
    };

    // Initial delay - longer for steps that require modal to be open
    const initialDelay = step.requiresModalOpen ? 700 : 100;
    const timeout = setTimeout(findTarget, initialDelay);
    
    // Update position on scroll/resize
    const handlePositionUpdate = () => {
      const candidates = document.querySelectorAll(step.targetSelector!);
      for (const candidate of candidates) {
        if (isElementVisible(candidate)) {
          setTargetRect(candidate.getBoundingClientRect());
          return;
        }
      }
    };
    
    window.addEventListener('scroll', handlePositionUpdate, true);
    window.addEventListener('resize', handlePositionUpdate);
    
    // MutationObserver for dynamic elements
    const observer = new MutationObserver(() => {
      if (!targetRect) {
        findTarget();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      clearTimeout(timeout);
      if (retryTimeout) clearTimeout(retryTimeout);
      window.removeEventListener('scroll', handlePositionUpdate, true);
      window.removeEventListener('resize', handlePositionUpdate);
      observer.disconnect();
    };
  }, [isOpen, step.targetSelector, step.requiresModalOpen, currentStep]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete(dontShowAgain);
    } else {
      const nextStep = ONBOARDING_STEPS[currentStep + 1];
      
      // Execute action of NEXT step BEFORE navigating (prepare UI first)
      if (nextStep.action) {
        onStepChange?.(nextStep.id, nextStep.action);
      }
      
      // Delay navigation if next step requires modal to be open
      const delay = nextStep.requiresModalOpen ? 600 : 100;
      
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, delay);
    }
  }, [isLastStep, onComplete, dontShowAgain, currentStep, onStepChange]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      const prevStep = ONBOARDING_STEPS[currentStep - 1];
      // If going back from modal steps to cards, close modal
      if ((step.id === 'photo-badge' || step.id === 'lead-actions') && prevStep.id === 'leads-cards') {
        onStepChange?.(prevStep.id, 'closeLeadsModal');
      }
      setCurrentStep(prev => prev - 1);
      onStepChange?.(prevStep.id);
    }
  }, [isFirstStep, currentStep, step, onStepChange]);

  const handleSkip = useCallback(() => {
    // Close modal if open
    onStepChange?.('skip', 'closeLeadsModal');
    onComplete(dontShowAgain);
  }, [onComplete, dontShowAgain, onStepChange]);

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

    const padding = 12;
    const tooltipWidth = 256;
    
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
          top: Math.max(padding, Math.min(targetRect.top + targetRect.height / 2 - 60, window.innerHeight - 150)),
          right: window.innerWidth - targetRect.left + padding,
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

  const spotlightPadding = 8;

  return (
    <div className="fixed inset-0 z-[600]">
      {/* SVG Overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - spotlightPadding}
                y={targetRect.top - spotlightPadding}
                width={targetRect.width + spotlightPadding * 2}
                height={targetRect.height + spotlightPadding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="absolute rounded-lg ring-4 ring-primary animate-pulse pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - spotlightPadding,
            left: targetRect.left - spotlightPadding,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
          }}
        />
      )}

      {/* Arrow pointing to element */}
      {targetRect && step.position === 'bottom' && (
        <div
          className="absolute w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-primary pointer-events-none"
          style={{
            top: targetRect.bottom + 4,
            left: targetRect.left + targetRect.width / 2 - 8,
          }}
        />
      )}
      {targetRect && step.position === 'top' && (
        <div
          className="absolute w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-primary pointer-events-none"
          style={{
            top: targetRect.top - 12,
            left: targetRect.left + targetRect.width / 2 - 8,
          }}
        />
      )}
      {targetRect && step.position === 'left' && (
        <div
          className="absolute w-0 h-0 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-primary pointer-events-none"
          style={{
            top: targetRect.top + targetRect.height / 2 - 8,
            left: targetRect.left - 12,
          }}
        />
      )}

      {/* Compact Tooltip Card */}
      <Card
        className="w-64 shadow-2xl border-primary/30 animate-in fade-in-0 zoom-in-95 duration-300 bg-background/95 backdrop-blur-sm"
        style={getTooltipStyle()}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header with icon, title and close */}
          <div className="flex items-start gap-2">
            <span className="text-2xl">{step.icon}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight">{step.title}</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-2 shrink-0"
              onClick={handleSkip}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            {step.description}
          </p>

          {/* Progress indicators */}
          <div className="flex items-center justify-center gap-1">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-200",
                  index === currentStep
                    ? "w-4 bg-primary"
                    : index < currentStep
                    ? "bg-primary/60"
                    : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Don't show again checkbox (only on last step) */}
          {isLastStep && (
            <div className="flex items-center gap-2 pt-1 border-t">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                className="h-3 w-3"
              />
              <label
                htmlFor="dont-show-again"
                className="text-[10px] text-muted-foreground cursor-pointer"
              >
                Não mostrar novamente
              </label>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={cn("h-7 text-xs px-2", isFirstStep && "invisible")}
            >
              <ChevronLeft className="h-3 w-3 mr-0.5" />
              Anterior
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              className="h-7 text-xs px-3 gap-1"
            >
              {isLastStep ? (
                <>
                  <Sparkles className="h-3 w-3" />
                  Começar
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
