import { Home, Target, DollarSign, Shield, Headset, Smartphone } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNavItems = [
  { path: "/home-choice", label: "Dashboard Geral", icon: Home },
  { path: "/telemarketing", label: "Telemarketing", icon: Headset },
  { path: "/scouter", label: "Scouter", icon: Target },
  { path: "/agenciamento", label: "Agenciamento", icon: DollarSign },
  { path: "/admin", label: "Administrativo", icon: Shield },
];

export function UnifiedSidebar() {
  const { open } = useSidebar();

  // Buscar a versão mais recente do APK
  const { data: latestRelease } = useQuery({
    queryKey: ['latest-app-release'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_releases')
        .select('*')
        .eq('is_latest', true)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const handleDownloadApp = async () => {
    if (!latestRelease) {
      toast.error('Nenhuma versão disponível');
      return;
    }

    try {
      const { data } = supabase.storage
        .from('app-releases')
        .getPublicUrl(latestRelease.file_path);
      
      // Criar elemento <a> temporário para forçar download
      const link = document.createElement('a');
      link.href = data.publicUrl;
      link.download = `tabuladormax-${latestRelease.version}.apk`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download iniciado!');
    } catch (error) {
      toast.error('Erro ao baixar o aplicativo');
      console.error(error);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base font-bold px-4 py-4 flex items-center justify-between">
            {open && "Maxconnect"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink 
                      to={item.path} 
                      end={item.path === "/home-choice"}
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-5 w-5" />
                      {open && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Botão discreto para baixar o app Android */}
        {latestRelease && (
          <div className="mt-auto p-4">
            <Button
              variant="ghost"
              size={open ? "default" : "icon"}
              onClick={handleDownloadApp}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              title="Baixar App Android"
            >
              <Smartphone className="h-4 w-4" />
              {open && <span className="ml-2 text-xs">App Android v{latestRelease.version}</span>}
            </Button>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
