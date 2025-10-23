import { parseBRL } from '@/utils/currency';
import { DEFAULT_FICHAS_MAPPINGS, type FieldMapping } from '@/config/fieldMappings';

const TRANSFORMERS: Record<string, (value: any) => any> = {
  parseBRL: (v: any) => parseBRL(v),
  parseDate: (v: any) => {
    if (!v) return null;
    const date = new Date(v);
    return date.toISOString();
  },
  parseBoolean: (v: any) => {
    if (typeof v === 'boolean') return v;
    const str = String(v).toLowerCase().trim();
    return ['sim', 'yes', '1', 'true', 'verdadeiro'].includes(str);
  },
  parseNumber: (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
};

export class FieldMappingService {
  private mappings: Map<string, FieldMapping> = new Map();

  constructor(mappings: FieldMapping[] = DEFAULT_FICHAS_MAPPINGS) {
    mappings.forEach(m => {
      this.mappings.set(m.supabaseField, m);
    });
  }

  normalize(rawData: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};
    const rawKeys = Object.keys(rawData);

    this.mappings.forEach((mapping, supabaseField) => {
      let value: any = undefined;

      for (const alias of [supabaseField, ...mapping.legacyAliases]) {
        const matchingKey = rawKeys.find(k => 
          k.trim().toLowerCase() === alias.toLowerCase()
        );

        if (matchingKey !== undefined && rawData[matchingKey] !== undefined) {
          value = rawData[matchingKey];
          break;
        }
      }

      if (value !== undefined && mapping.transformFunction) {
        const transformer = TRANSFORMERS[mapping.transformFunction];
        if (transformer) {
          value = transformer(value);
        }
      }

      if (value !== undefined) {
        normalized[supabaseField] = value;
      }
    });

    rawKeys.forEach(key => {
      const normalizedKey = key.toLowerCase().trim();
      if (!normalized[normalizedKey] && rawData[key] !== undefined) {
        normalized[normalizedKey] = rawData[key];
      }
    });

    return normalized;
  }

  normalizeFichaGeo(rawData: any): any {
    const normalized = this.normalize(rawData);

    if (normalized.latitude !== undefined) {
      normalized.lat = normalized.latitude;
    }
    if (normalized.longitude !== undefined) {
      normalized.lng = normalized.longitude;
    }

    return normalized;
  }

  validate(data: Record<string, any>): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    this.mappings.forEach((mapping, field) => {
      if (mapping.isRequired && !data[field]) {
        missing.push(field);
      }
    });

    return {
      valid: missing.length === 0,
      missing
    };
  }
}

export const fichaMapper = new FieldMappingService(DEFAULT_FICHAS_MAPPINGS);
