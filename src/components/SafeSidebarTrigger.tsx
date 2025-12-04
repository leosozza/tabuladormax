import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

/**
 * SidebarTrigger seguro que só renderiza quando há contexto de sidebar
 * Evita erros quando usado fora de SidebarProvider (ex: agentes)
 */
export function SafeSidebarTrigger() {
  try {
    // Tenta acessar o contexto - se não existir, vai lançar erro
    const context = useSidebar();
    if (!context) return null;
    return <SidebarTrigger />;
  } catch {
    // Sem SidebarProvider, não renderiza nada
    return null;
  }
}
