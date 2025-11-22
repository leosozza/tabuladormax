import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseUtils";
import { GestaoPageLayout } from "@/components/layouts/GestaoPageLayout";
import { GestaoFiltersComponent } from "@/components/gestao/GestaoFilters";
import AreaMap, { LeadMapLocation, DrawnArea } from "@/components/gestao/AreaMap";
import ScouterLocationMap from "@/components/gestao/maps/ScouterLocationMap";
import HeatmapFichasMap from "@/components/gestao/maps/HeatmapFichasMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Users, TrendingUp, Target, BarChart3, Radio, Flame } from "lucide-react";
import { geocodeAddress } from "@/hooks/useGeolocation";
import { createDateFilter } from "@/lib/dateUtils";
import type { GestaoFilters as FilterType } from "@/types/filters";
import { LeadColumnConfigProvider } from "@/hooks/useLeadColumnConfig";

function GestaoAreaDeAbordagemContent() {
  const [filters, setFilters] = useState<FilterType>({
    dateFilter: createDateFilter('month'),
    projectId: null,
    scouterId: null,
  });
  const [drawnAreas, setDrawnAreas] = useState<DrawnArea[]>([]);

  // Buscar leads com coordenadas
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ["gestao-area-leads", filters],
    queryFn: async () => {
      // Usar fetchAllRecords para buscar TODOS os leads sem limite de 1000
      const data = await fetchAllRecords<{
        id: number;
        name: string | null;
        address: string | null;
        local_abordagem: string | null;
        scouter: string | null;
        status_fluxo: string | null;
        commercial_project_id: string | null;
        criado: string | null;
      }>(
        supabase,
        "leads",
        "id, name, address, local_abordagem, scouter, status_fluxo, commercial_project_id, criado",
        (query) => {
          // Aplicar filtros de data
          query = query
            .gte("criado", filters.dateFilter.startDate.toISOString())
            .lte("criado", filters.dateFilter.endDate.toISOString());
          
          // Aplicar filtro de projeto
          if (filters.projectId) {
            query = query.eq("commercial_project_id", filters.projectId);
          }
          
          // Aplicar filtro de scouter
          if (filters.scouterId) {
            query = query.eq("scouter", filters.scouterId);
          }
          
          return query;
        }
      );

      // Geocodificar endereços (cache simples + rate limiting)
      const geocodedLeads: LeadMapLocation[] = [];
      const geocodeCache = new Map<string, { lat: number; lng: number }>();

      // Adicionar delay entre requests para respeitar rate limit do Nominatim
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      for (const lead of data) {
        if (!lead.address) continue;

        let coords = geocodeCache.get(lead.address);
        if (!coords) {
          const result = await geocodeAddress(lead.address);
          if (result) {
            coords = result;
            geocodeCache.set(lead.address, coords);
            // Delay de 1 segundo entre requests (politica do Nominatim)
            await delay(1000);
          }
        }

        if (coords) {
          geocodedLeads.push({
            id: lead.id,
            name: lead.name || "Sem nome",
            lat: coords.lat,
            lng: coords.lng,
            address: lead.address,
            scouter: lead.scouter || undefined,
            status: lead.status_fluxo || undefined,
          });
        }
      }

      return geocodedLeads;
    },
  });

  // Estatísticas por área
  const { data: areasData, isLoading: areasLoading } = useQuery({
    queryKey: ["gestao-areas", filters],
    queryFn: async () => {
      // Usar fetchAllRecords para buscar TODOS os leads sem limite de 1000
      const data = await fetchAllRecords<{
        local_abordagem: string | null;
        address: string | null;
        scouter: string | null;
      }>(
        supabase,
        "leads",
        "local_abordagem, address, scouter",
        (query) => {
          query = query.not("local_abordagem", "is", null);
          
          // Aplicar filtros de data
          query = query
            .gte("criado", filters.dateFilter.startDate.toISOString())
            .lte("criado", filters.dateFilter.endDate.toISOString());
          
          // Aplicar filtro de projeto
          if (filters.projectId) {
            query = query.eq("commercial_project_id", filters.projectId);
          }
          
          // Aplicar filtro de scouter
          if (filters.scouterId) {
            query = query.eq("scouter", filters.scouterId);
          }
          
          return query;
        }
      );

      // Agrupar por local de abordagem
      const areaCounts = data.reduce((acc: any, lead) => {
        const area = lead.local_abordagem || "Sem localização";
        if (!acc[area]) {
          acc[area] = { 
            count: 0, 
            addresses: new Set(),
            scouters: new Set()
          };
        }
        acc[area].count++;
        if (lead.address) {
          acc[area].addresses.add(lead.address);
        }
        if (lead.scouter) {
          acc[area].scouters.add(lead.scouter);
        }
        return acc;
      }, {});

      return Object.entries(areaCounts)
        .map(([area, data]: [string, any]) => ({
          area,
          count: data.count,
          uniqueAddresses: data.addresses.size,
          uniqueScouters: data.scouters.size
        }))
        .sort((a, b) => b.count - a.count);
    },
  });

  const totalAreas = areasData?.length || 0;
  const totalLeads = areasData?.reduce((sum, a) => sum + a.count, 0) || 0;
  const avgLeadsPerArea = totalAreas > 0 ? (totalLeads / totalAreas).toFixed(1) : "0";
  const totalScoutersActive = areasData?.reduce((sum, a) => sum + a.uniqueScouters, 0) || 0;

  return (
    <GestaoPageLayout
      title="Área de Abordagem"
      description="Análise geográfica e heatmaps de leads"
    >
      <GestaoFiltersComponent 
        filters={filters}
        onChange={setFilters}
      />

      {/* Métricas principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Áreas Identificadas
              </CardTitle>
              <MapPin className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalAreas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
              </CardTitle>
              <Users className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalLeads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média por Área
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgLeadsPerArea}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Scouters Ativos
              </CardTitle>
              <Target className="w-5 h-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalScoutersActive}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: 3 Tipos de Mapas */}
        <Tabs defaultValue="scouters" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="scouters">
              <Radio className="w-4 h-4 mr-2" />
              Scouters em Tempo Real
            </TabsTrigger>
            <TabsTrigger value="heatmap">
              <Flame className="w-4 h-4 mr-2" />
              Mapa de Calor - Fichas
            </TabsTrigger>
            <TabsTrigger value="areas">
              <MapPin className="w-4 h-4 mr-2" />
              Desenho de Áreas
            </TabsTrigger>
            <TabsTrigger value="analysis">
              <BarChart3 className="w-4 h-4 mr-2" />
              Análise Estatística
            </TabsTrigger>
          </TabsList>

          {/* Mapa 1: Localização em Tempo Real de Scouters */}
          <TabsContent value="scouters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-green-600" />
                  Localização em Tempo Real dos Scouters
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Veja onde seus scouters estão atuando no momento e quantos leads cada um captou
                </p>
              </CardHeader>
              <CardContent>
                <ScouterLocationMap
                  projectId={filters.projectId}
                  scouterId={filters.scouterId}
                  dateRange={{
                    startDate: filters.dateFilter.startDate,
                    endDate: filters.dateFilter.endDate,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mapa 2: Mapa de Calor de Fichas */}
          <TabsContent value="heatmap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-600" />
                  Mapa de Calor - Fichas Confirmadas
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Visualize as áreas com maior concentração de fichas confirmadas e comparecimentos
                </p>
              </CardHeader>
              <CardContent>
                <HeatmapFichasMap
                  projectId={filters.projectId}
                  scouterId={filters.scouterId}
                  dateRange={{
                    startDate: filters.dateFilter.startDate,
                    endDate: filters.dateFilter.endDate,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mapa 3: Desenho de Áreas */}
          <TabsContent value="areas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Análise com Desenho de Áreas
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Clique em "Desenhar Área" para delimitar regiões e analisar leads dentro delas
                </p>
              </CardHeader>
              <CardContent>
                {leadsLoading ? (
                  <div className="h-[600px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Carregando mapa...</p>
                    </div>
                  </div>
                ) : (
                  <AreaMap
                    leads={leadsData || []}
                    onAreaCreated={(area) => setDrawnAreas(prev => [...prev, area])}
                    onAreaDeleted={(areaId) => setDrawnAreas(prev => prev.filter(a => a.id !== areaId))}
                  />
                )}
              </CardContent>
            </Card>

            {/* Áreas desenhadas - análise detalhada */}
            {drawnAreas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Áreas Desenhadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {drawnAreas.map(area => (
                      <div key={area.id} className="p-4 border rounded-lg bg-accent/20">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">{area.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {area.leadCount} leads identificados nesta área
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{area.leadCount}</div>
                            <div className="text-xs text-muted-foreground">leads</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {areasLoading ? (
              <div className="text-center py-12">Carregando análise...</div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Local de Abordagem</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ranking de áreas com mais captação de leads
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {areasData?.map((area, index) => (
                      <div
                        key={area.area}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-semibold">{area.area}</div>
                            <div className="text-sm text-muted-foreground">
                              {area.uniqueAddresses} endereço(s) • {area.uniqueScouters} scouter(s)
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{area.count}</div>
                          <div className="text-sm text-muted-foreground">leads</div>
                        </div>
                      </div>
                    ))}
                    {areasData?.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        Nenhuma área registrada com os filtros aplicados
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
    </GestaoPageLayout>
  );
}

export default function GestaoAreaDeAbordagem() {
  return (
    <LeadColumnConfigProvider>
      <GestaoAreaDeAbordagemContent />
    </LeadColumnConfigProvider>
  );
}
