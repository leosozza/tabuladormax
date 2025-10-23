/**
 * Helper to create a Supabase client for TabuladorMax connection testing
 * Uses a separate storage key to avoid "Multiple GoTrueClient instances" warnings
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client configured for TabuladorMax connection testing
 * 
 * @param url - TabuladorMax Supabase URL
 * @param anonKey - TabuladorMax anon/publishable key
 * @returns Configured Supabase client with isolated auth storage
 */
export function createTabuladorClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: 'tabulador_auth', // Separate storage key to avoid GoTrue conflicts
    },
  });
}
