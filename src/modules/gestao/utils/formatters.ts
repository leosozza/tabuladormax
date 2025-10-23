
import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const TIMEZONE = 'America/Sao_Paulo';

export const formatDate = (date: string | Date, pattern: string = 'dd/MM/yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, TIMEZONE, pattern, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// Alias for compatibility
export const formatBRL = formatCurrency;

export const parseCurrencyBR = (value: string): number => {
  if (!value || typeof value !== 'string') return 0;
  
  // Remove tudo exceto números, vírgulas e pontos
  const cleanValue = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '') // Remove separadores de milhares
    .replace(',', '.'); // Converte vírgula decimal para ponto
    
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
};

export const normalizeText = (text: string): string => {
  if (!text) return '';
  
  return text
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
};

export const parseLatLon = (value: string): { lat: number; lon: number } | null => {
  if (!value || typeof value !== 'string') return null;
  
  // Tenta extrair coordenadas no formato "lat,lon"
  const coords = value.split(',').map(c => parseFloat(c.trim()));
  
  if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
    return { lat: coords[0], lon: coords[1] };
  }
  
  return null;
};

export const normalizeYesNo = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  
  const normalized = value.trim().toLowerCase();
  return normalized === 'sim' || normalized === 'yes' || normalized === 'true' || normalized === '1';
};

export const toSaoPauloTime = (date: string | Date): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, TIMEZONE);
};

export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

// Função especializada para parsing de "Data de criação da Ficha" formato brasileiro
export const parseFichaDateTimeBR = (value: string): { created_at_iso: string; created_day: string } | null => {
  if (!value || typeof value !== 'string') return null;

  try {
    const trimmed = value.trim();
    
    // Se já é ISO format, usa direto
    if (trimmed.includes('T') || trimmed.includes('Z')) {
      const isoDate = parseISO(trimmed);
      if (isValid(isoDate)) {
        return {
          created_at_iso: isoDate.toISOString(),
          created_day: format(isoDate, 'yyyy-MM-dd')
        };
      }
    }

    // Parse formato brasileiro dd/MM/yyyy HH:mm
    const brDateRegex = /(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/;
    const match = trimmed.match(brDateRegex);
    
    if (match) {
      const [, day, month, year, hour, minute] = match;
      // Criar data no timezone de São Paulo
      const dateObj = new Date(
        parseInt(year), 
        parseInt(month) - 1, // JavaScript months are 0-indexed
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      if (isValid(dateObj)) {
        return {
          created_at_iso: dateObj.toISOString(),
          created_day: format(dateObj, 'yyyy-MM-dd')
        };
      }
    }

    // Fallback: tentar apenas data dd/MM/yyyy
    const dateOnlyRegex = /(\d{2})\/(\d{2})\/(\d{4})/;
    const dateMatch = trimmed.match(dateOnlyRegex);
    
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (isValid(dateObj)) {
        return {
          created_at_iso: dateObj.toISOString(),
          created_day: format(dateObj, 'yyyy-MM-dd')
        };
      }
    }

    console.warn('Formato de data não reconhecido:', value);
    return null;

  } catch (error) {
    console.error('Erro ao fazer parse da data da ficha:', error, 'valor:', value);
    return null;
  }
};

// Helper para verificar se uma data é válida
const isValid = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};
