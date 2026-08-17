/**
 * Derive lead KPI cards from org-scoped registration counts.
 * Counts come from the server; this only shapes the UI numbers.
 */
export function computeLeadKpis({ total = 0, attended = 0, avgWatchSeconds = 0 } = {}) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeAttended = Math.min(safeTotal, Math.max(0, Number(attended) || 0));
  const noShow = safeTotal - safeAttended;
  const attendanceRate = safeTotal === 0 ? 0 : Math.round((safeAttended / safeTotal) * 100);
  const safeAvgWatch = Math.max(0, Math.round(Number(avgWatchSeconds) || 0));

  return {
    total: safeTotal,
    attended: safeAttended,
    noShow,
    attendanceRate,
    avgWatchSeconds: safeAvgWatch,
  };
}

export function formatWatchDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  if (value <= 0) return '—';

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  }
  if (minutes > 0) return `${minutes} min`;
  return `${secs}s`;
}

/** Build registration_id → seconds from raw analytics_events rows. */
export function reduceWatchSeconds(events) {
  const acc = {};

  for (const event of events || []) {
    const id = event.registration_id;
    if (!id) continue;

    const bucket = acc[id] || {
      minAt: event.created_at,
      maxAt: event.created_at,
      maxProgress: 0,
    };

    if (event.created_at && event.created_at < bucket.minAt) bucket.minAt = event.created_at;
    if (event.created_at && event.created_at > bucket.maxAt) bucket.maxAt = event.created_at;

    const progress = Number(event.event_data?.seconds);
    if (event.event_type === 'video_progress' && Number.isFinite(progress) && progress > 0) {
      bucket.maxProgress = Math.max(bucket.maxProgress, progress);
    }

    acc[id] = bucket;
  }

  return Object.fromEntries(
    Object.entries(acc).map(([id, bucket]) => {
      const dwellSeconds = bucket.minAt && bucket.maxAt
        ? Math.max(0, (new Date(bucket.maxAt) - new Date(bucket.minAt)) / 1000)
        : 0;
      return [id, Math.round(Math.max(bucket.maxProgress, dwellSeconds, 0))];
    })
  );
}
