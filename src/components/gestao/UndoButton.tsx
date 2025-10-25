import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UndoButtonProps {
  onUndo: () => void;
  isVisible: boolean;
  lastActionType?: "approved" | "rejected";
  timeoutMs?: number;
  disabled?: boolean;
}

export default function UndoButton({ 
  onUndo, 
  isVisible, 
  lastActionType,
  timeoutMs = 5000,
  disabled = false
}: UndoButtonProps) {
  const [progress, setProgress] = useState(100);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setProgress(100);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / timeoutMs) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, 50); // ~20fps, smoother and more efficient

    return () => clearInterval(interval);
  }, [isVisible, timeoutMs]);

  if (!isVisible) return null;

  const actionColor = lastActionType === "approved" ? "green" : "red";
  const actionText = lastActionType === "approved" ? "Aprovação" : "Rejeição";

  return (
    <div 
      className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-50",
        "animate-in slide-in-from-bottom-4 duration-300",
        !isAnimating && "animate-out slide-out-to-bottom-4"
      )}
    >
      <div className="relative">
        <Button
          onClick={onUndo}
          disabled={disabled}
          size="lg"
          className={cn(
            "gap-2 shadow-lg hover:shadow-xl transition-all",
            "bg-background border-2 text-foreground hover:bg-accent",
            lastActionType === "approved" && "border-green-500",
            lastActionType === "rejected" && "border-red-500"
          )}
        >
          <Undo2 className="w-5 h-5" />
          <span>Desfazer {actionText}</span>
        </Button>
        
        {/* Progress bar */}
        <div 
          className="absolute bottom-0 left-0 w-full h-1 bg-primary/30 rounded-full overflow-hidden"
        >
          <div 
            className={cn(
              "h-full rounded-full transition-all",
              lastActionType === "approved" ? "bg-green-500" : "bg-red-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
