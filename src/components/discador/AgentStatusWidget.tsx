import { Phone, Pause, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSyscallAgent } from "@/hooks/useSyscallAgent";
import { cn } from "@/lib/utils";

export function AgentStatusWidget() {
  const { status, isConfigured, login, logout, pause, unpause, isLoading } = useSyscallAgent();

  if (!isConfigured) {
    return null;
  }

  const statusConfig = {
    offline: { label: "Offline", color: "bg-gray-500" },
    online: { label: "Online", color: "bg-green-500" },
    paused: { label: "Pausado", color: "bg-yellow-500" },
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded-full", statusConfig[status].color)} />
          <span className="font-semibold">{statusConfig[status].label}</span>
        </div>

        <div className="flex gap-2">
          {status === "offline" && (
            <Button size="sm" onClick={() => login()} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
              <span className="ml-2">Login</span>
            </Button>
          )}

          {status === "online" && (
            <>
              <Button size="sm" variant="outline" onClick={() => pause()} disabled={isLoading}>
                <Pause className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => logout()} disabled={isLoading}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}

          {status === "paused" && (
            <>
              <Button size="sm" onClick={() => unpause()} disabled={isLoading}>
                <Phone className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => logout()} disabled={isLoading}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
