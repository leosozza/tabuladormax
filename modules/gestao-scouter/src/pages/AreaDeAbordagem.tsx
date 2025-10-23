/**
 * Página de Área de Abordagem
 * Mostra mapa único com toggle: Scouters (clustering) ou Leads (heatmap + desenho)
 * Dados lidos diretamente do Supabase
 */
import { useState, useEffect } from 'react';
import { AppShell } from '@/layouts/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedMap } from '@/components/map/UnifiedMap';
import { LeadsTab } from './AreaDeAbordagem/LeadsTab';
import { MapPin, Flame, RefreshCw, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { useScouters } from '@/hooks/useScouters';
import { useLeads } from '@/hooks/useLeads';
import './AreaDeAbordagem/mobile.css';

export default function AreaDeAbordagem() {
  const { toast } = useToast();
  const [isEnriching, setIsEnriching] = useState(false);
  
  // Filter states (kept for future use, currently not filtering)
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch data from Supabase
  const { data: scouters, refetch: refetchScouters } = useScouters();
  const { data: leads, refetch: refetchFichas } = useLeads({ withGeo: true });

  // Stats
  const totalScouters = scouters?.length || 0;
  const totalLeads = leads?.length || 0;

  const handleEnrichGeo = async () => {
    setIsEnriching(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/leads-geo-enrich?limit=50`,
        {
          method: 'POST',
          headers: {
            'X-Secret': import.meta.env.VITE_SHEETS_SYNC_SHARED_SECRET || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao enriquecer geolocalização');
      }

      const result = await response.json();
      
      toast({
        title: 'Geolocalização Atualizada',
        description: `${result.processed} leads processadas, ${result.geocoded} geocodificadas`,
      });
      
      // Refresh data after enrichment
      refetchScouters();
      refetchFichas();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enriquecer a geolocalização',
        variant: 'destructive',
      });
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Área de Abordagem</h1>
            <p className="text-muted-foreground mt-1">
              Visualize e analise scouters e leads com clustering e desenho de área
            </p>
          </div>
          <Button 
            onClick={handleEnrichGeo}
            disabled={isEnriching}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isEnriching ? 'animate-spin' : ''}`} />
            Enriquecer Geolocalização
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Scouters
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalScouters}</div>
              <p className="text-xs text-muted-foreground">
                Com coordenadas válidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Leads
              </CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <p className="text-xs text-muted-foreground">
                Com localização mapeada
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different map modes */}
        <Tabs defaultValue="unified" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="unified" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Modo Unificado
            </TabsTrigger>
            <TabsTrigger value="fichas" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Análise de Leads
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="unified" className="mt-4">
            <div className="h-[700px]">
              <UnifiedMap 
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="fichas" className="mt-4">
            <div className="h-[700px]">
              <LeadsTab />
            </div>
          </TabsContent>
        </Tabs>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sobre os Modos do Mapa</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Modo Unificado:</strong> Toggle entre Scouters (clustering com círculos amarelos) 
              e Leads (heatmap colorido). Zoom in/out para ajustar visualização.
            </p>
            <p>
              <strong>Análise de Leads:</strong> Modo avançado com desenho de polígono. 
              Clique em "Desenhar" → desenhe área no mapa (duplo clique para finalizar) → 
              receba análise detalhada por Projeto e Scouter.
            </p>
            <p>
              <strong>Clustering:</strong> Ambos os modos usam clustering para agrupar pontos próximos. 
              Números indicam quantidade de itens. Clique para aproximar e separar.
            </p>
            <p>
              <strong>Fonte de Dados:</strong> Dados carregados do Supabase em tempo real. 
              Botão "Recarregar" atualiza dados.
            </p>
            <p>
              <strong>Mobile:</strong> Controles otimizados para toque. Botões ≥44px. 
              Painéis não bloqueiam interação durante desenho.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
