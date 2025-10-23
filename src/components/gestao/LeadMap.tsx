import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";

// Corrigir ícones padrão do Leaflet
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface LeadLocation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  status?: string;
  scouter?: string;
}

interface LeadMapProps {
  leads: LeadLocation[];
  center?: [number, number];
  zoom?: number;
}

export default function LeadMap({ 
  leads, 
  center = [-15.7801, -47.9292], // Brasília como padrão
  zoom = 12 
}: LeadMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Inicializar mapa apenas uma vez
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView(center, zoom);

      // Adicionar tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapRef.current);
    }

    // Limpar marcadores existentes
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        mapRef.current!.removeLayer(layer);
      }
    });

    // Agrupar leads por localização próxima
    const groupedLeads = new Map<string, LeadLocation[]>();
    
    leads.forEach(lead => {
      const key = `${lead.lat.toFixed(3)},${lead.lng.toFixed(3)}`;
      if (!groupedLeads.has(key)) {
        groupedLeads.set(key, []);
      }
      groupedLeads.get(key)!.push(lead);
    });

    // Adicionar marcadores
    groupedLeads.forEach((groupLeads, key) => {
      const firstLead = groupLeads[0];
      const isCluster = groupLeads.length > 1;

      if (isCluster) {
        // Circle marker para clusters
        const circleMarker = L.circleMarker([firstLead.lat, firstLead.lng], {
          radius: Math.min(20 + groupLeads.length * 2, 40),
          fillColor: "hsl(217 91% 60%)",
          fillOpacity: 0.6,
          color: "hsl(217 91% 60%)",
          weight: 2,
        }).addTo(mapRef.current!);

        const popupContent = `
          <div class="p-2">
            <p class="font-bold mb-2">${groupLeads.length} leads nesta área</p>
            <div class="space-y-1 max-h-48 overflow-y-auto">
              ${groupLeads.map(lead => `
                <div class="text-sm border-b pb-1">
                  <p class="font-medium">${lead.name}</p>
                  ${lead.scouter ? `<p class="text-xs text-gray-500">Scouter: ${lead.scouter}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
        
        circleMarker.bindPopup(popupContent);
      } else {
        // Marcador individual
        const marker = L.marker([firstLead.lat, firstLead.lng]).addTo(mapRef.current!);
        
        const popupContent = `
          <div class="p-2">
            <p class="font-bold mb-1">${firstLead.name}</p>
            ${firstLead.scouter ? `<p class="text-sm text-gray-500 mb-1">Scouter: ${firstLead.scouter}</p>` : ''}
            ${firstLead.status ? `<span class="inline-block px-2 py-1 text-xs rounded bg-gray-100">${firstLead.status}</span>` : ''}
          </div>
        `;
        
        marker.bindPopup(popupContent);
      }
    });

    // Ajustar bounds se houver leads
    if (leads.length > 0) {
      const bounds = L.latLngBounds(leads.map(l => [l.lat, l.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    // Cleanup
    return () => {
      // Não remover o mapa no cleanup, só os marcadores
    };
  }, [leads, center, zoom]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-lg"
      style={{ minHeight: "500px" }}
    />
  );
}
