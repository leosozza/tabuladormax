/**
 * LeadsTab Component - Enterprise Edition
 * Advanced spatial analysis with PDF/CSV reports, realtime heat, and performance optimization
 * Features: Realtime heat during drawing, map locking, fullscreen, date filtering, AI analysis
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import * as turf from '@turf/turf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Pencil, RefreshCw, X, Navigation, Flame, Maximize2, Minimize2, Brain } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { getTileServerConfig, DEFAULT_TILE_SERVER } from '@/config/tileServers';
import type { LeadDataPoint } from '@/types/lead';
import { DateFilter } from '@/components/LeadsMap/DateFilter';
import { AdvancedSummary } from '@/components/LeadsMap/AdvancedSummary';
import { AIAnalysisFloating } from '@/components/shared/AIAnalysisFloating';
import { lockMap, unlockMap, bboxFilter, pointsInPolygon } from '@/utils/map-helpers';
import { buildAISummaryFromSelection, formatAIAnalysisHTML } from '@/utils/ai-analysis';
import { exportAreaReportPDF, exportAreaReportCSV } from '@/utils/export-reports';
import './mobile.css';

// Geoman types - use type intersection to avoid extension issues
type GeomanMap = L.Map & {
  pm?: {
    setPathOptions: (options: Record<string, unknown>) => void;
    enableDraw: (shape: string, options: Record<string, unknown>) => void;
    disableDraw: () => void;
    globalDrawModeEnabled: () => boolean;
  };
};

interface GeomanCreateEvent {
  layer: L.Layer & {
    getLatLngs: () => Array<Array<{ lat: number; lng: number }>>;
    getBounds: () => L.LatLngBounds;
  };
  shape: string;
}

interface GeomanDrawVertexEvent {
  workingLayer?: L.Layer & {
    getLatLngs: () => Array<Array<{ lat: number; lng: number }>>;
    getBounds: () => L.LatLngBounds;
  };
  layer?: L.Layer & {
    getLatLngs: () => Array<Array<{ lat: number; lng: number }>>;
    getBounds: () => L.LatLngBounds;
  };
}

interface ProjetoSummary {
  projeto: string;
  total: number;
  byScout: Map<string, number>;
}

interface AnalysisSummary {
  total: number;
  byProjeto: ProjetoSummary[];
  // Enhanced analysis data
  byEtapa?: Map<string, number>;
  byConfirmado?: Map<string, number>;
  totalComFoto?: number;
  totalConfirmados?: number;
  valorTotal?: number;
  idadeMedia?: number;
  supervisores?: Set<string>;
}

// Format large numbers with K suffix
function formatK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

export function LeadsTab() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null); // For fullscreen
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const drawnLayerRef = useRef<L.Layer | null>(null);
  const heatLayerRef = useRef<L.HeatLayer | null>(null); // Base heat layer
  const heatSelectedRef = useRef<L.HeatLayer | null>(null); // Realtime selection heat

  const [isDrawing, setIsDrawing] = useState(false);
  const [allLeads, setAllFichas] = useState<LeadDataPoint[]>([]);
  const [filteredFichas, setFilteredFichas] = useState<LeadDataPoint[]>([]); // After date filter
  const [displayedLeads, setDisplayedFichas] = useState<LeadDataPoint[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectionCoords, setSelectionCoords] = useState<number[][]>([]); // For AI hash
  const [aiAnalysis, setAiAnalysis] = useState<any>(null); // AI analysis result

  // Date filter state (no auto-filtering)
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [hasDateFilter, setHasDateFilter] = useState(false);

  // Fetch data from Supabase
  const { data: leads, isLoading, error, refetch } = useLeads({ withGeo: true });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 11);
    const tileConfig = getTileServerConfig(DEFAULT_TILE_SERVER);
    
    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      clusterGroupRef.current?.clearLayers();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/remove drawing-mode class
  useEffect(() => {
    const container = mapRef.current?.getContainer();
    if (!container) return;
    
    if (isDrawing) {
      container.classList.add('drawing-mode');
    } else {
      container.classList.remove('drawing-mode');
    }
  }, [isDrawing]);

  // Update leads data
  useEffect(() => {
    if (!leads || leads.length === 0) {
      setAllFichas([]);
      setFilteredFichas([]);
      setDisplayedFichas([]);
      return;
    }

    // Convert to LeadDataPoint
    const enrichedFichas: LeadDataPoint[] = leads.map((f, index) => ({
      ...f,
      id: `ficha-${index}`,
      projeto: f.projeto || 'Sem Projeto',
      scouter: f.scouter || 'Não Identificado',
      data: f.data || '',
      lat: f.lat || f.latitude,
      lng: f.lng || f.longitude,
    }));

    setAllFichas(enrichedFichas);
    setFilteredFichas(enrichedFichas);
    setDisplayedFichas(enrichedFichas);
    setSummary(generateAnalysis(enrichedFichas));
  }, [leads]);

  // Update heat layers when filtered data changes
  useEffect(() => {
    if (!mapRef.current || filteredFichas.length === 0) {
      // Clear heat layers if no data
      if (heatLayerRef.current) {
        mapRef.current?.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      if (heatSelectedRef.current) {
        mapRef.current?.removeLayer(heatSelectedRef.current);
        heatSelectedRef.current = null;
      }
      return;
    }

    console.log(`[Fichas] Updating base heat layer with ${filteredFichas.length} leads`);

    // Clear existing base heat
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
    }

    // Create base heat layer
    const heatPoints = filteredFichas.map(f => [f.lat, f.lng, 1] as [number, number, number]);
    heatLayerRef.current = (L as typeof L & { heatLayer?: (points: number[][], options?: { radius?: number; blur?: number; maxZoom?: number; max?: number; minOpacity?: number; gradient?: Record<number, string> }) => L.HeatLayer }).heatLayer?.(heatPoints, {
      radius: 25,
      blur: 35,
      maxZoom: 19,
      max: 1.0,
      minOpacity: 0.3,
      gradient: {
        0.0: '#4ade80',
        0.5: '#fbbf24',
        0.8: '#f97316',
        1.0: '#ef4444',
      }
    });

    if (heatLayerRef.current) {
      mapRef.current.addLayer(heatLayerRef.current);
    }
  }, [filteredFichas]);

  // Update clusters when data changes
  useEffect(() => {
    if (!mapRef.current || displayedLeads.length === 0) {
      // Clear clusters if no data
      if (clusterGroupRef.current) {
        mapRef.current?.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
      return;
    }

    console.log(`[Fichas] Rendering ${displayedLeads.length} leads with clustering`);

    // Clear existing clusters
    if (clusterGroupRef.current) {
      mapRef.current.removeLayer(clusterGroupRef.current);
    }

    // Create marker cluster group
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        
        if (count >= 100) {
          size = 'large';
        } else if (count >= 10) {
          size = 'medium';
        }
        
        return L.divIcon({
          html: `<div style="
            background-color: #FF6B35;
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            border: 3px solid white;
          ">${formatK(count)}</div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      }
    });

    // Add markers
    displayedLeads.forEach((ficha) => {
      const marker = L.circleMarker([ficha.lat, ficha.lng], {
        radius: 6,
        fillColor: '#FF6B35',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      });
      
      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <strong>Ficha</strong><br/>
          <small>Projeto: ${ficha.projeto || 'N/A'}</small><br/>
          <small>Scouter: ${ficha.scouter || 'N/A'}</small><br/>
          <small>${ficha.lat.toFixed(4)}, ${ficha.lng.toFixed(4)}</small>
        </div>
      `);
      
      clusterGroup.addLayer(marker);
    });

    mapRef.current.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    // Fit bounds only if showing all leads (not a selection)
    if (displayedLeads.length === filteredFichas.length && displayedLeads.length > 0) {
      const bounds = L.latLngBounds(displayedLeads.map(f => [f.lat, f.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [displayedLeads, filteredFichas]);

  // Geoman event listeners for polygon creation WITH REALTIME HEAT
  useEffect(() => {
    const map = mapRef.current as GeomanMap;
    if (!map || !map.pm) return;

    // On draw start - lock map and prepare realtime heat layer
    const onDrawStart = () => {
      console.log('[Fichas] Drawing started - locking map');
      if (map) lockMap(map as L.Map);
      setIsDrawing(true);

      // Create realtime selection heat layer (initially empty)
      if (!heatSelectedRef.current) {
        heatSelectedRef.current = (L as typeof L & { heatLayer?: (points: number[][], options?: { radius?: number; blur?: number; maxZoom?: number; max?: number; minOpacity?: number; gradient?: Record<number, string> }) => L.HeatLayer }).heatLayer?.([], {
          radius: 20,
          blur: 30,
          maxZoom: 19,
          max: 1.0,
          minOpacity: 0.4,
          gradient: {
            0.0: '#3b82f6',
            0.5: '#8b5cf6',
            0.8: '#ec4899',
            1.0: '#ef4444',
          }
        });
        if (heatSelectedRef.current) {
          map.addLayer(heatSelectedRef.current);
        }
      }
    };

    // On vertex added/dragged - update realtime heat
    const onDrawVertex = (e: GeomanDrawVertexEvent) => {
      const shape = e.workingLayer || e.layer;
      if (!shape || !heatSelectedRef.current) return;

      const latLngs = shape.getLatLngs?.()[0];
      if (!latLngs || latLngs.length < 3) return;

      // Get bounds for bbox pre-filtering
      const bounds = shape.getBounds();
      // Filter to only leads with valid coordinates
      const validFichas = filteredFichas.filter(f => f.lat !== undefined && f.lng !== undefined) as Array<LeadDataPoint & { lat: number; lng: number }>;
      const candidates = bboxFilter(validFichas, bounds);

      // Create polygon for Turf filtering
      const coords = latLngs.map((p: L.LatLng) => [p.lng, p.lat]);
      coords.push(coords[0]); // Close polygon
      const polygon = turf.polygon([coords]);

      // Filter points (use worker if large dataset)
      if (candidates.length > 5000) {
        // For very large datasets, we could use worker here, but for now do sync
        console.log('[Fichas] Large dataset - using bbox pre-filter only');
      }

      const selected = pointsInPolygon(candidates, polygon);
      console.log(`[Fichas] Realtime heat: ${selected.length} leads in partial polygon`);

      // Update realtime heat layer
      const heatPoints = selected.map(f => [f.lat, f.lng, 1] as [number, number, number]);
      heatSelectedRef.current.setLatLngs(heatPoints);
    };

    // On polygon created - finalize selection
    const onCreate = (e: GeomanCreateEvent) => {
      // Remove previous polygon
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
      }
      drawnLayerRef.current = e.layer;
      setIsDrawing(false);
      if (map) unlockMap(map as L.Map);
      map.pm.disableDraw();

      // Get polygon coordinates
      const latlngs = e.layer.getLatLngs()[0];
      const coords = latlngs.map((p) => [p.lng, p.lat]);
      coords.push(coords[0]); // Close polygon

      // Get bounds for pre-filtering
      const bounds = e.layer.getBounds();
      // Filter to only leads with valid coordinates
      const validFichas = filteredFichas.filter(f => f.lat !== undefined && f.lng !== undefined) as Array<LeadDataPoint & { lat: number; lng: number }>;
      const candidates = bboxFilter(validFichas, bounds);

      // Filter leads inside polygon using Turf.js
      const polygon = turf.polygon([coords]);
      const selected = pointsInPolygon(candidates, polygon);

      console.log(`✅ [Fichas] Polygon created: ${selected.length} leads selected`);

      // Store selection data (but don't auto-open panel)
      setDisplayedFichas(selected);
      const analysisSummary = generateAnalysis(selected);
      setSummary(analysisSummary);
      setSelectionCoords(coords);
      
      // Generate AI analysis
      const center = mapRef.current?.getCenter();
      const aiResult = buildAISummaryFromSelection(
        analysisSummary,
        center?.lat,
        center?.lng
      );
      setAiAnalysis(aiResult);

      // Keep the realtime heat showing final selection
      // Panel is opened via brain button, not automatically
    };

    // On draw canceled - clean up
    const onDrawCancel = () => {
      console.log('[Fichas] Drawing canceled - unlocking map');
      setIsDrawing(false);
      if (map) unlockMap(map as L.Map);

      // Clear realtime heat
      if (heatSelectedRef.current) {
        map.removeLayer(heatSelectedRef.current);
        heatSelectedRef.current = null;
      }
    };

    map.on('pm:drawstart', onDrawStart);
    map.on('pm:drawvertex', onDrawVertex);
    map.on('pm:markerdragend', onDrawVertex); // Also update on marker drag
    map.on('pm:create', onCreate);
    map.on('pm:drawcancel', onDrawCancel);

    return () => {
      map.off('pm:drawstart', onDrawStart);
      map.off('pm:drawvertex', onDrawVertex);
      map.off('pm:markerdragend', onDrawVertex);
      map.off('pm:create', onCreate);
      map.off('pm:drawcancel', onDrawCancel);
    };
  }, [filteredFichas]);

  // Generate analysis summary
  const generateAnalysis = (fichas: LeadDataPoint[]): AnalysisSummary => {
    const projetoMap = new Map<string, Map<string, number>>();
    const etapaMap = new Map<string, number>();
    const confirmadoMap = new Map<string, number>();
    const supervisoresSet = new Set<string>();
    
    let totalComFoto = 0;
    let totalConfirmados = 0;
    let somaIdades = 0;
    let countIdades = 0;
    let somaValores = 0;

    leads.forEach((ficha) => {
      const projeto = ficha.projeto || 'Sem Projeto';
      const scouter = ficha.scouter || 'Não Identificado';

      // Projeto/Scouter analysis (existing)
      if (!projetoMap.has(projeto)) {
        projetoMap.set(projeto, new Map());
      }
      
      const scouterMap = projetoMap.get(projeto)!;
      scouterMap.set(scouter, (scouterMap.get(scouter) || 0) + 1);
      
      // Enhanced analysis
      // Etapa
      if (ficha.etapa !== undefined) {
        etapaMap.set(ficha.etapa, (etapaMap.get(ficha.etapa) || 0) + 1);
      }
      
      // Confirmado
      if (ficha.confirmado !== undefined) {
        const confirmadoKey = String(ficha.confirmado).toLowerCase();
        confirmadoMap.set(confirmadoKey, (confirmadoMap.get(confirmadoKey) || 0) + 1);
        
        if (confirmadoKey.includes('sim') || confirmadoKey.includes('confirmad')) {
          totalConfirmados++;
        }
      }
      
      // Foto
      if (ficha.foto !== undefined) {
        const fotoValue = String(ficha.foto).toLowerCase();
        if (fotoValue === 'sim' || fotoValue === '1' || fotoValue === 'true') {
          totalComFoto++;
        }
      }
      
      // Idade
      if (ficha.idade !== undefined) {
        const idade = parseInt(String(ficha.idade), 10);
        if (!isNaN(idade) && idade > 0 && idade < 120) {
          somaIdades += idade;
          countIdades++;
        }
      }
      
      // Valor
      if (ficha.valor_ficha !== undefined) {
        const valorStr = String(ficha.valor_ficha).replace(/[^\d,.-]/g, '').replace(',', '.');
        const valor = parseFloat(valorStr);
        if (!isNaN(valor) && valor > 0) {
          somaValores += valor;
        }
      }
      
      // Supervisor
      if (ficha.supervisor !== undefined) {
        supervisoresSet.add(ficha.supervisor);
      }
    });

    const byProjeto: ProjetoSummary[] = [];
    projetoMap.forEach((scouterMap, projeto) => {
      let total = 0;
      scouterMap.forEach((count) => {
        total += count;
      });
      byProjeto.push({ projeto, total, byScout: scouterMap });
    });

    // Sort by total descending
    byProjeto.sort((a, b) => b.total - a.total);

    return {
      total: leads.length,
      byProjeto,
      byEtapa: etapaMap.size > 0 ? etapaMap : undefined,
      byConfirmado: confirmadoMap.size > 0 ? confirmadoMap : undefined,
      totalComFoto: totalComFoto > 0 ? totalComFoto : undefined,
      totalConfirmados: totalConfirmados > 0 ? totalConfirmados : undefined,
      valorTotal: somaValores > 0 ? somaValores : undefined,
      idadeMedia: countIdades > 0 ? somaIdades / countIdades : undefined,
      supervisores: supervisoresSet.size > 0 ? supervisoresSet : undefined,
    };
  };

  // Start drawing
  const handleStartDrawing = () => {
    const map = mapRef.current as GeomanMap;
    if (!map?.pm) {
      console.error('Geoman não carregado (map.pm undefined)');
      return;
    }
    
    setShowSummary(false);
    setIsDrawing(true);
    
    // Disable any existing draw mode
    if (map.pm.globalDrawModeEnabled()) {
      map.pm.disableDraw();
    }
    
    // Set drawing style
    map.pm.setPathOptions({ 
      color: '#4096ff', 
      fillColor: '#4096ff', 
      fillOpacity: 0.1, 
      weight: 2 
    });
    
    // Enable polygon drawing
    map.pm.enableDraw('Polygon', {
      snappable: true,
      snapDistance: 25,
      allowSelfIntersection: false,
      finishOnDoubleClick: true,
      tooltips: true
    });
    
    console.log('✏️ [Fichas] Polygon drawing mode activated');
  };

  // Clear selection
  const handleClearSelection = () => {
    const map = mapRef.current;
    if (drawnLayerRef.current && map) {
      map.removeLayer(drawnLayerRef.current);
      drawnLayerRef.current = null;
    }

    // Clear realtime heat selection
    if (heatSelectedRef.current && map) {
      map.removeLayer(heatSelectedRef.current);
      heatSelectedRef.current = null;
    }

    setDisplayedFichas(filteredFichas);
    setSummary(null);
    setAiAnalysis(null);
    setSelectionCoords([]);
    setIsDrawing(false);
    setShowSummary(false);
    if (map) unlockMap(map as L.Map);
  };

  // Center map
  const handleCenterMap = () => {
    if (!mapRef.current || displayedLeads.length === 0) return;
    const bounds = L.latLngBounds(displayedLeads.map(f => [f.lat, f.lng]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  // Date filter handlers
  const handleDateChange = (start: string, end: string) => {
    setDateStart(start);
    setDateEnd(end);
  };

  const handleApplyDateFilter = () => {
    if (!dateStart || !dateEnd) {
      console.log('[Fichas] No date range specified');
      return;
    }

    // Parse Brazilian date format (DD/MM/YYYY) from data
    const parseBrazilianDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      
      // Try DD/MM/YYYY format first (from imported data)
      const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (brMatch) {
        const [, day, month, year] = brMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }
      
      // Try ISO format as fallback
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
      
      return null;
    };

    const filtered = allLeads.filter(f => {
      if (!f.data) return false;
      
      const fichaDate = parseBrazilianDate(f.data);
      if (!fichaDate) return false;
      
      const startDate = new Date(dateStart);
      const endDate = new Date(dateEnd + 'T23:59:59');
      
      return fichaDate >= startDate && fichaDate <= endDate;
    });

    console.log(`[Fichas] Date filter applied: ${filtered.length} of ${allLeads.length} leads`);
    setFilteredFichas(filtered);
    setDisplayedFichas(filtered);
    setSummary(generateAnalysis(filtered));
    setHasDateFilter(true);
  };

  const handleClearDateFilter = () => {
    setDateStart('');
    setDateEnd('');
    setFilteredFichas(allLeads);
    setDisplayedFichas(allLeads);
    setSummary(generateAnalysis(allLeads));
    setHasDateFilter(false);
    console.log('[Fichas] Date filter cleared');
  };

  // Fullscreen handlers
  const handleToggleFullscreen = () => {
    const wrapper = mapWrapperRef.current;
    if (!wrapper) return;

    if (!document.fullscreenElement) {
      wrapper.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
        // Force map to re-render after entering fullscreen
        setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 100);
      }).catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
        // Force map to re-render after exiting fullscreen
        setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 100);
      });
    }
  };

  // Listen to fullscreen changes
  useEffect(() => {
    const onFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      // Invalidate map size on any fullscreen change
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  // Export handlers
  const handleExportPDF = async () => {
    if (!summary || !mapContainerRef.current) return;

    setIsExporting(true);
    try {
      const map = mapRef.current;
      if (!map) throw new Error('Map not initialized');

      // Get metadata
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      const metadata = {
        timestamp: new Date().toLocaleString('pt-BR'),
        center: { lat: center.lat, lng: center.lng },
        zoom,
        bbox: `${sw.lat.toFixed(4)},${sw.lng.toFixed(4)} to ${ne.lat.toFixed(4)},${ne.lng.toFixed(4)}`,
        totalPoints: summary.total,
      };

      // Generate AI analysis
      const aiAnalysis = buildAISummaryFromSelection(summary, center.lat, center.lng);
      const aiHTML = formatAIAnalysisHTML(aiAnalysis);

      await exportAreaReportPDF(mapContainerRef.current, summary, metadata, aiHTML);
      console.log('✅ PDF report generated successfully');
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert('Erro ao gerar relatório PDF. Verifique o console para detalhes.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!summary) return;

    try {
      exportAreaReportCSV(summary);
      console.log('✅ CSV report generated successfully');
    } catch (error) {
      console.error('❌ Error generating CSV:', error);
      alert('Erro ao gerar relatório CSV. Verifique o console para detalhes.');
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <CardTitle>Fichas - Análise de Área</CardTitle>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {displayedLeads.length === filteredFichas.length 
                ? `${formatK(displayedLeads.length)} leads${hasDateFilter ? ' (filtradas)' : ' total'}`
                : `${formatK(displayedLeads.length)} de ${formatK(filteredFichas.length)} selecionadas`
              }
            </span>

            {/* Mobile-optimized buttons (≥44px) */}
            <Button
              variant={isDrawing ? "default" : "outline"}
              size="default"
              onClick={handleStartDrawing}
              disabled={isDrawing || filteredFichas.length === 0}
              className="min-w-[44px] min-h-[44px] touch-manipulation"
              title={isDrawing ? "Desenhando... (duplo clique para finalizar)" : "Desenhar área"}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {isDrawing ? 'Desenhando...' : 'Desenhar'}
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={handleClearSelection}
              disabled={displayedLeads.length === filteredFichas.length}
              className="min-w-[44px] min-h-[44px] touch-manipulation"
              title="Limpar seleção"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={handleCenterMap}
              disabled={displayedLeads.length === 0}
              className="min-w-[44px] min-h-[44px] touch-manipulation"
              title="Centralizar mapa"
            >
              <Navigation className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={() => refetch()}
              disabled={isLoading}
              className="min-w-[44px] min-h-[44px] touch-manipulation"
              title="Recarregar dados"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 relative">
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <p className="text-sm text-destructive">Erro ao carregar leads</p>
          </div>
        )}

        {/* Unified button group - Calendar + Brain + Fullscreen */}
        <div className="absolute top-4 right-4 z-[9999] flex flex-col bg-white/95 shadow-lg border backdrop-blur-sm rounded overflow-visible">
          {/* Calendar button */}
          <DateFilter
            startDate={dateStart}
            endDate={dateEnd}
            onDateChange={handleDateChange}
            onApply={handleApplyDateFilter}
            onClear={handleClearDateFilter}
          />
          
          {/* Divider between buttons */}
          <div className="h-px bg-border" />
          
          {/* AI Analysis Floating - novo componente */}
          <AIAnalysisFloating
            data={{
              totalLeads: displayedLeads.length,
              leadsComFoto: displayedLeads.filter(f => f.foto_1 !== undefined).length,
              projetos: Array.from(new Set(displayedLeads.map(f => f.projeto))),
              scouters: Array.from(new Set(displayedLeads.map(f => f.scouter)))
            }}
          />
          
          {/* Divider between buttons */}
          <div className="h-px bg-border" />
          
          {/* Brain button (toggle analysis panel) - mantido */}
          <button
            className="fullscreen-button flex items-center justify-center w-[30px] h-[30px] hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowSummary(!showSummary)}
            disabled={!summary || !aiAnalysis}
            title={showSummary ? 'Fechar análise' : 'Abrir análise IA'}
          >
            <Brain size={16} className={showSummary ? 'text-primary' : ''} />
          </button>

          {/* Divider between buttons */}
          <div className="h-px bg-border" />
          
          {/* Fullscreen button */}
          <button
            className="fullscreen-button flex items-center justify-center w-[30px] h-[30px] hover:bg-accent transition-colors"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        {/* Advanced summary panel */}
        {showSummary && summary && aiAnalysis && (
          <AdvancedSummary
            summary={summary}
            aiAnalysis={aiAnalysis}
            selectionCoords={selectionCoords}
            centerLatLng={mapRef.current ? {
              lat: mapRef.current.getCenter().lat,
              lng: mapRef.current.getCenter().lng
            } : undefined}
            onClose={() => setShowSummary(false)}
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            isExporting={isExporting}
          />
        )}

        {/* Map container with fullscreen wrapper */}
        <div 
          ref={mapWrapperRef} 
          className="fullscreen-container w-full h-full min-h-[500px]"
        >
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
}
