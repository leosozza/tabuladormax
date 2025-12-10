import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, ArrowLeft, Briefcase, LayoutDashboard } from 'lucide-react';
import { ProducerDealsTab, Deal } from './ProducerDealsTab';
import { ProducerDashboardTab } from './ProducerDashboardTab';
import { DealDetailView } from './DealDetailView';

interface ProducerTabLayoutProps {
  producerData: {
    id: string;
    name: string;
    photo: string | null;
  };
  onLogout: () => void;
}

export const ProducerTabLayout = ({ producerData, onLogout }: ProducerTabLayoutProps) => {
  const [activeTab, setActiveTab] = useState<'deals' | 'dashboard'>('deals');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const handleCloseDeal = () => {
    setSelectedDeal(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Área do perfil */}
            <div className="flex items-center gap-3">
              {selectedDeal && (
                <Button variant="ghost" size="icon" onClick={handleCloseDeal} title="Voltar">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              
              <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-lg">
                <AvatarImage src={producerData.photo || undefined} className="object-cover" />
                <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                  {producerData.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <h1 className="font-bold text-lg">Olá, {producerData.name}!</h1>
                <p className="text-sm text-muted-foreground">Portal do Produtor</p>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onLogout} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {selectedDeal ? (
          <DealDetailView 
            deal={selectedDeal} 
            onClose={handleCloseDeal}
            producerId={producerData.id}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'deals' | 'dashboard')}>
            <TabsList className="grid w-full grid-cols-2 h-12 mb-4">
              <TabsTrigger value="deals" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Deals
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="deals" className="mt-0">
              <ProducerDealsTab producerId={producerData.id} onDealSelect={setSelectedDeal} />
            </TabsContent>
            
            <TabsContent value="dashboard" className="mt-0">
              <ProducerDashboardTab producerId={producerData.id} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};