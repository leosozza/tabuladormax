import { useState } from 'react';
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

export default function WhatsApp() {
  const navigate = useNavigate();
  const { isAdmin, loading: accessLoading } = useDepartmentAccess();
  const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null);

  // Loading state
  if (accessLoading) {
    return (
      <MainLayout title="WhatsApp" subtitle="Carregando...">
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
  if (!isAdmin) {
    return (
      <TooltipProvider>
        <MainLayout
          title="WhatsApp"
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
        title="WhatsApp"
        subtitle="Central de Mensagens"
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
        <div className="flex h-[calc(100vh-10rem)] rounded-lg border overflow-hidden bg-background">
          {/* Conversation List - Left Panel */}
          <div className="w-80 lg:w-96 flex-shrink-0">
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
