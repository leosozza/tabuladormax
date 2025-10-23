/**
 * Geolocation utility functions for parsing coordinates
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Parseia coordenadas do formato usado no Grid de Scouters
 * Aceita formatos: "-23.5491761,-46.6881783" ou "-23.5491761,-46.6881783 (, )"
 */
export function parseLatLng(raw?: string | null): LatLng | null {
  if (!raw) return null;
  // remove sufixos " (, )" e espaços extras
  const clean = raw.replace(/\(\s*,\s*\)/g, "").trim();
  // encontra dois números com sinal
  const m = clean.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Detector para coluna "Localização" das fichas
 * Retorna coordenadas se o texto for coordenadas, senão retorna null (precisa geocode)
 */
export function parseFichaLocalizacaoToLatLng(localizacao?: string | null): LatLng | null {
  if (!localizacao) return null;
  const RE_COORDS = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;
  const m = localizacao.match(RE_COORDS);
  if (m) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

/**
 * Verifica se uma string parece ser coordenadas
 */
export function isCoordinates(text?: string | null): boolean {
  if (!text) return false;
  const RE_COORDS = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/;
  return RE_COORDS.test(text.trim());
}
