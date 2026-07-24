import { createContext, useContext, useMemo } from 'react';
import { createSupabaseClient, supabase as defaultClient } from '../lib/supabase';

const SupabaseContext = createContext(null);

/**
 * Provider que disponibiliza um cliente Supabase para toda a árvore.
 *
 * Aceita um `client` opcional (útil para testes ou SSR).
 * Se não fornecido, usa o singleton padrão.
 */
export function SupabaseProvider({ client, children }) {
  const value = useMemo(() => client || defaultClient, [client]);

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

/**
 * Hook para consumir o cliente Supabase do contexto.
 *
 * Uso:
 *   const supabase = useSupabase();
 *   const { data } = await supabase.from('webinars').select('*');
 *
 * Lança erro se usado fora de um <SupabaseProvider>.
 */
export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error(
      'useSupabase() deve ser usado dentro de um <SupabaseProvider>. ' +
        'Envolva seu componente com <SupabaseProvider> em main.jsx.',
    );
  }
  return ctx;
}