import { Button } from "@/components/ui/button";
import { Heart, X, SkipForward, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SwipeActionsProps {
  onApprove: () => void;
  onReject: () => void;
  onSuperApprove: () => void;
  onSkip: () => void;
  disabled?: boolean;
}

export default function SwipeActions({ onApprove, onReject, onSuperApprove, onSkip, disabled = false }: SwipeActionsProps) {
  return (
    <div className="flex items-center justify-center gap-3 md:gap-4 py-3 px-4">
      {/* Rejeitar */}
      <div className="relative flex-shrink-0">
        <Button
          variant="outline"
          size="lg"
          onClick={onReject}
          disabled={disabled}
          className="h-16 w-16 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full border-2 border-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-110 touch-manipulation"
          aria-label="Rejeitar lead"
        >
          <X className="w-6 h-6 md:w-8 md:h-8" />
        </Button>
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] pointer-events-none"
        >
          ←
        </Badge>
      </div>

      {/* Pular */}
      <div className="relative flex-shrink-0">
        <Button
          variant="outline"
          size="lg"
          onClick={onSkip}
          disabled={disabled}
          className="h-14 w-14 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full hover:scale-110 transition-all touch-manipulation"
          aria-label="Pular lead"
        >
          <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
        </Button>
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] pointer-events-none"
        >
          ↓
        </Badge>
      </div>

      {/* Aprovar */}
      <div className="relative flex-shrink-0">
        <Button
          variant="outline"
          size="lg"
          onClick={onApprove}
          disabled={disabled}
          className="h-16 w-16 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full border-2 border-green-500 hover:bg-green-500 hover:text-white transition-all hover:scale-110 touch-manipulation"
          aria-label="Aprovar lead"
        >
          <Heart className="w-6 h-6 md:w-8 md:h-8" />
        </Button>
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] pointer-events-none"
        >
          →
        </Badge>
      </div>

      {/* Super Aprovar */}
      <div className="relative flex-shrink-0">
        <Button
          variant="outline"
          size="lg"
          onClick={onSuperApprove}
          disabled={disabled}
          className="h-18 w-18 sm:h-16 sm:w-16 md:h-18 md:w-18 rounded-full border-2 border-yellow-500 hover:bg-yellow-500 hover:text-white transition-all hover:scale-110 touch-manipulation"
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
    </div>
  );
}
