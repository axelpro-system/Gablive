import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example).'
  );
}

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