import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Route, 
  Clock, 
  MapPin, 
  Loader2, 
  Navigation,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { 
  useRouteOptimization, 
  Waypoint, 
  formatDistance, 
  formatDuration 
} from "@/hooks/useRouteOptimization";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface LeadForRoute {
  id: number | string;
  name?: string;
  lat: number;
  lon: number;
  address?: string;
}

interface RouteOptimizerProps {
  leads: LeadForRoute[];
  userLocation?: { lat: number; lon: number };
  onRouteCalculated?: (route: any) => void;
  onClearRoute?: () => void;
}

export function RouteOptimizer({ 
  leads, 
  userLocation,
  onRouteCalculated,
  onClearRoute 
}: RouteOptimizerProps) {
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number | string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const { route, isLoading, error, optimizeRoute, clearRoute } = useRouteOptimization();

  const toggleLead = (id: number | string) => {
    const newSet = new Set(selectedLeadIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedLeadIds(newSet);
  };

  const selectAll = () => {
    setSelectedLeadIds(new Set(leads.map(l => l.id)));
  };

  const clearSelection = () => {
    setSelectedLeadIds(new Set());
    clearRoute();
    onClearRoute?.();
  };

  const handleOptimize = async () => {
    if (!userLocation) {
      return;
    }

    const selectedLeads = leads.filter(l => selectedLeadIds.has(l.id));
    if (selectedLeads.length === 0) return;

    const origin: Waypoint = {
      lat: userLocation.lat,
      lon: userLocation.lon,
      name: 'Sua localização',
    };

    const destinations: Waypoint[] = selectedLeads.map(l => ({
      lat: l.lat,
      lon: l.lon,
      id: l.id,
      name: l.name || `Lead ${l.id}`,
    }));

    const result = await optimizeRoute(origin, destinations);
    if (result) {
      onRouteCalculated?.(result);
    }
  };

  const leadsWithCoords = leads.filter(l => l.lat && l.lon);

  if (leadsWithCoords.length === 0) {
    return null;
  }

  return (
    <Card className="absolute bottom-4 left-4 z-[1000] w-80 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Route className="h-4 w-4" />
                Otimizar Rota
                {selectedLeadIds.size > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedLeadIds.size}
                  </Badge>
                )}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-4 pt-0 space-y-3">
            {!userLocation && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                <AlertTriangle className="h-3 w-3" />
                Ative sua localização para otimizar rotas
              </div>
            )}

            {/* Lead selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Leads disponíveis ({leadsWithCoords.length})
                </span>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs px-2"
                    onClick={selectAll}
                  >
                    Todos
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs px-2"
                    onClick={clearSelection}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-32 rounded border">
                <div className="p-2 space-y-1">
                  {leadsWithCoords.map((lead) => (
                    <label 
                      key={lead.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-xs"
                    >
                      <Checkbox
                        checked={selectedLeadIds.has(lead.id)}
                        onCheckedChange={() => toggleLead(lead.id)}
                      />
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {lead.name || `Lead ${lead.id}`}
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Optimize button */}
            <Button 
              className="w-full" 
              size="sm"
              onClick={handleOptimize}
              disabled={isLoading || selectedLeadIds.size === 0 || !userLocation}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  Calcular Rota ({selectedLeadIds.size} paradas)
                </>
              )}
            </Button>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            {/* Route results */}
            {route && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Rota otimizada</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      clearRoute();
                      onClearRoute?.();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {formatDistance(route.totalDistance)}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDuration(route.totalTimeWithTraffic || route.totalTime)}
                  </div>
                </div>

                {route.trafficDelay > 0 && (
                  <div className="text-xs text-amber-600">
                    ⚠️ +{formatDuration(route.trafficDelay)} por trânsito
                  </div>
                )}

                {route.isOptimized && (
                  <Badge variant="outline" className="text-xs">
                    ✓ Ordem otimizada
                  </Badge>
                )}

                {/* Optimized order */}
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Ordem das paradas:
                  </span>
                  {route.optimizedOrder.map((stop, idx) => (
                    <div key={stop.id} className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center">
                        {idx + 1}
                      </Badge>
                      <span className="truncate">{stop.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
