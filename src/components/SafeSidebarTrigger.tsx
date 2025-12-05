import * as React from "react";
import { SidebarTrigger, SidebarContext } from "@/components/ui/sidebar";

/**
 * SidebarTrigger seguro que só renderiza quando há contexto de sidebar
 * Evita erros quando usado fora de SidebarProvider (ex: agentes)
 */
export function SafeSidebarTrigger() {
  const context = React.useContext(SidebarContext);
  
  // Se não há SidebarProvider, não renderiza nada
  if (!context) return null;
  
  return <SidebarTrigger />;
}
