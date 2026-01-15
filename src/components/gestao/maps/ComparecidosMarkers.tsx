import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";

export interface ComparecidoLocation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  scouter?: string;
  projectName?: string;
  dataCompareceu?: string;
}

interface ComparecidosMarkersProps {
  map: L.Map | null;
  comparecidos: ComparecidoLocation[];
  visible: boolean;
}

export function ComparecidosMarkers({ map, comparecidos, visible }: ComparecidosMarkersProps) {
  const layerRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Criar layer group se não existir
    if (!layerRef.current) {
      layerRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(16,185,129,0.4);
                color: white;
                font-weight: bold;
                font-size: 12px;
              ">
                ${count}
              </div>
            `,
            className: '',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          });
        }
      });
    }

    // Limpar e remover se não visível
    if (!visible) {
      if (map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
      layerRef.current.clearLayers();
      return;
    }

    // Adicionar ao mapa se visível
    if (!map.hasLayer(layerRef.current)) {
      map.addLayer(layerRef.current);
    }

    // Limpar marcadores existentes
    layerRef.current.clearLayers();

    // Adicionar marcadores de comparecidos
    comparecidos.forEach(lead => {
      // Ícone verde com check para comparecidos
      const comparecidoIcon = L.divIcon({
        html: `
          <div style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(16,185,129,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="white">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        `,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([lead.lat, lead.lng], { icon: comparecidoIcon });

      // Formatar data de comparecimento
      const dataFormatada = lead.dataCompareceu 
        ? new Date(lead.dataCompareceu).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Data não disponível';

      const popupContent = `
        <div style="padding:12px;min-width:220px;font-family:system-ui,-apple-system,sans-serif">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="
              width:28px;
              height:28px;
              border-radius:50%;
              background:linear-gradient(135deg, #10b981 0%, #059669 100%);
              display:flex;
              align-items:center;
              justify-content:center;
            ">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="white">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <span style="font-weight:600;color:#059669;font-size:12px">COMPARECEU</span>
          </div>
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px">ID: ${lead.id}</p>
          <p style="font-weight:700;font-size:16px;margin:0 0 8px;color:#111827">${lead.name}</p>
          ${lead.projectName ? `<p style="font-size:12px;color:#374151;margin:0 0 4px"><span style="font-weight:500">🏢 Projeto:</span> ${lead.projectName}</p>` : ''}
          ${lead.scouter ? `<p style="font-size:12px;color:#6b7280;margin:0 0 4px"><span style="font-weight:500">👤 Scouter:</span> ${lead.scouter}</p>` : ''}
          ${lead.address ? `<p style="font-size:12px;color:#6b7280;margin:0 0 8px"><span style="font-weight:500">📍</span> ${lead.address}</p>` : ''}
          <div style="padding-top:8px;border-top:1px solid #e5e7eb">
            <p style="font-size:12px;color:#059669;margin:0;font-weight:500">
              ✅ Compareceu em: ${dataFormatada}
            </p>
          </div>
          <div style="margin-top:8px">
            <button 
              style="padding:6px;color:#f97316;border:none;background:transparent;cursor:pointer;border-radius:4px"
              onclick="window.open('https://www.google.com/maps/@${lead.lat},${lead.lng},3a,75y,0h,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192', '_blank')"
              title="Abrir Street View"
              onmouseover="this.style.backgroundColor='#fff7ed'"
              onmouseout="this.style.backgroundColor='transparent'"
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2.5"/>
                <path d="M12 8c-2.5 0-4 2-4 4v3h2v5h4v-5h2v-3c0-2-1.5-4-4-4z"/>
              </svg>
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      layerRef.current!.addLayer(marker);
    });

    // Ajustar visualização se tiver comparecidos
    if (comparecidos.length > 0 && layerRef.current.getLayers().length > 0) {
      const bounds = L.latLngBounds(comparecidos.map(l => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
        layerRef.current.clearLayers();
      }
    };
  }, [map, comparecidos, visible]);

  return null;
}
