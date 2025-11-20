import { Button } from "@/components/ui/button";
import { Heart, X, SkipForward, Star } from "lucide-react";

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
      <Button
        variant="outline"
        size="lg"
        onClick={onReject}
        disabled={disabled}
        className="h-14 w-14 md:h-16 md:w-16 rounded-full border-2 border-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-110 flex-shrink-0"
        aria-label="Rejeitar lead"
      >
        <X className="w-6 h-6 md:w-8 md:h-8" />
      </Button>

      {/* Pular */}
      <Button
        variant="outline"
        size="lg"
        onClick={onSkip}
        disabled={disabled}
        className="h-12 w-12 md:h-14 md:w-14 rounded-full hover:scale-110 transition-all flex-shrink-0"
        aria-label="Pular lead"
      >
        <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
      </Button>

      {/* Aprovar */}
      <Button
        variant="outline"
        size="lg"
        onClick={onApprove}
        disabled={disabled}
        className="h-14 w-14 md:h-16 md:w-16 rounded-full border-2 border-green-500 hover:bg-green-500 hover:text-white transition-all hover:scale-110 flex-shrink-0"
        aria-label="Aprovar lead"
      >
        <Heart className="w-6 h-6 md:w-8 md:h-8" />
      </Button>

      {/* Super Aprovar */}
      <Button
        variant="outline"
        size="lg"
        onClick={onSuperApprove}
        disabled={disabled}
        className="h-16 w-16 md:h-18 md:w-18 rounded-full border-2 border-yellow-500 hover:bg-yellow-500 hover:text-white transition-all hover:scale-110 flex-shrink-0"
        aria-label="Super aprovar lead"
      >
        <Star className="w-7 h-7 md:w-9 md:h-9 fill-current" />
      </Button>
    </div>
  );
}
