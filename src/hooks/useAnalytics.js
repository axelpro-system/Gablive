import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Normalize RPC JSON (snake_case) into the camelCase shape used by UI.
 */
export function mapWebinarStats(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const totalRegistrations = Number(raw.total_registrations ?? 0);
  const totalAttendees = Number(raw.total_attendees ?? 0);
  const ctaClicks = Number(raw.cta_clicks ?? 0);
  const ctaViews = Number(raw.cta_views ?? 0);
  const showUpRate = Number(raw.show_up_rate ?? 0);
  const conversionRate = Number(
    raw.conversion_rate ?? (totalRegistrations > 0
      ? Math.round((totalAttendees / totalRegistrations) * 100)
      : 0)
  );

  return {
    totalRegistrations,
    totalAttendees,
    showUpRate,
    conversionRate,
    ctaClicks,
    ctaViews,
    ctaConversion: Number(raw.cta_conversion ?? 0),
    chatMessages: Number(raw.chat_messages ?? 0),
    pollResponses: Number(raw.poll_responses ?? 0),
    avgWatchTime: Number(raw.avg_watch_seconds ?? 0),
    webinarEntered: Number(raw.webinar_entered ?? 0),
    watch15: Number(raw.watch_15 ?? 0),
    watch30: Number(raw.watch_30 ?? 0),
    watch45: Number(raw.watch_45 ?? 0),
    watch60: Number(raw.watch_60 ?? 0),
    pitchReached: Number(raw.pitch_reached ?? 0),
    offerShown: Number(raw.offer_shown ?? 0),
    revenueCents: Number(raw.revenue_cents ?? 0),
    purchasesCount: Number(raw.purchases_count ?? 0),
  };
}

export function mapOrgWebinarRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.webinar_id,
    title: raw.title || 'Unknown',
    type: raw.type,
    status: raw.status,
    scheduledAt: raw.scheduled_at,
    totalRegistrations: Number(raw.total_registrations ?? 0),
    totalAttendees: Number(raw.total_attendees ?? 0),
    ctaClicks: Number(raw.cta_clicks ?? 0),
    pollResponses: Number(raw.poll_responses ?? 0),
    showUpRate:
      Number(raw.total_registrations) > 0
        ? (
            (Number(raw.total_attendees ?? 0) / Number(raw.total_registrations)) *
            100
          ).toFixed(1)
        : '0',
  };
}

/**
 * Per-webinar KPIs via server-side RPC (avoids PostgREST max_rows truncation).
 */
export function useAnalytics(webinarId) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!webinarId) return;
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('get_webinar_stats', {
      p_webinar_id: webinarId,
    });

    if (rpcError) {
      console.error('get_webinar_stats failed', rpcError);
      setError(rpcError);
      setStats(null);
      setLoading(false);
      return;
    }

    setStats(mapWebinarStats(data));
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // `events` removed: raw event dumps hit max_rows and must not drive KPIs.
  return { stats, events: [], loading, error, refetch: fetchStats };
}

export function useTrackEvent() {
  const trackEvent = useCallback(async (webinarId, registrationId, eventType, eventData = {}) => {
    await supabase.from('analytics_events').insert({
      webinar_id: webinarId,
      registration_id: registrationId,
      event_type: eventType,
      event_data: eventData,
    });
  }, []);

  return { trackEvent };
}

/**
 * Compare multiple webinars using org-level RPC (single round-trip).
 * If `webinarIds` is provided, filters the org list to those ids.
 */
export function useWebinarComparison(webinarIds) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchComparison = async () => {
      setLoading(true);

      const { data: rows, error } = await supabase.rpc('get_org_webinar_stats');

      if (cancelled) return;

      if (error) {
        console.error('get_org_webinar_stats failed', error);
        setData([]);
        setLoading(false);
        return;
      }

      let mapped = (Array.isArray(rows) ? rows : []).map(mapOrgWebinarRow).filter(Boolean);

      if (webinarIds && webinarIds.length > 0) {
        const allow = new Set(webinarIds);
        mapped = mapped.filter((r) => allow.has(r.id));
      }

      setData(
        mapped.map((r) => ({
          id: r.id,
          title: r.title,
          scheduledAt: r.scheduledAt,
          registrations: r.totalRegistrations,
          attendees: r.totalAttendees,
          showUpRate: r.showUpRate,
          ctaClicks: r.ctaClicks,
        }))
      );
      setLoading(false);
    };

    fetchComparison();
    return () => {
      cancelled = true;
    };
  }, [webinarIds]);

  return { data, loading };
}

/**
 * Org-wide list of per-webinar aggregates for the global analytics page.
 */
export function useOrgWebinarStats() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('get_org_webinar_stats');

    if (rpcError) {
      console.error('get_org_webinar_stats failed', rpcError);
      setError(rpcError);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((Array.isArray(data) ? data : []).map(mapOrgWebinarRow).filter(Boolean));
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rows, loading, error, refetch };
}
