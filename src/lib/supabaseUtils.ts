import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetches all records from a Supabase table, handling pagination automatically.
 * Supabase has a default limit of 1000 rows per query, so this function
 * fetches data in batches until all records are retrieved.
 * 
 * @param supabase - Supabase client instance
 * @param tableName - Name of the table to query
 * @param selectQuery - Fields to select (e.g., '*' or 'id, name, scouter')
 * @param filterFn - Optional function to apply filters to the query
 * @returns Promise with all records
 */
export async function fetchAllRecords<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  tableName: string,
  selectQuery: string = '*',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterFn?: (query: any) => any
): Promise<T[]> {
  const pageSize = 1000;
  let allRecords: T[] = [];
  let currentPage = 0;
  let hasMore = true;
  const MAX_PAGES = 200; // Limite de segurança: 200.000 registros

  console.log(`[fetchAllRecords] Iniciando busca na tabela "${tableName}"`);

  while (hasMore && currentPage < MAX_PAGES) {
    const from = currentPage * pageSize;
    const to = from + pageSize - 1;

    console.log(`[fetchAllRecords] Página ${currentPage + 1}: buscando registros ${from}-${to}`);

    let query = supabase
      .from(tableName)
      .select(selectQuery, { count: 'exact' })
      .range(from, to);

    // Apply filters if provided
    if (filterFn) {
      query = filterFn(query);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error(`[fetchAllRecords] Erro na página ${currentPage + 1}:`, error);
      throw error;
    }

    if (data) {
      allRecords = allRecords.concat(data as T[]);
      console.log(`[fetchAllRecords] ${data.length} registros retornados. Total acumulado: ${allRecords.length}`);
    }

    // Check if there are more records to fetch
    hasMore = data && data.length === pageSize && (!count || allRecords.length < count);
    currentPage++;
  }

  if (currentPage >= MAX_PAGES) {
    console.warn(`[fetchAllRecords] Limite de páginas atingido (${MAX_PAGES}). Pode haver mais registros não carregados.`);
  }

  console.log(`[fetchAllRecords] Busca concluída. Total de registros: ${allRecords.length}`);
  return allRecords;
}

/**
 * Fetches all leads from the database with automatic pagination
 * 
 * @param supabase - Supabase client instance
 * @param selectQuery - Fields to select (default: '*')
 * @param filterFn - Optional function to apply filters to the query
 * @returns Promise with all leads
 */
export async function fetchAllLeads<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  selectQuery: string = '*',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterFn?: (query: any) => any
): Promise<T[]> {
  return fetchAllRecords<T>(supabase, 'leads', selectQuery, filterFn);
}
