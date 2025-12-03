import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserInfoProps {
  open: boolean;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  manager: "Gerente",
  agent: "Agente",
};

export function UserInfo({ open }: UserInfoProps) {
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const loadUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get display name from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", user.id)
        .single();

      // Get role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setUserName(profile?.display_name || profile?.email || user.email || "Usuário");
      setUserRole(roleData?.role || "");
    };

    loadUserInfo();
  }, []);

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (!open) {
    return (
      <div className="flex justify-center">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {initials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-sidebar-accent/50">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {initials || <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col overflow-hidden">
        <span className="text-sm font-medium truncate">{userName}</span>
        <span className="text-xs text-muted-foreground truncate">
          {roleLabels[userRole] || userRole}
        </span>
      </div>
    </div>
  );
}
