import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, ArrowLeft, Briefcase, LayoutDashboard, Mic } from 'lucide-react';
import { ProducerDealsTab, Deal } from './ProducerDealsTab';
import { ProducerDashboardTab } from './ProducerDashboardTab';
import { DealDetailView } from './DealDetailView';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface ProducerTabLayoutProps {
  producerData: {
    id: string;
    name: string;
    photo: string | null;
  };
  onLogout: () => void;
}

type ActiveView = 'deals' | 'dashboard';

export const ProducerTabLayout = ({ producerData, onLogout }: ProducerTabLayoutProps) => {
  const [activeView, setActiveView] = useState<ActiveView>('deals');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [dealActiveTab, setDealActiveTab] = useState<'perfil' | 'agenciar'>('perfil');

  const handleCloseDeal = () => {
    setSelectedDeal(null);
    setDealActiveTab('perfil'); // Reset ao fechar
  };

  const handleDealSelect = (deal: Deal) => {
    setSelectedDeal(deal);
    setDealActiveTab('perfil'); // Sempre começa no perfil
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Simplificado */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedDeal && (
                <Button variant="ghost" size="icon" onClick={handleCloseDeal} title="Voltar">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="font-bold text-lg">Olá, {producerData.name}!</h1>
                <p className="text-xs text-muted-foreground">Portal do Produtor</p>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={onLogout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-4">
        {selectedDeal ? (
          <DealDetailView 
            deal={selectedDeal} 
            onClose={handleCloseDeal}
            producerId={producerData.id}
            onTabChange={setDealActiveTab}
          />
        ) : (
          <>
            {activeView === 'deals' && (
              <ProducerDealsTab producerId={producerData.id} onDealSelect={handleDealSelect} />
            )}
            {activeView === 'dashboard' && (
              <ProducerDashboardTab producerId={producerData.id} />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 pb-safe">
        <div className={`flex items-end px-6 pb-2 pt-1 max-w-lg mx-auto ${
          selectedDeal && dealActiveTab === 'agenciar' ? 'justify-around' : 'justify-between'
        }`}>
          
          {/* Perfil - Esquerda */}
          <button 
            onClick={() => setShowProfile(true)}
            className="flex flex-col items-center py-2 px-4 rounded-lg transition-colors hover:bg-muted"
          >
            <Avatar className="h-7 w-7 border border-border">
              <AvatarImage src={producerData.photo || undefined} className="object-cover" />
              <AvatarFallback className="text-xs bg-muted">
                {producerData.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] mt-1 text-muted-foreground">Perfil</span>
          </button>
          
          {/* Botão IA - Centro (Elevado) - APENAS na aba Agenciar */}
          {selectedDeal && dealActiveTab === 'agenciar' && (
            <button 
              className="flex flex-col items-center -mt-6"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 
                            shadow-xl flex items-center justify-center border-4 border-background
                            hover:from-pink-600 hover:to-purple-700 transition-all
                            animate-[pulse-glow_2s_ease-in-out_infinite]">
                <Mic className="h-7 w-7 text-white" />
              </div>
              <span className="text-[10px] mt-1 font-semibold text-primary">Assistente</span>
            </button>
          )}
          
          {/* Deals - Direita */}
          <button 
            onClick={() => { setActiveView('deals'); setSelectedDeal(null); }}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              activeView === 'deals' && !selectedDeal ? 'text-primary' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Briefcase className="h-6 w-6" />
            <span className="text-[10px] mt-1">Deals</span>
          </button>
          
        </div>
      </nav>

      {/* Profile Sheet */}
      <Sheet open={showProfile} onOpenChange={setShowProfile}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Meu Perfil</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={producerData.photo || undefined} className="object-cover" />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {producerData.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg">{producerData.name}</h3>
                <p className="text-sm text-muted-foreground">Produtor</p>
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => { setActiveView('dashboard'); setShowProfile(false); }}
              >
                <LayoutDashboard className="h-4 w-4" />
                Ver Dashboard
              </Button>
              <Button 
                variant="destructive" 
                className="w-full justify-start gap-2"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" />
                Sair da Conta
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
