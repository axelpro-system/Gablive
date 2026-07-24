import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://lgmtuabuuarxyfnhidbr.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXR1YWJ1dWFyeHlmbmhpZGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NzUzMTYsImV4cCI6MjEwMDI1MTMxNn0.QtwFSGHozU_npLqmTqV2M5VrD1KeZDuh0UNYJ08bVVg';

const defaultOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
};

/**
 * Factory: cria um novo cliente Supabase.
 * Útil para testes e para ambientes com configurações diferentes.
 */
export function createSupabaseClient(url, anonKey, options = {}) {
  return createClient(url || supabaseUrl, anonKey || supabaseAnonKey, {
    ...defaultOptions,
    ...options,
  });
}

/**
 * Singleton padrão — mantido para backward compatibility.
 * Todos os 22 imports existentes continuam funcionando.
 */
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);