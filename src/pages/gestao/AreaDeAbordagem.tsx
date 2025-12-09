import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllLeads } from "@/lib/supabaseUtils";
import { GestaoPageLayout } from "@/components/layouts/GestaoPageLayout";
import { AreaAbordagemFilters, type AreaAbordagemFilters as FilterType } from "@/components/gestao/AreaAbordagemFilters";
import { LeadMapLocation, DrawnArea } from "@/components/gestao/AreaMap";
import UnifiedAreaMap from "@/components/gestao/maps/UnifiedAreaMap";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Users, Target, BarChart3, Radio, Flame, Settings, Pencil, Square, Check, X, Maximize2, Minimize2, CloudSun, Car, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createDateFilter } from "@/lib/dateUtils";
import { LeadColumnConfigProvider } from "@/hooks/useLeadColumnConfig";
import { ScouterHistorySettings } from "@/components/gestao/ScouterHistorySettings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WeatherBadge } from "@/components/gestao/WeatherBadge";
import { WeatherForecast } from "@/components/gestao/WeatherForecast";
import { TrafficInfo } from "@/components/gestao/TrafficInfo";
import { RouteOptimizer } from "@/components/gestao/RouteOptimizer";
import { POIMarkers } from "@/components/gestao/maps/POIMarkers";
import { RoutePolyline } from "@/components/gestao/maps/RoutePolyline";
import { usePOIs, POICategory } from "@/hooks/usePOIs";
import { AreaPOIDialog } from "@/components/gestao/maps/AreaPOIDialog";
import { OptimizedRoute } from "@/hooks/useRouteOptimization";
import { MapLayerSelector, MAP_LAYERS, MapLayerOption } from "@/components/gestao/maps/MapLayerSelector";
import { cn } from "@/lib/utils";
import type L from "leaflet";

// Interface para os dados raw dos leads
interface LeadRawData {
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
  photo_url: string | null;
  ficha_confirmada: boolean | null;
  data_criacao_ficha: string | null;
}

function GestaoAreaDeAbordagemContent() {
  const [filters, setFilters] = useState<FilterType>({
    dateFilter: createDateFilter('today'),
    projectId: null,
  });
  const [drawnAreas, setDrawnAreas] = useState<DrawnArea[]>([]);
  const [filteredAreaLeads, setFilteredAreaLeads] = useState<LeadMapLocation[]>([]);
  
  // Estado dos switches do mapa - todos desativados por padrão
  const [showScouters, setShowScouters] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLeads, setShowLeads] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showWeatherForecast, setShowWeatherForecast] = useState(false);
  const [showPOIs, setShowPOIs] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'polygon' | 'rectangle'>('polygon');
  const [drawingPointsCount, setDrawingPointsCount] = useState(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState("osm-standard");
  
  // POI Dialog state - abrir após criar área
  const [poiDialogArea, setPOIDialogArea] = useState<DrawnArea | null>(null);

  // POIs hook - agora usa busca por área
  const { allAreaPOIs, fetchPOIsInArea, isLoading: poisLoading, clearAreaPOIs } = usePOIs();

  // Get user location for route optimization
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        (err) => console.log('Geolocation not available:', err.message)
      );
    }
  }, []);

  // Handler para quando área é criada - abre dialog de POIs
  const handleAreaCreated = useCallback((area: DrawnArea) => {
    setDrawnAreas(prev => [...prev, area]);
    setPOIDialogArea(area); // Abre dialog para seleção de POIs
  }, []);

  // Handler para buscar POIs na área
  const handleSearchPOIsForArea = useCallback(async (areaId: string, categories: POICategory[]) => {
    const area = drawnAreas.find(a => a.id === areaId) || poiDialogArea;
    if (!area) return;
    
    await fetchPOIsInArea(areaId, area.bounds, categories);
    setShowPOIs(true); // Liga visualização de POIs automaticamente
  }, [drawnAreas, poiDialogArea, fetchPOIsInArea]);

  // Handler para deletar área - também limpa POIs
  const handleAreaDeleted = useCallback((areaId: string) => {
    setDrawnAreas(prev => prev.filter(a => a.id !== areaId));
    clearAreaPOIs(areaId);
  }, [clearAreaPOIs]);

  // Handlers para controle externo do desenho
  const handleFinishDrawing = () => {
    (window as any).__mapFinishDrawing?.();
  };

  const handleCancelDrawing = () => {
    (window as any).__mapCancelDrawing?.();
  };

  const startDrawing = (mode: 'polygon' | 'rectangle') => {
    setDrawMode(mode);
    setIsDrawing(true);
    setIsPopoverOpen(false);
  };

  // Buscar leads com coordenadas usando paginação automática (sem limite de 1000)
  const { data: leadsData, isLoading: leadsLoading, isFetching } = useQuery({
    queryKey: ["gestao-area-leads", filters],
    queryFn: async () => {
      console.log(`🔍 Iniciando busca de leads com paginação automática...`);
      
      // Usar fetchAllLeads para buscar TODOS os leads sem limitação
      const data = await fetchAllLeads<LeadRawData>(
        supabase,
        "id, name, address, local_abordagem, latitude, longitude, scouter, status_fluxo, commercial_project_id, projeto_comercial, criado, photo_url, ficha_confirmada, data_criacao_ficha",
        (query) => query
          .gte("criado", filters.dateFilter.startDate.toISOString())
          .lte("criado", filters.dateFilter.endDate.toISOString())
          .eq("fonte_normalizada", "Scouter - Fichas")
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .order("criado", { ascending: false })
      );
      
      // Aplicar filtro de projeto se necessário
      let filteredData = data || [];
      if (filters.projectId) {
        filteredData = filteredData.filter(lead => lead.commercial_project_id === filters.projectId);
      }

      // Mapear para formato esperado (sem geocodificação - instantâneo)
      const leads: LeadMapLocation[] = filteredData.map(lead => ({
        id: lead.id,
        name: lead.name || "Sem nome",
        lat: Number(lead.latitude),
        lng: Number(lead.longitude),
        address: lead.address || lead.local_abordagem || "Sem endereço",
        scouter: lead.scouter || undefined,
        status: lead.status_fluxo || undefined,
        projectName: lead.projeto_comercial || undefined,
        hasPhoto: !!lead.photo_url && lead.photo_url !== '[]' && lead.photo_url !== '',
        fichaConfirmada: lead.ficha_confirmada === true,
        dataFicha: lead.data_criacao_ficha || lead.criado || undefined,
      }));

      console.log(`✅ Carregados ${leads.length} leads com coordenadas (sem limitação)`);
      return leads;
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Manter em cache por 10 minutos
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

  const totalLeadsOnMap = leadsData?.length || 0;
  const totalScoutersActive = activeScoutersCount ?? 0;
  const totalAreasDrawn = drawnAreas.length;
  const totalLeadsInAreas = filteredAreaLeads.length;

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

      {/* Métricas principais - Grid 2x2 no mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
          <Card className="p-2 sm:p-0">
            <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Leads no Mapa
              </CardTitle>
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <div className="text-xl sm:text-3xl font-bold">{totalLeadsOnMap}</div>
            </CardContent>
          </Card>

          <Card className="p-2 sm:p-0">
            <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Áreas Desenhadas
              </CardTitle>
              <Pencil className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <div className="text-xl sm:text-3xl font-bold">{totalAreasDrawn}</div>
            </CardContent>
          </Card>

          <Card className="p-2 sm:p-0">
            <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Leads nas Áreas
              </CardTitle>
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <div className="text-xl sm:text-3xl font-bold">{totalLeadsInAreas}</div>
            </CardContent>
          </Card>

          <Card className="p-2 sm:p-0">
            <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Scouters Ativos
              </CardTitle>
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <div className="text-xl sm:text-3xl font-bold">{totalScoutersActive}</div>
            </CardContent>
          </Card>
        </div>

        {/* Mapa Unificado */}
        <Card className={isFullscreen ? "fixed inset-0 z-[9999] rounded-none mb-0 flex flex-col" : "mb-6"}>
          <CardHeader className="p-3 sm:p-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Mapa de Área
                  {isFullscreen && (
                    <Badge variant="secondary" className="ml-2">
                      Tempo Real
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Controle as camadas do mapa e desenhe áreas para análise
                </p>
              </div>
              
              {/* Controles de Layer - Responsivos */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Switch 
                    checked={showScouters} 
                    onCheckedChange={setShowScouters}
                    id="show-scouters"
                    className="scale-75 sm:scale-100"
                  />
                  <Label htmlFor="show-scouters" className="flex items-center gap-1 cursor-pointer text-xs sm:text-sm">
                    <Radio className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    <span className="hidden xs:inline">Scouters</span>
                  </Label>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  <Switch 
                    checked={showHeatmap} 
                    onCheckedChange={setShowHeatmap}
                    id="show-heatmap"
                    className="scale-75 sm:scale-100"
                  />
                  <Label htmlFor="show-heatmap" className="flex items-center gap-1 cursor-pointer text-xs sm:text-sm">
                    <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                    <span className="hidden xs:inline">Temp.</span>
                  </Label>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  <Switch 
                    checked={showLeads} 
                    onCheckedChange={setShowLeads}
                    id="show-leads"
                    className="scale-75 sm:scale-100"
                  />
                  <Label htmlFor="show-leads" className="flex items-center gap-1 cursor-pointer text-xs sm:text-sm">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    <span className="hidden xs:inline">Leads</span>
                  </Label>
                </div>


                <div className="flex items-center gap-1 sm:gap-2">
                  <Switch 
                    checked={showWeather} 
                    onCheckedChange={setShowWeather}
                    id="show-weather"
                    className="scale-75 sm:scale-100"
                  />
                  <Label htmlFor="show-weather" className="flex items-center gap-1 cursor-pointer text-xs sm:text-sm">
                    <CloudSun className="w-3 h-3 sm:w-4 sm:h-4 text-sky-500" />
                    <span className="hidden xs:inline">Clima</span>
                  </Label>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <Switch 
                    checked={showTraffic} 
                    onCheckedChange={setShowTraffic}
                    id="show-traffic"
                    className="scale-75 sm:scale-100"
                  />
                  <Label htmlFor="show-traffic" className="flex items-center gap-1 cursor-pointer text-xs sm:text-sm">
                    <Car className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                    <span className="hidden xs:inline">Trânsito</span>
                  </Label>
                </div>

                {/* POI Toggle - agora só mostra/esconde, sem seletor */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <Switch 
                    checked={showPOIs} 
                    onCheckedChange={setShowPOIs}
                    id="show-pois"
                    className="scale-75 sm:scale-100"
                  />
                  <Label htmlFor="show-pois" className="flex items-center gap-1 cursor-pointer text-xs sm:text-sm">
                    <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-teal-500" />
                    <span className="hidden xs:inline">POIs</span>
                    {allAreaPOIs.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                        {allAreaPOIs.length}
                      </Badge>
                    )}
                  </Label>
                </div>

                {/* Seletor de Camadas */}
                <MapLayerSelector
                  selectedLayerId={selectedLayerId}
                  onLayerChange={(layer) => setSelectedLayerId(layer.id)}
                />
                
                {/* Controles de Desenho */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {!isDrawing ? (
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-7 w-7 sm:h-9 sm:w-9"
                        >
                          <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2 z-[500]" align="end">
                        <div className="flex flex-col gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="justify-start gap-2 h-8"
                            onClick={() => startDrawing('polygon')}
                          >
                            <Pencil className="w-4 h-4" />
                            Polígono
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="justify-start gap-2 h-8"
                            onClick={() => startDrawing('rectangle')}
                          >
                            <Square className="w-4 h-4" />
                            Retângulo
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <>
                      <Button 
                        variant="default" 
                        size="icon"
                        className="h-7 w-7 sm:h-9 sm:w-9"
                        disabled
                      >
                        <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      
                      {drawMode === 'polygon' && drawingPointsCount > 0 && (
                        <Badge variant="secondary" className="h-7 sm:h-9 px-2 text-xs">
                          {drawingPointsCount} pts
                        </Badge>
                      )}
                      
                      <Button
                        size="icon"
                        variant="default"
                        className="h-7 w-7 sm:h-9 sm:w-9 bg-green-600 hover:bg-green-700"
                        onClick={handleFinishDrawing}
                        disabled={drawMode === 'polygon' && drawingPointsCount < 3}
                        title="Finalizar"
                      >
                        <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 sm:h-9 sm:w-9"
                        onClick={handleCancelDrawing}
                        title="Cancelar"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </>
                  )}
                </div>
                
                {/* Botão Tela Cheia */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 sm:h-9 sm:w-9"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className={isFullscreen ? "relative flex-1 overflow-hidden" : "relative"}>
            {/* Indicador de loading sobreposto */}
            {(leadsLoading || isFetching) && (
              <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                <span className="text-xs text-muted-foreground">Carregando leads...</span>
              </div>
            )}
            {/* Mapa sempre visível - dados carregam em paralelo */}
            <div className={cn("relative", isFullscreen ? "h-full" : "")}>
              <UnifiedAreaMap
                  projectId={filters.projectId}
                  dateRange={{
                    startDate: filters.dateFilter.startDate,
                    endDate: filters.dateFilter.endDate,
                  }}
                  showScouters={showScouters}
                  showHeatmap={showHeatmap}
                  showLeads={showLeads}
                  showTraffic={showTraffic}
                  showWeather={showWeather}
                  isDrawing={isDrawing}
                  onDrawingChange={setIsDrawing}
                  onAreaCreated={handleAreaCreated}
                  onAreaDeleted={handleAreaDeleted}
                  onAreasSelectionChanged={(_, filteredLeads) => setFilteredAreaLeads(filteredLeads)}
                  drawMode={drawMode}
                  onDrawModeChange={setDrawMode}
                  onDrawingPointsCountChange={setDrawingPointsCount}
                  isFullscreen={isFullscreen}
                  onMapCenterChange={(lat, lng) => setMapCenter({ lat, lng })}
                  onMapReady={setMapInstance}
                  selectedLayerId={selectedLayerId}
                />
              
              {/* POI Markers layer - agora usa allAreaPOIs */}
              <POIMarkers map={mapInstance} pois={allAreaPOIs} visible={showPOIs} />
              
              {/* Route polyline layer */}
              <RoutePolyline map={mapInstance} route={optimizedRoute} visible={!!optimizedRoute} />
              
              {/* Weather overlay */}
              {showWeather && mapCenter && (
                <>
                  {/* Badge compacto no canto - clique para ver previsão */}
                  <div className="absolute top-2 right-2 z-[400] flex items-center gap-2">
                    {/* Traffic Info badge */}
                    {showTraffic && (
                      <TrafficInfo lat={mapCenter.lat} lon={mapCenter.lng} enabled={showTraffic} />
                    )}
                    
                    <WeatherBadge 
                      lat={mapCenter.lat} 
                      lng={mapCenter.lng} 
                      compact
                      onClick={() => setShowWeatherForecast(!showWeatherForecast)}
                    />
                  </div>
                  
                  {/* Previsão nas próximas horas - aparece ao clicar no botão de nuvem */}
                  {showWeatherForecast && (
                    <div className={cn(
                      "absolute bottom-2 left-2 right-2 z-[400]",
                      !isFullscreen && "hidden lg:block"
                    )}>
                      <WeatherForecast 
                        lat={mapCenter.lat} 
                        lng={mapCenter.lng}
                        hours={isFullscreen ? 10 : 6}
                      />
                    </div>
                  )}
                </>
              )}
              
              {/* Traffic info without weather */}
              {showTraffic && !showWeather && mapCenter && (
                <div className="absolute top-2 right-2 z-[400]">
                  <TrafficInfo lat={mapCenter.lat} lon={mapCenter.lng} enabled={showTraffic} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
            <Card>
              <CardHeader>
                <CardTitle>Análise de Áreas Desenhadas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Desenhe áreas no mapa para ver a distribuição de leads por projeto e scouter
                </p>
              </CardHeader>
              <CardContent>
                {drawnAreas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Pencil className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma área desenhada</p>
                    <p className="text-sm mt-2">
                      Clique no botão <Pencil className="w-4 h-4 inline" /> no mapa para desenhar uma área de análise
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <ScouterHistorySettings />
          </TabsContent>
        </Tabs>

        {/* Dialog para selecionar categorias de POIs após desenhar área */}
        <AreaPOIDialog
          area={poiDialogArea}
          isOpen={!!poiDialogArea}
          onClose={() => setPOIDialogArea(null)}
          onSearchPOIs={handleSearchPOIsForArea}
          isLoading={poisLoading}
        />
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
