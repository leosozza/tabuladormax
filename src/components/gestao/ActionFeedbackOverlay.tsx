import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionFeedbackOverlayProps {
  isVisible: boolean;
  type: "approved" | "rejected" | null;
  duration?: number;
}

export default function ActionFeedbackOverlay({ 
  isVisible, 
  type,
  duration = 800
}: ActionFeedbackOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible && type) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible, type, duration]);

  if (!show || !type) return null;

  const isApproved = type === "approved";

  return (
    <div 
      className={cn(
        "fixed inset-0 z-40 pointer-events-none",
        "flex items-center justify-center",
        "animate-in fade-in-0 duration-300",
        show && "animate-out fade-out-0"
      )}
    >
      {/* Background overlay */}
      <div 
        className={cn(
          "absolute inset-0",
          isApproved ? "bg-green-500/20" : "bg-red-500/20"
        )}
      />
      
      {/* Icon */}
      <div 
        className={cn(
          "relative z-10 rounded-full p-8",
          "animate-in zoom-in-50 duration-300",
          isApproved ? "bg-green-500" : "bg-red-500"
        )}
      >
        {isApproved ? (
          <CheckCircle2 className="w-24 h-24 text-white" strokeWidth={3} />
        ) : (
          <XCircle className="w-24 h-24 text-white" strokeWidth={3} />
        )}
      </div>
      
      {/* Text */}
      <div className="absolute bottom-12 sm:bottom-24 text-center">
        <p 
          className={cn(
            "text-3xl font-bold",
            isApproved ? "text-green-600" : "text-red-600"
          )}
        >
          {isApproved ? "Lead Aprovado!" : "Lead Rejeitado"}
        </p>
      </div>
    </div>
  );
}
