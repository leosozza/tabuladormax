import { Button } from "@/components/ui/button";
import { Heart, X, SkipForward } from "lucide-react";

interface SwipeActionsProps {
  onApprove: () => void;
  onReject: () => void;
  onSkip: () => void;
  disabled?: boolean;
}

export default function SwipeActions({ onApprove, onReject, onSkip, disabled = false }: SwipeActionsProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      {/* Rejeitar */}
      <Button
        variant="outline"
        size="lg"
        onClick={onReject}
        disabled={disabled}
        className="h-16 w-16 rounded-full border-2 border-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-110"
      >
        <X className="w-8 h-8" />
      </Button>

      {/* Pular */}
      <Button
        variant="outline"
        size="lg"
        onClick={onSkip}
        disabled={disabled}
        className="h-14 w-14 rounded-full hover:scale-110 transition-all"
      >
        <SkipForward className="w-6 h-6" />
      </Button>

      {/* Aprovar */}
      <Button
        variant="outline"
        size="lg"
        onClick={onApprove}
        disabled={disabled}
        className="h-16 w-16 rounded-full border-2 border-green-500 hover:bg-green-500 hover:text-white transition-all hover:scale-110"
      >
        <Heart className="w-8 h-8" />
      </Button>
    </div>
  );
}
