import { Home, Target, DollarSign, Shield, Smartphone, Phone, ChevronDown, Users, MessageSquare, TrendingUp, MapPin, FileText, Headset, BarChart3, ClipboardList, Workflow } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAllowedRoutes } from "@/hooks/useAllowedRoutes";
import { Skeleton } from "@/components/ui/skeleton";
import { UserInfo } from "@/components/layouts/UserInfo";
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
  { path: "/", label: "Dashboard Geral", icon: Home },
  { path: "/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { 
    path: "/telemarketing", 
    label: "Telemarketing", 
    icon: Headset,
    subItems: [
      { path: "/telemarketing", label: "Tabulador", icon: Headset },
      { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
      { path: "/discador", label: "Discador", icon: Phone },
    ]
  },
  { 
    path: "/scouter", 
    label: "Scouter", 
    icon: Target,
    subItems: [
      { path: "/scouter", label: "Dashboard", icon: Home },
      { path: "/scouter/leads", label: "Leads", icon: Users },
      { path: "/scouter/scouters", label: "Scouters", icon: Users },
      { path: "/scouter/projecao", label: "Projeção", icon: TrendingUp },
      { path: "/scouter/pagamentos", label: "Pagamentos", icon: DollarSign },
      { path: "/scouter/area", label: "Área de Abordagem", icon: MapPin },
      { path: "/scouter/relatorios", label: "Relatórios", icon: FileText },
    ]
  },
  { 
    path: "/roadmap", 
    label: "Planejamento", 
    icon: ClipboardList,
    subItems: [
      { path: "/roadmap", label: "Roadmap", icon: TrendingUp },
      { path: "/docs/processos", label: "Processos BPMN", icon: Workflow },
    ]
  },
  { path: "/agenciamento", label: "Agenciamento", icon: DollarSign },
  { path: "/admin", label: "Administrativo", icon: Shield },
];

export function UnifiedSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { allowedRoutes, loading: loadingRoutes, isAdmin } = useAllowedRoutes();
  
  // Auto-expandir submenu baseado na rota atual
  const [scouterOpen, setScouterOpen] = useState(
    location.pathname.startsWith('/scouter')
  );
  const [telemarketingOpen, setTelemarketingOpen] = useState(
    location.pathname.startsWith('/telemarketing') || location.pathname.startsWith('/discador') || location.pathname === '/dashboard'
  );
  const [planejamentoOpen, setPlanejamentoOpen] = useState(
    location.pathname.startsWith('/roadmap') || location.pathname.startsWith('/docs/processos')
  );

  // Atualizar estado quando a rota mudar
  useEffect(() => {
    setScouterOpen(location.pathname.startsWith('/scouter'));
    setTelemarketingOpen(location.pathname.startsWith('/telemarketing') || location.pathname.startsWith('/discador') || location.pathname === '/dashboard');
    setPlanejamentoOpen(location.pathname.startsWith('/roadmap') || location.pathname.startsWith('/docs/processos'));
  }, [location.pathname]);

  // Função para verificar se tem acesso a uma rota
  const canAccessRoute = (path: string): boolean => {
    if (isAdmin) return true;
    
    // Normalizar path "/" para "/home-choice" se necessário (compatibilidade)
    const normalizedPath = path === '/home-choice' ? '/' : path;
    return allowedRoutes.includes(normalizedPath) || allowedRoutes.includes(path);
  };

  // Filtrar itens do menu baseado nas permissões
  const filteredNavItems = useMemo(() => {
    if (loadingRoutes) return [];
    
    return mainNavItems
      .map(item => {
        if (item.subItems) {
          // Filtrar subItems permitidos
          const allowedSubItems = item.subItems.filter(sub => canAccessRoute(sub.path));
          
          // Se não tem nenhum subItem permitido, ocultar o item pai
          if (allowedSubItems.length === 0) return null;
          
          return { ...item, subItems: allowedSubItems };
        }
        
        // Item sem subItems - verificar acesso direto
        return canAccessRoute(item.path) ? item : null;
      })
      .filter(Boolean) as typeof mainNavItems;
  }, [allowedRoutes, loadingRoutes, isAdmin]);

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
          
          <SidebarGroupContent>
            {loadingRoutes ? (
              <div className="space-y-2 px-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <SidebarMenu>
                {filteredNavItems.map((item) => {
                  if (item.subItems) {
                    const isScouterMenu = item.path === '/scouter';
                    const isTelemarketingMenu = item.path === '/telemarketing';
                    const isPlanejamentoMenu = item.path === '/roadmap';
                    const menuOpen = isScouterMenu ? scouterOpen : isTelemarketingMenu ? telemarketingOpen : isPlanejamentoMenu ? planejamentoOpen : false;
                    const setMenuOpen = isScouterMenu ? setScouterOpen : isTelemarketingMenu ? setTelemarketingOpen : isPlanejamentoMenu ? setPlanejamentoOpen : () => {};
                    
                    return (
                      <Collapsible
                        key={item.path}
                        open={menuOpen}
                        onOpenChange={setMenuOpen}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.label}>
                              <item.icon className="h-4 w-4" />
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
                          end={item.path === "/"}
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {open && <span>{item.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User info and app download */}
        <div className="mt-auto p-4 space-y-3">
          {/* User info */}
          <UserInfo open={open} />
          
          {/* App download button */}
          {latestRelease && (
            <Button
              variant="ghost"
              size={open ? "default" : "icon"}
              onClick={handleDownloadApp}
              className={cn(
                "text-muted-foreground hover:text-foreground",
                open ? "w-full justify-start" : "w-8 h-8 p-0 mx-auto"
              )}
              title="Baixar App Android"
            >
              <Smartphone className="h-4 w-4" />
              {open && <span className="ml-2 text-xs">App Android v{latestRelease.version}</span>}
            </Button>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
