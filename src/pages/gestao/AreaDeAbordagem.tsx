import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseUtils";
import { GestaoPageLayout } from "@/components/layouts/GestaoPageLayout";
import { AreaAbordagemFilters, type AreaAbordagemFilters as FilterType } from "@/components/gestao/AreaAbordagemFilters";
import { LeadMapLocation, DrawnArea } from "@/components/gestao/AreaMap";
import UnifiedAreaMap from "@/components/gestao/maps/UnifiedAreaMap";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Users, TrendingUp, Target, BarChart3, Radio, Flame, Settings, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { geocodeAddress } from "@/hooks/useGeolocation";
import { createDateFilter } from "@/lib/dateUtils";
import { LeadColumnConfigProvider } from "@/hooks/useLeadColumnConfig";
import { ScouterHistorySettings } from "@/components/gestao/ScouterHistorySettings";

function GestaoAreaDeAbordagemContent() {
  const [filters, setFilters] = useState<FilterType>({
    dateFilter: createDateFilter('today'),
    projectId: null,
  });
  const [drawnAreas, setDrawnAreas] = useState<DrawnArea[]>([]);
  const [filteredAreaLeads, setFilteredAreaLeads] = useState<LeadMapLocation[]>([]);
  
  // Estado dos switches do mapa
  const [showScouters, setShowScouters] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLeads, setShowLeads] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);

  // Buscar leads com coordenadas (usar latitude/longitude existentes ou geocodificar)
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ["gestao-area-leads", filters],
    queryFn: async () => {
      // Usar fetchAllRecords para buscar TODOS os leads sem limite de 1000
      const data = await fetchAllRecords<{
        id: number;
        name: string | null;
        address: string | null;
        local_abordagem: string | null;
        latitude: number | null;
        longitude: number | null;
        scouter: string | null;
        status_fluxo: string | null;
        commercial_project_id: string | null;
        projeto_comercial: string | null;
        criado: string | null;
      }>(
        supabase,
        "leads",
        "id, name, address, local_abordagem, latitude, longitude, scouter, status_fluxo, commercial_project_id, projeto_comercial, criado",
        (query) => {
          // Aplicar filtros de data
          query = query
            .gte("criado", filters.dateFilter.startDate.toISOString())
            .lte("criado", filters.dateFilter.endDate.toISOString());
          
          // Aplicar filtro de projeto
          if (filters.projectId) {
            query = query.eq("commercial_project_id", filters.projectId);
          }
          
          // Hardcode: apenas leads de scouters (Scouter - Fichas)
          query = query.eq("fonte_normalizada", "Scouter - Fichas");
          
          return query;
        }
      );

      // Processar leads: usar coordenadas existentes ou geocodificar
      const geocodedLeads: LeadMapLocation[] = [];
      const geocodeCache = new Map<string, { lat: number; lng: number }>();
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      for (const lead of data) {
        // 1. Se já tem coordenadas, usar direto
        if (lead.latitude && lead.longitude) {
          geocodedLeads.push({
            id: lead.id,
            name: lead.name || "Sem nome",
            lat: Number(lead.latitude),
            lng: Number(lead.longitude),
            address: lead.address || lead.local_abordagem || "Sem endereço",
            scouter: lead.scouter || undefined,
            status: lead.status_fluxo || undefined,
            projectName: lead.projeto_comercial || undefined,
          });
          continue;
        }

        // 2. Geocodificar usando address OU local_abordagem como fallback
        const addressToGeocode = lead.address || lead.local_abordagem;
        if (!addressToGeocode) continue;

        let coords = geocodeCache.get(addressToGeocode);
        if (!coords) {
          const result = await geocodeAddress(addressToGeocode);
          if (result) {
            coords = result;
            geocodeCache.set(addressToGeocode, coords);
            
            // Salvar coordenadas no banco para cache futuro
            await supabase.from('leads').update({
              latitude: coords.lat,
              longitude: coords.lng,
              geocoded_at: new Date().toISOString()
            }).eq('id', lead.id);
            
            await delay(1000); // Rate limit
          }
        }

        if (coords) {
          geocodedLeads.push({
            id: lead.id,
            name: lead.name || "Sem nome",
            lat: coords.lat,
            lng: coords.lng,
            address: addressToGeocode,
            scouter: lead.scouter || undefined,
            status: lead.status_fluxo || undefined,
            projectName: lead.projeto_comercial || undefined,
          });
        }
      }

      console.log(`✅ Processados ${geocodedLeads.length} leads com coordenadas`);
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
          
          // Hardcode: apenas leads de scouters (Scouter - Fichas)
          query = query.eq("fonte_normalizada", "Scouter - Fichas");
          
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

  // Contar scouters ativos no dia a partir do histórico de localização
  const { data: activeScoutersCount } = useQuery({
    queryKey: [
      "scouter-active-count",
      filters.dateFilter.startDate,
      filters.dateFilter.endDate,
    ],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scouter_location_history")
        .select("scouter_bitrix_id")
        .gte("recorded_at", filters.dateFilter.startDate.toISOString())
        .lte("recorded_at", filters.dateFilter.endDate.toISOString());

      if (error) {
        console.error("Erro ao buscar scouters ativos:", error);
        throw error;
      }

      const unique = new Set<number>();
      data?.forEach((row) => {
        if (row.scouter_bitrix_id != null) {
          unique.add(row.scouter_bitrix_id as number);
        }
      });

      return unique.size;
    },
    refetchInterval: 30000,
  });

  const totalAreas = areasData?.length || 0;
  const totalLeads = areasData?.reduce((sum, a) => sum + a.count, 0) || 0;
  const avgLeadsPerArea = totalAreas > 0 ? (totalLeads / totalAreas).toFixed(1) : "0";
  const totalScoutersActive = activeScoutersCount ?? 0;

  // Agrupar leads filtrados por projeto e scouter
  const groupedByProjectScouter = useMemo(() => {
    if (!filteredAreaLeads || filteredAreaLeads.length === 0) return {};
    
    const grouped: Record<string, Record<string, number>> = {};
    
    filteredAreaLeads.forEach(lead => {
      const project = lead.projectName || "Sem Projeto";
      const scouter = lead.scouter || "Sem Scouter";
      
      if (!grouped[project]) {
        grouped[project] = {};
      }
      
      if (!grouped[project][scouter]) {
        grouped[project][scouter] = 0;
      }
      
      grouped[project][scouter]++;
    });
    
    return grouped;
  }, [filteredAreaLeads]);

  return (
    <GestaoPageLayout
      title="Área de Abordagem"
      description="Análise geográfica e heatmaps de leads"
    >
      <AreaAbordagemFilters 
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

        {/* Mapa Unificado */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Mapa de Área
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Controle as camadas do mapa e desenhe áreas para análise
                </p>
              </div>
              
              {/* Controles de Layer */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={showScouters} 
                    onCheckedChange={setShowScouters}
                    id="show-scouters"
                  />
                  <Label htmlFor="show-scouters" className="flex items-center gap-1 cursor-pointer">
                    <Radio className="w-4 h-4 text-green-600" />
                    Scouters
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={showHeatmap} 
                    onCheckedChange={setShowHeatmap}
                    id="show-heatmap"
                  />
                  <Label htmlFor="show-heatmap" className="flex items-center gap-1 cursor-pointer">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Temperatura
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={showLeads} 
                    onCheckedChange={setShowLeads}
                    id="show-leads"
                  />
                  <Label htmlFor="show-leads" className="flex items-center gap-1 cursor-pointer">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Leads
                  </Label>
                </div>
                
                {/* Botão Lápis - sempre visível */}
                <Button 
                  variant={isDrawing ? "default" : "outline"} 
                  size="icon"
                  onClick={() => setIsDrawing(!isDrawing)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
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
              <UnifiedAreaMap
                projectId={filters.projectId}
                dateRange={{
                  startDate: filters.dateFilter.startDate,
                  endDate: filters.dateFilter.endDate,
                }}
                showScouters={showScouters}
                showHeatmap={showHeatmap}
                showLeads={showLeads}
                isDrawing={isDrawing}
                onDrawingChange={setIsDrawing}
                onAreaCreated={(area) => setDrawnAreas(prev => [...prev, area])}
                onAreaDeleted={(areaId) => setDrawnAreas(prev => prev.filter(a => a.id !== areaId))}
                onAreasSelectionChanged={(_, filteredLeads) => setFilteredAreaLeads(filteredLeads)}
              />
            )}
          </CardContent>
        </Card>

        {/* Áreas desenhadas - análise detalhada */}
        {drawnAreas.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Análise de Áreas Desenhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {drawnAreas.map(area => (
                  <div key={area.id} className="p-4 border rounded-lg bg-accent/20">
                    <div className="flex justify-between items-center mb-4">
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
                    
                    {/* Hierarquia: Projeto → Scouter → Fichas */}
                    {Object.keys(groupedByProjectScouter).length > 0 && (
                      <div className="border-t pt-4">
                        <h5 className="text-sm font-medium mb-3 text-muted-foreground">
                          Distribuição por Projeto e Scouter
                        </h5>
                        <div className="space-y-4">
                          {Object.entries(groupedByProjectScouter)
                            .sort(([, a], [, b]) => {
                              const totalA = Object.values(a).reduce((sum, v) => sum + v, 0);
                              const totalB = Object.values(b).reduce((sum, v) => sum + v, 0);
                              return totalB - totalA;
                            })
                            .map(([project, scouters]) => (
                              <div key={project} className="bg-background/50 rounded-lg p-3">
                                {/* Projeto */}
                                <div className="flex items-center gap-2 mb-2">
                                  <Target className="w-4 h-4 text-primary" />
                                  <span className="font-semibold text-sm">{project}</span>
                                  <Badge variant="secondary" className="ml-auto">
                                    {Object.values(scouters).reduce((a, b) => a + b, 0)} fichas
                                  </Badge>
                                </div>
                                
                                {/* Scouters do projeto */}
                                <div className="ml-6 space-y-1">
                                  {Object.entries(scouters)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([scouter, count]) => (
                                      <div 
                                        key={scouter}
                                        className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-accent/30"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Users className="w-3 h-3 text-muted-foreground" />
                                          <span>{scouter}</span>
                                        </div>
                                        <span className="font-medium text-primary">
                                          {count} {count === 1 ? 'ficha' : 'fichas'}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs apenas para Análise e Config */}
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="analysis">
              <BarChart3 className="w-4 h-4 mr-2" />
              Análise Estatística
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="settings" className="space-y-4">
            <ScouterHistorySettings />
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
