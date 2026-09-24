import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { summarizeSeats } from '../lib/seats';

// PostgREST responde PGRST202 quando a função ainda não existe (migration não aplicada).
const FUNCTION_NOT_FOUND = 'PGRST202';

/**
 * Plano, status da assinatura e uso de assentos da org atual.
 *
 * `unavailable` = o backend ainda não tem planos (migrations 035/036 não aplicadas):
 * as telas devem esconder o indicador em vez de mostrar erro.
 */
export function usePlan() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('get_org_seat_usage');

    if (rpcError) {
      if (rpcError.code === FUNCTION_NOT_FOUND) {
        setUnavailable(true);
      } else {
        console.error('get_org_seat_usage failed', rpcError);
        setError(rpcError);
      }
      setUsage(null);
      setLoading(false);
      return;
    }

    setUnavailable(false);
    setUsage(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const summary = useMemo(() => summarizeSeats(usage), [usage]);

  return { usage, summary, loading, error, unavailable, refetch };
}
