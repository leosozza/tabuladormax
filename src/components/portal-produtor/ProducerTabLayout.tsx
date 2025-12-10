import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Briefcase, LayoutDashboard } from 'lucide-react';
import { ProducerDealsTab } from './ProducerDealsTab';
import { ProducerDashboardTab } from './ProducerDashboardTab';

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Área do perfil */}
            <div className="flex items-center gap-4">
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

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'deals' | 'dashboard')} className="w-full">
        <div className="border-b bg-card/50 sticky top-[73px] z-10">
          <div className="container mx-auto px-4">
            <TabsList className="h-12 bg-transparent gap-4">
              <TabsTrigger 
                value="deals" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Deals
              </TabsTrigger>
              <TabsTrigger 
                value="dashboard" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab Content */}
        <main className="container mx-auto px-4 py-6">
          <TabsContent value="deals" className="mt-0">
            <ProducerDealsTab producerId={producerData.id} />
          </TabsContent>
          
          <TabsContent value="dashboard" className="mt-0">
            <ProducerDashboardTab producerId={producerData.id} />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
};
