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
  const pageSize = 1000; // Supabase default limit
  let allRecords: T[] = [];
  let currentPage = 0;
  let hasMore = true;

  while (hasMore) {
    const from = currentPage * pageSize;
    const to = from + pageSize - 1;

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
      throw error;
    }

    if (data) {
      allRecords = allRecords.concat(data as T[]);
    }

    // Check if there are more records to fetch
    hasMore = data && data.length === pageSize && (!count || allRecords.length < count);
    currentPage++;
  }

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
