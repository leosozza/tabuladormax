/**
 * Fichas Module - Main Entry Point
 * 
 * Complete module for fichas visualization with:
 * - Data loading from Supabase
 * - Persistent heatmap at all zoom levels
 * - Spatial selection (rectangle/polygon)
 * - Summary by projeto and scouter
 */

// Export all modules
export * from './data';
export * from './heat';
export * from './selection';
export * from './summary';

// Re-export for convenience
export { loadLeadsData, type LeadDataPoint, type LeadsDataResult } from './data';
export { createLeadsHeatmap, type HeatmapOptions, LeadsHeatmap } from './heat';
export { createLeadsSelection, type SelectionResult, LeadsSelection } from './selection';
export { generateSummary, formatSummaryText, generateSummaryHTML, type LeadsSummaryData } from './summary';
