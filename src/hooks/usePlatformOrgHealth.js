import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { scoreOrgHealth } from '../lib/orgHealth';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Indicadores de valor e nota de saúde de todas as orgs (somente equipe da plataforma).
 *
 * @param {{ periodDays?: number }} [options] - tamanho da janela; o período anterior tem o mesmo tamanho.
 * @returns {{ rows: Array<object>, loading: boolean, error: Error|null, refetch: () => Promise<void> }}
 *   Cada linha é a linha da RPC acrescida de `health` (resultado de scoreOrgHealth).
 */
export function usePlatformOrgHealth({ periodDays = 30 } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const now = Date.now();
    const { data, error: rpcError } = await supabase.rpc('get_platform_org_health', {
      p_from: new Date(now - periodDays * DAY_MS).toISOString(),
      p_to: new Date(now).toISOString(),
    });

    if (rpcError) {
      console.error('get_platform_org_health failed', rpcError);
      setError(rpcError);
      setRows([]);
      setLoading(false);
      return;
    }

    const orgs = Array.isArray(data?.orgs) ? data.orgs : [];
    setRows(orgs.map((org) => ({ ...org, id: org.org_id, health: scoreOrgHealth(org, now) })));
    setLoading(false);
  }, [periodDays]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rows, loading, error, refetch };
}
