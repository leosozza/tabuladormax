import type { Lead } from '@/repositories/types';
import type { IndicatorConfig } from '@/types/indicator';
import { applyIndicatorFilters } from './indicatorCalculations';

interface ProcessedChartData {
  series: any[];
  categories?: string[];
}

export function processChartData(data: Lead[], config: IndicatorConfig): ProcessedChartData {
  // Apply filters first
  const filteredData = applyIndicatorFilters(data, config);

  if (filteredData.length === 0) {
    return { series: [], categories: [] };
  }

  // Group data by the source column
  const groupedData = new Map<string, number>();

  filteredData.forEach((item) => {
    const key = String(item[config.source_column] || 'Sem dados');
    const currentValue = groupedData.get(key) || 0;

    switch (config.aggregation) {
      case 'count':
        groupedData.set(key, currentValue + 1);
        break;
      case 'count_distinct':
        // For count_distinct in charts, just count occurrences
        groupedData.set(key, currentValue + 1);
        break;
      case 'sum': {
        const value = parseFloat(String(item[config.source_column] || '0').replace(',', '.'));
        if (!isNaN(value)) {
          groupedData.set(key, currentValue + value);
        }
        break;
      }
      case 'avg': {
        const value = parseFloat(String(item[config.source_column] || '0').replace(',', '.'));
        if (!isNaN(value)) {
          const count = currentValue === 0 ? 0 : Math.floor(currentValue);
          const sum = currentValue - count;
          groupedData.set(key, sum + value + count + 1);
        }
        break;
      }
      default:
        groupedData.set(key, currentValue + 1);
    }
  });

  // Sort by value (descending) and take top 10
  const sortedEntries = Array.from(groupedData.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const categories = sortedEntries.map(([key]) => key);
  const values = sortedEntries.map(([, value]) => {
    // For average, calculate the actual average
    if (config.aggregation === 'avg') {
      const count = Math.floor(value);
      const sum = value - count;
      return count > 0 ? sum / count : 0;
    }
    return value;
  });

  // Format data based on chart type
  if (config.chart_type === 'pie' || config.chart_type === 'donut') {
    return {
      series: values,
      categories,
    };
  }

  // For bar and line charts
  return {
    series: [{
      name: config.title,
      data: values,
    }],
    categories,
  };
}
