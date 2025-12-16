import { useNavigate } from 'react-router-dom';
import { BarChart3, Headset, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layouts/MainLayout';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function WhatsApp() {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <MainLayout
        title="WhatsApp"
        subtitle="Gerencie suas conversas"
        actions={
          <div className="flex items-center gap-2">
            {/* Botões de navegação */}
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
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">WhatsApp via Gupshup</h2>
            <p className="text-muted-foreground mb-4">
              O chat WhatsApp está disponível diretamente no Tabulador. 
              Acesse o lead desejado e utilize o painel de WhatsApp integrado.
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
