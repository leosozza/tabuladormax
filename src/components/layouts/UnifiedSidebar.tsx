import { Home, Target, DollarSign, Shield, Headset } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base font-bold px-4 py-4">
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
      </SidebarContent>
    </Sidebar>
  );
}
