import { LayoutDashboard, TrendingUp, ClipboardList, Users, Wallet, MapPin, Settings, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useSidebar()
  const { signOut, userProfile } = useAuthContext()
  
  const items = [
    { key: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { key: '/projecao', icon: TrendingUp, label: 'Projeção' },
    { key: '/leads', icon: ClipboardList, label: 'Leads' },
    { key: '/scouters', icon: Users, label: 'Scouters' },
    { key: '/pagamentos', icon: Wallet, label: 'Pagamentos' },
    { key: '/area-de-abordagem', icon: MapPin, label: 'Área de Abordagem' },
    { key: '/configuracoes', icon: Settings, label: 'Configurações' },
  ]

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      toast.error('Erro ao fazer logout')
    } else {
      toast.success('Logout realizado com sucesso')
      navigate('/login')
    }
  }
  
  return (
    <SidebarUI>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => {
                const isActive = location.pathname === item.key
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.key)}
                      isActive={isActive}
                      tooltip={state === 'collapsed' ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="px-2 py-2">
              {userProfile && (
                <div className="mb-2 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground truncate">{userProfile.name}</div>
                  <div className="truncate">{userProfile.email}</div>
                </div>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarUI>
  )
}