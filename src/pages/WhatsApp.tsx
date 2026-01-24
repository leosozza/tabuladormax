import { useState, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { BarChart3, Headset, MessageSquare, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layouts/MainLayout';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDepartmentAccess } from '@/hooks/useDepartmentAccess';
import { AdminConversationList } from '@/components/whatsapp/AdminConversationList';
import { WhatsAppChatContainer } from '@/components/whatsapp/WhatsAppChatContainer';
import { AdminConversation } from '@/hooks/useAdminWhatsAppConversations';
import { Skeleton } from '@/components/ui/skeleton';
import { WhatsAppNotificationBell } from '@/components/whatsapp/WhatsAppNotificationBell';

export default function WhatsApp() {
  const navigate = useNavigate();
  const { canAccessAdmin, loading: accessLoading } = useDepartmentAccess();
  const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null);

  // Handle notification click to open conversation - MUST be before any early returns
  const handleNotificationClick = useCallback((phoneNumber: string, bitrixId?: string) => {
    setSelectedConversation({
      phone_number: phoneNumber,
      bitrix_id: bitrixId || null,
      lead_name: null,
      lead_id: null,
      last_message_at: new Date().toISOString(),
      last_message_preview: null,
      last_message_direction: null,
      last_customer_message_at: null,
      unread_count: 0,
      total_messages: 0,
      is_window_open: false,
      last_operator_name: null,
      last_operator_photo_url: null,
      lead_etapa: null,
      response_status: null,
      deal_stage_id: null,
      deal_status: null,
      deal_category_id: null,
      deal_count: 0,
      deal_title: null,
    });
  }, []);

  // Loading state
  if (accessLoading) {
    return (
      <MainLayout title="Central de Atendimento" subtitle="Carregando...">
        <div className="flex h-[calc(100vh-12rem)]">
          <div className="w-80 border-r p-4 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Skeleton className="h-32 w-64" />
          </div>
        </div>
      </MainLayout>
    );
  }

  // Access denied - redirect to home
  if (!canAccessAdmin) {
    return (
      <TooltipProvider>
        <MainLayout
          title="Central de Atendimento"
          subtitle="Acesso restrito"
          actions={
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" onClick={() => navigate('/dashboard')}>
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Dashboard</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none" onClick={() => navigate('/telemarketing')}>
                      <Headset className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tabulador</TooltipContent>
                </Tooltip>
              </div>
            </div>
          }
        >
          <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
            <div className="text-center max-w-md">
              <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
              <p className="text-muted-foreground mb-4">
                Esta página é acessível apenas para administradores.
                O chat WhatsApp está disponível diretamente no Tabulador.
              </p>
              <Button onClick={() => navigate('/telemarketing')}>
                <Headset className="w-4 h-4 mr-2" />
                Ir para Tabulador
              </Button>
            </div>
          </div>
        </MainLayout>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <MainLayout
        title="Central de Atendimento"
        subtitle="Central de Mensagens"
        fullWidth
        actions={
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <WhatsAppNotificationBell onNotificationClick={handleNotificationClick} />
            
            <div className="flex items-center border rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" onClick={() => navigate('/dashboard')}>
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Dashboard</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none" onClick={() => navigate('/telemarketing')}>
                    <Headset className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tabulador</TooltipContent>
              </Tooltip>
            </div>
          </div>
        }
      >
        <div className="flex h-full overflow-hidden bg-background">
          {/* Conversation List - Left Panel */}
          <div className="w-96 lg:w-[28rem] xl:w-[32rem] flex-shrink-0 h-full overflow-y-auto border-r">
            <AdminConversationList
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
            />
          </div>

          {/* Chat Container - Right Panel */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <WhatsAppChatContainer
                phoneNumber={selectedConversation.phone_number || undefined}
                bitrixId={selectedConversation.bitrix_id || undefined}
                contactName={selectedConversation.lead_name || selectedConversation.phone_number || 'Contato'}
                onClose={() => setSelectedConversation(null)}
                variant="fullscreen"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-muted/30">
                <div className="text-center max-w-sm">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
                  <p className="text-sm text-muted-foreground">
                    Escolha uma conversa na lista à esquerda para visualizar as mensagens e interagir com o contato.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </TooltipProvider>
  );
}
