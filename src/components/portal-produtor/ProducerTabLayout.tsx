import { useState } from 'react';
import { LogOut, User, Mic, Briefcase, Handshake, LayoutDashboard, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProducerDealsTab, Deal } from './ProducerDealsTab';
import { ProducerDashboardTab } from './ProducerDashboardTab';
import { DealDetailView } from './DealDetailView';
import { cn } from '@/lib/utils';

interface ProducerTabLayoutProps {
  producerData: {
    id: string;
    name: string;
    photo: string | null;
  };
  onLogout: () => void;
}

export const ProducerTabLayout = ({ producerData, onLogout }: ProducerTabLayoutProps) => {
  const [activeView, setActiveView] = useState<'deals' | 'dashboard'>('deals');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [dealActiveTab, setDealActiveTab] = useState<'perfil' | 'agenciar'>('perfil');
  const [assistantTrigger, setAssistantTrigger] = useState(0);

  const handleCloseDeal = () => {
    setSelectedDeal(null);
    setDealActiveTab('perfil');
  };

  const handleDealSelect = (deal: Deal) => {
    setSelectedDeal(deal);
    setDealActiveTab('perfil');
  };

  const handleOpenAssistant = () => {
    // Primeiro garantir que está na aba agenciar
    setDealActiveTab('agenciar');
    // Incrementar trigger para abrir o assistente
    setAssistantTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {selectedDeal && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCloseDeal}
              className="mr-1"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src={producerData.photo || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {producerData.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold text-foreground">
              {selectedDeal ? selectedDeal.title : producerData.name}
            </h1>
            {selectedDeal && (
              <p className="text-xs text-muted-foreground">
                {selectedDeal.client_name}
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-24 pb-safe scrollbar-hide">
        {selectedDeal ? (
          <DealDetailView 
            deal={selectedDeal}
            onClose={handleCloseDeal}
            producerId={producerData.id}
            activeTab={dealActiveTab}
            openAssistantTrigger={assistantTrigger}
          />
        ) : (
          <>
            {activeView === 'deals' && (
              <ProducerDealsTab 
                producerId={producerData.id} 
                onDealSelect={handleDealSelect}
              />
            )}
            {activeView === 'dashboard' && (
              <ProducerDashboardTab producerId={producerData.id} />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 pb-safe">
        <div className="flex items-end justify-around px-6 pb-2 pt-1 max-w-lg mx-auto">
          
          {selectedDeal ? (
            // --- NAVEGAÇÃO DENTRO DO DEAL (3 botões) ---
            <>
              {/* Perfil do Modelo */}
              <button 
                onClick={() => setDealActiveTab('perfil')}
                className={cn(
                  "flex flex-col items-center py-2 px-4 rounded-lg transition-colors min-w-[72px]",
                  dealActiveTab === 'perfil' 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <User className="h-6 w-6" />
                <span className="text-[10px] mt-1 font-medium">Perfil</span>
              </button>
              
              {/* IA - Centro Elevado */}
              <button 
                onClick={handleOpenAssistant}
                className="flex flex-col items-center -mt-6"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow animate-pulse">
                  <Mic className="h-7 w-7 text-white" />
                </div>
                <span className="text-[10px] mt-1 font-semibold text-primary">Assistente</span>
              </button>
              
              {/* Agenciar */}
              <button 
                onClick={() => setDealActiveTab('agenciar')}
                className={cn(
                  "flex flex-col items-center py-2 px-4 rounded-lg transition-colors min-w-[72px]",
                  dealActiveTab === 'agenciar' 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <Handshake className="h-6 w-6" />
                <span className="text-[10px] mt-1 font-medium">Agenciar</span>
              </button>
            </>
          ) : (
            // --- NAVEGAÇÃO PRINCIPAL (2 botões) ---
            <>
              {/* Perfil */}
              <button 
                onClick={() => setShowProfile(true)}
                className="flex flex-col items-center py-2 px-6 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <Avatar className="h-7 w-7 border border-border">
                  <AvatarImage src={producerData.photo || undefined} />
                  <AvatarFallback className="text-xs bg-muted">
                    {producerData.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] mt-1 font-medium">Perfil</span>
              </button>
              
              {/* Deals */}
              <button 
                onClick={() => setActiveView('deals')}
                className={cn(
                  "flex flex-col items-center py-2 px-6 rounded-lg transition-colors",
                  activeView === 'deals' 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <Briefcase className="h-6 w-6" />
                <span className="text-[10px] mt-1 font-medium">Deals</span>
              </button>
            </>
          )}
          
        </div>
      </nav>

      {/* Profile Sheet */}
      <Sheet open={showProfile} onOpenChange={setShowProfile}>
        <SheetContent side="left" className="w-[300px] sm:w-[350px]">
          <SheetHeader>
            <SheetTitle>Meu Perfil</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20 border-4 border-primary/20">
                <AvatarImage src={producerData.photo || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {producerData.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{producerData.name}</h2>
            </div>

            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={() => {
                  setActiveView('dashboard');
                  setShowProfile(false);
                }}
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                onClick={onLogout}
              >
                <LogOut className="h-5 w-5" />
                Sair
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
