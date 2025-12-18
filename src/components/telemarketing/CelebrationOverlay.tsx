import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PartyPopper, Trophy } from 'lucide-react';

interface CelebrationOverlayProps {
  open: boolean;
  onClose: () => void;
  clientName: string;
  projectName?: string;
}

export const CelebrationOverlay = ({ 
  open, 
  onClose, 
  clientName, 
  projectName 
}: CelebrationOverlayProps) => {
  const hasLaunched = useRef(false);

  useEffect(() => {
    if (open && !hasLaunched.current) {
      hasLaunched.current = true;
      
      // Explosão de confete!
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        // Confete da esquerda
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#22c55e', '#eab308', '#3b82f6', '#ec4899', '#f97316']
        });
        
        // Confete da direita
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#22c55e', '#eab308', '#3b82f6', '#ec4899', '#f97316']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      // Explosão central inicial
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#22c55e', '#eab308', '#3b82f6', '#ec4899', '#f97316']
      });

      frame();

      // Fechar automaticamente após 6 segundos
      const timer = setTimeout(() => {
        onClose();
        hasLaunched.current = false;
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  // Reset flag quando o dialog fecha
  useEffect(() => {
    if (!open) {
      hasLaunched.current = false;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 border-none text-white text-center max-w-md shadow-2xl">
        <div className="flex flex-col items-center gap-4 py-8">
          {/* Ícones animados */}
          <div className="flex items-center gap-4">
            <Trophy className="h-12 w-12 animate-bounce text-yellow-300" />
            <PartyPopper className="h-16 w-16 animate-pulse" />
            <Trophy className="h-12 w-12 animate-bounce text-yellow-300" style={{ animationDelay: '0.2s' }} />
          </div>
          
          {/* Título */}
          <h2 className="text-4xl font-extrabold tracking-tight animate-pulse">
            🎉 PARABÉNS! 🎉
          </h2>
          
          {/* Nome do cliente */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 mt-2">
            <p className="text-2xl font-bold">
              {clientName}
            </p>
          </div>
          
          {/* Mensagem */}
          <p className="text-xl font-medium">
            compareceu na agência!
          </p>
          
          {/* Projeto */}
          {projectName && (
            <p className="text-sm opacity-80 bg-black/20 rounded-full px-4 py-1">
              Projeto: {projectName}
            </p>
          )}
          
          {/* Instrução para fechar */}
          <p className="text-xs opacity-60 mt-4">
            Clique fora para fechar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
