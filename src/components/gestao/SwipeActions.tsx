import { Button } from "@/components/ui/button";
import { Heart, X, SkipForward, Star, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CircularProgress from "./CircularProgress";
import { cn } from "@/lib/utils";

interface SwipeActionsProps {
  onApprove: () => void;
  onReject: () => void;
  onSuperApprove: () => void;
  onSkip: () => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled?: boolean;
  progress?: number;
}

export default function SwipeActions({ onApprove, onReject, onSuperApprove, onSkip, onUndo, canUndo, disabled = false, progress = 0 }: SwipeActionsProps) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-3 py-3 px-4">
      {/* 1. Rejeitar */}
      <div className="relative flex-shrink-0">
        <Button
          variant="outline"
          size="lg"
          onClick={onReject}
          disabled={disabled}
          className="h-14 w-14 md:h-16 md:w-16 rounded-full border-2 border-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-110 touch-manipulation"
          aria-label="Rejeitar lead"
        >
          <X className="w-6 h-6 md:w-7 md:h-7" />
        </Button>
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] pointer-events-none"
        >
          ←
        </Badge>
      </div>

      {/* 2. Voltar */}
      <div className="relative flex-shrink-0">
        <Button
          variant="outline"
          size="lg"
          onClick={onUndo}
          disabled={disabled || !canUndo}
          className={cn(
            "h-12 w-12 md:h-14 md:w-14 rounded-full border-2 transition-all hover:scale-110 touch-manipulation",
            canUndo 
              ? "border-blue-500 hover:bg-blue-500 hover:text-white" 
              : "border-gray-300 opacity-50 cursor-not-allowed"
          )}
          aria-label="Voltar"
        >
          <Undo2 className="w-5 h-5 md:w-6 md:h-6" />
        </Button>
      </div>

      {/* 3. Super Aprovar - Centro */}
      <div className="relative flex-shrink-0">
        <Button
          variant="outline"
          size="lg"
          onClick={onSuperApprove}
          disabled={disabled}
          className="h-16 w-16 md:h-18 md:w-18 rounded-full border-2 border-yellow-500 hover:bg-yellow-500 hover:text-white transition-all hover:scale-110 touch-manipulation"
          aria-label="Super aprovar lead"
        >
          <Star className="w-7 h-7 md:w-9 md:h-9 fill-current" />
        </Button>
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] pointer-events-none"
        >
          ↑
        </Badge>
      </div>

      {/* 4. Pular */}
      <div className="relative flex-shrink-0">
        {/* Circular Progress ao redor do botão */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <CircularProgress 
            percentage={progress} 
            size={56} 
            strokeWidth={4}
            className="absolute"
          />
        </div>
        
        <Button
          variant="outline"
          size="lg"
          onClick={onSkip}
          disabled={disabled}
          className="h-12 w-12 md:h-14 md:w-14 rounded-full hover:scale-110 transition-all touch-manipulation relative z-10"
          aria-label="Pular lead"
        >
          <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
        </Button>
        
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] pointer-events-none z-20"
        >
          ↓
        </Badge>
      </div>

      {/* 5. Aprovar */}
      <div className="relative flex-shrink-0">
        <Button
          variant="outline"
          size="lg"
          onClick={onApprove}
          disabled={disabled}
          className="h-14 w-14 md:h-16 md:w-16 rounded-full border-2 border-green-500 hover:bg-green-500 hover:text-white transition-all hover:scale-110 touch-manipulation"
          aria-label="Aprovar lead"
        >
          <Heart className="w-6 h-6 md:w-7 md:h-7" />
        </Button>
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] pointer-events-none"
        >
          →
        </Badge>
      </div>
    </div>
  );
}
