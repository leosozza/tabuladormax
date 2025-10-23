/**
 * Selection Hash Utilities
 * Generate unique hash for area selections (for future cacheability)
 */

/**
 * Simple hash function for strings
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate hash for polygon coordinates
 * @param coords - Array of [lng, lat] coordinates
 * @returns Hash string for the selection
 */
export function generateSelectionHash(coords: number[][]): string {
  // Normalize coordinates to 4 decimal places and create stable string
  const normalized = coords
    .map(([lng, lat]) => `${lng.toFixed(4)},${lat.toFixed(4)}`)
    .join('|');
  
  return simpleHash(normalized);
}

/**
 * Generate hash for a summary (for caching analysis results)
 * @param total - Total number of items
 * @param projectCounts - Map of project to count
 * @returns Hash string for the summary
 */
export function generateSummaryHash(
  total: number,
  projectCounts: Record<string, number>
): string {
  const sortedProjects = Object.entries(projectCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([proj, count]) => `${proj}:${count}`)
    .join('|');
  
  return simpleHash(`${total}|${sortedProjects}`);
}
