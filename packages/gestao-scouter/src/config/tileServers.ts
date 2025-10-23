/**
 * Tile Server Configuration
 * Centralized configuration for map tile servers
 * 
 * To switch tile servers, change the DEFAULT_TILE_SERVER constant
 * or set the VITE_MAP_TILE_SERVER environment variable
 */

export interface TileServerConfig {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  description: string;
  isFree: boolean;
  requiresApiKey: boolean;
}

/**
 * Available free tile servers for OpenStreetMap
 */
export const TILE_SERVERS: Record<string, TileServerConfig> = {
  // OpenStreetMap Standard (padrão atual)
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    description: 'Mapa padrão do OSM. Gratuito e confiável.',
    isFree: true,
    requiresApiKey: false,
  },

  // CARTO Light (minimalista claro)
  cartoLight: {
    name: 'CARTO Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '© <a href="https://carto.com/">CARTO</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    description: 'Design minimalista claro. Ideal para dashboards. Gratuito até 75k views/mês.',
    isFree: true,
    requiresApiKey: false,
  },

  // CARTO Dark (minimalista escuro)
  cartoDark: {
    name: 'CARTO Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '© <a href="https://carto.com/">CARTO</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    description: 'Tema escuro. Perfeito para dark mode. Gratuito até 75k views/mês.',
    isFree: true,
    requiresApiKey: false,
  },

  // OpenStreetMap France (colorido)
  osmFr: {
    name: 'OpenStreetMap France',
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> France',
    maxZoom: 20,
    description: 'Versão francesa do OSM. Mais colorido e detalhado. Gratuito.',
    isFree: true,
    requiresApiKey: false,
  },

  // OpenStreetMap Germany
  osmDe: {
    name: 'OpenStreetMap Germany',
    url: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Deutschland',
    maxZoom: 18,
    description: 'Versão alemã do OSM. Servidores estáveis. Gratuito.',
    isFree: true,
    requiresApiKey: false,
  },

  // Humanitarian OpenStreetMap Team
  hot: {
    name: 'HOT Style',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.hotosm.org/">Humanitarian OSM Team</a>',
    maxZoom: 19,
    description: 'Destaca serviços humanitários e infraestrutura. Gratuito.',
    isFree: true,
    requiresApiKey: false,
  },

  // Stamen Toner (preto e branco)
  stamenToner: {
    name: 'Stamen Toner',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png',
    attribution: '© <a href="https://stamen.com">Stamen Design</a>, © <a href="https://stadiamaps.com/">Stadia Maps</a>',
    maxZoom: 18,
    description: 'Estilo preto e branco, tipo jornal. Gratuito para desenvolvimento.',
    isFree: true,
    requiresApiKey: false,
  },

  // Stamen Terrain
  stamenTerrain: {
    name: 'Stamen Terrain',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png',
    attribution: '© <a href="https://stamen.com">Stamen Design</a>, © <a href="https://stadiamaps.com/">Stadia Maps</a>',
    maxZoom: 18,
    description: 'Destaca relevo e topografia. Gratuito para desenvolvimento.',
    isFree: true,
    requiresApiKey: false,
  },
};

/**
 * Get tile server configuration by name or from environment variable
 */
export function getTileServerConfig(serverName?: string): TileServerConfig {
  // Priority: 
  // 1. Function parameter
  // 2. Environment variable
  // 3. Default (OSM)
  const envServer = import.meta.env.VITE_MAP_TILE_SERVER as string;
  const name = serverName || envServer || 'osm';
  
  const config = TILE_SERVERS[name];
  
  if (!config) {
    console.warn(`Tile server "${name}" not found. Falling back to OSM.`);
    return TILE_SERVERS.osm;
  }
  
  return config;
}

/**
 * Default tile server to use
 * Change this to switch the default tile server globally
 */
export const DEFAULT_TILE_SERVER = 'osm';

/**
 * Get all available free tile servers
 */
export function getFreeTileServers(): TileServerConfig[] {
  return Object.values(TILE_SERVERS).filter(server => server.isFree);
}

/**
 * Get tile server names for selection UI
 */
export function getTileServerNames(): { value: string; label: string; description: string }[] {
  return Object.entries(TILE_SERVERS).map(([key, config]) => ({
    value: key,
    label: config.name,
    description: config.description,
  }));
}
