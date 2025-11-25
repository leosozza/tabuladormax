import { Home, Target, DollarSign, Shield, Headset, Smartphone, Phone, ChevronDown } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const mainNavItems = [
  { path: "/home-choice", label: "Dashboard Geral", icon: Home },
  { 
    path: "/telemarketing", 
    label: "Telemarketing", 
    icon: Headset,
    subItems: [
      { path: "/telemarketing", label: "Tabulação" },
      { path: "/discador", label: "Discador", icon: Phone },
    ]
  },
  { path: "/scouter", label: "Scouter", icon: Target },
  { path: "/agenciamento", label: "Agenciamento", icon: DollarSign },
  { path: "/admin", label: "Administrativo", icon: Shield },
];

export function UnifiedSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const [telemarketingOpen, setTelemarketingOpen] = useState(false);

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
    <Sidebar collapsible="icon" className="w-64">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel 
            className="text-xl font-bold px-4 py-6 flex items-center justify-between cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate('/home-choice')}
          >
            {open && "Maxconnect"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent className="px-3 py-4">
            <SidebarMenu>
              {mainNavItems.map((item) => {
                if (item.subItems) {
                  return (
                    <Collapsible
                      key={item.path}
                      open={telemarketingOpen}
                      onOpenChange={setTelemarketingOpen}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.label}>
                            <item.icon className="h-5 w-5" />
                            {open && <span>{item.label}</span>}
                            {open && <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.path}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink 
                                    to={subItem.path}
                                    className="flex items-center gap-3 px-4 py-2 text-sm rounded-lg"
                                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  >
                                    {subItem.icon && <subItem.icon className="h-4 w-4" />}
                                    {open && <span>{subItem.label}</span>}
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink 
                        to={item.path} 
                        end={item.path === "/home-choice"}
                        className="flex items-center gap-3 px-4 py-3 text-base rounded-lg mb-1 transition-all duration-200"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-md"
                      >
                        <item.icon className="h-5 w-5" />
                        {open && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
