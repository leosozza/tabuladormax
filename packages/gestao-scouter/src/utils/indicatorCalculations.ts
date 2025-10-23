import type { IndicatorConfig } from '@/types/indicator';

export function applyIndicatorFilters(data: any[], config: IndicatorConfig): any[] {
  let filteredData = [...data];

  if (!config.filter_condition) return filteredData;

  const filters = config.filter_condition;

  // Date filters
  if (filters.date_filter) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (filters.date_filter === 'today') {
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.criado_em || item.criado).toISOString().split('T')[0];
        return itemDate === today;
      });
    } else if (filters.date_filter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.criado_em || item.criado);
        return itemDate >= weekAgo;
      });
    } else if (filters.date_filter === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.criado_em || item.criado);
        return itemDate >= monthAgo;
      });
    } else if (filters.date_filter === 'custom' && filters.date_range) {
      const start = new Date(filters.date_range.start);
      const end = new Date(filters.date_range.end);
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.criado_em || item.criado);
        return itemDate >= start && itemDate <= end;
      });
    }
  }

  // Scouter filter
  if (filters.scouter && filters.scouter.length > 0) {
    filteredData = filteredData.filter((item) =>
      filters.scouter!.includes(item.scouter)
    );
  }

  // Project filter
  if (filters.projeto && filters.projeto.length > 0) {
    filteredData = filteredData.filter((item) =>
      filters.projeto!.includes(item.projeto || item.projetos)
    );
  }

  // Stage filter
  if (filters.etapa && filters.etapa.length > 0) {
    filteredData = filteredData.filter((item) =>
      filters.etapa!.includes(item.etapa)
    );
  }

  // Confirmed filter
  if (filters.confirmado && filters.confirmado.length > 0) {
    filteredData = filteredData.filter((item) =>
      filters.confirmado!.includes(item.ficha_confirmada || item.confirmado)
    );
  }

  return filteredData;
}

export function calculateIndicatorValue(
  data: any[],
  config: IndicatorConfig
): number {
  if (!data || data.length === 0) return 0;

  // Apply filters
  const filteredData = applyIndicatorFilters(data, config);

  const values = filteredData
    .map((item) => item[config.source_column])
    .filter((v) => v !== null && v !== undefined);

  switch (config.aggregation) {
    case 'count':
      return values.length;

    case 'count_distinct':
      return new Set(values).size;

    case 'sum':
      return values.reduce((sum, val) => {
        const num = parseFloat(String(val).replace(',', '.'));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);

    case 'avg': {
      const sum = values.reduce((s, val) => {
        const num = parseFloat(String(val).replace(',', '.'));
        return s + (isNaN(num) ? 0 : num);
      }, 0);
      return values.length > 0 ? sum / values.length : 0;
    }

    case 'min': {
      const nums = values.map((v) => parseFloat(String(v).replace(',', '.'))).filter((n) => !isNaN(n));
      return nums.length > 0 ? Math.min(...nums) : 0;
    }

    case 'max': {
      const nums = values.map((v) => parseFloat(String(v).replace(',', '.'))).filter((n) => !isNaN(n));
      return nums.length > 0 ? Math.max(...nums) : 0;
    }

    default:
      return 0;
  }
}
