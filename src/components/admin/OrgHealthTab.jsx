import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, TrendingDown, TrendingUp, Minus, Settings2 } from 'lucide-react';
import { usePlatformOrgHealth } from '../../hooks/usePlatformOrgHealth';
import { compareByUrgency, HEALTH_CLASS, HEALTH_CLASS_ORDER } from '../../lib/orgHealth';
import { formatCurrency } from '../../lib/format';
import InlineAlert from '../ui/InlineAlert';
import ManagePlanDialog from './ManagePlanDialog';
import './OrgHealthTab.css';

const CLASS_BADGE = {
  [HEALTH_CLASS.HEALTHY]: 'badge-success',
  [HEALTH_CLASS.ATTENTION]: 'badge-warning',
  [HEALTH_CLASS.RISK]: 'badge-error',
  [HEALTH_CLASS.NEW]: 'badge-primary',
  [HEALTH_CLASS.UNKNOWN]: 'badge-gray',
};

const PERIODS = [30, 90];

const signalValue = (health, key) => health.signals.find((s) => s.key === key)?.value;

function TrendCell({ value }) {
  if (!value) return '—';
  const { current, previous } = value;
  const Icon = current > previous ? TrendingUp : current < previous ? TrendingDown : Minus;
  const delta = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  return (
    <span className="org-health-trend">
      <Icon size={14} aria-hidden="true" />
      {current} <span className="org-health-muted">/ {previous}</span>
      {delta !== null && <span className="org-health-muted"> ({delta > 0 ? '+' : ''}{delta}%)</span>}
    </span>
  );
}

function PlanCell({ row }) {
  const { t } = useTranslation();
  const sub = row.subscription;
  if (!sub) return <span className="org-health-muted">{t('admin.plan.noPlan')}</span>;
  const limit = sub.plan?.seat_limit;
  const over = limit != null && row.seats_used > limit;
  return (
    <>
      <div>{sub.plan?.name ?? '—'}</div>
      <div className="org-health-muted">
        {t(`admin.plan.statusLabel.${sub.status}`)} ·{' '}
        <span className={over ? 'org-health-over' : undefined}>
          {limit == null
            ? t('admin.plan.seatsUnlimited', { used: row.seats_used ?? 0 })
            : t('admin.plan.seatsOf', { used: row.seats_used ?? 0, limit })}
        </span>
      </div>
    </>
  );
}

function RevenueCell({ revenue }) {
  const entries = Object.entries(revenue || {});
  if (entries.length === 0) return '—';
  return entries.map(([currency, total]) => (
    <div key={currency}>{formatCurrency(total, currency)}</div>
  ));
}

/**
 * Aba "Saúde" do console da plataforma: valor entregue e risco de abandono por org.
 * Visível apenas para a equipe da plataforma (a RPC recusa qualquer outro usuário).
 */
export default function OrgHealthTab() {
  const { t } = useTranslation();
  const [periodDays, setPeriodDays] = useState(30);
  const [filter, setFilter] = useState('all');
  const [managing, setManaging] = useState(null);
  const { rows, loading, error, refetch } = usePlatformOrgHealth({ periodDays });

  const visible = useMemo(() => {
    const filtered = filter === 'all' ? rows : rows.filter((r) => r.health.classification === filter);
    return [...filtered].sort(compareByUrgency);
  }, [rows, filter]);

  const counts = useMemo(() => {
    const acc = {};
    rows.forEach((r) => {
      acc[r.health.classification] = (acc[r.health.classification] || 0) + 1;
    });
    return acc;
  }, [rows]);

  return (
    <div className="org-health">
      <div className="org-health-toolbar">
        <div className="org-health-summary" aria-live="polite">
          {HEALTH_CLASS_ORDER.filter((c) => counts[c]).map((c) => (
            <span key={c} className={`badge ${CLASS_BADGE[c]}`}>
              {t(`admin.health.class.${c}`)}: {counts[c]}
            </span>
          ))}
        </div>
        <div className="org-health-controls">
          <label className="org-health-control">
            <span>{t('admin.health.period')}</span>
            <select className="select" value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value))}>
              {PERIODS.map((d) => (
                <option key={d} value={d}>{t('admin.health.lastDays', { count: d })}</option>
              ))}
            </select>
          </label>
          <label className="org-health-control">
            <span>{t('admin.health.filter')}</span>
            <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">{t('admin.health.all')}</option>
              {HEALTH_CLASS_ORDER.map((c) => (
                <option key={c} value={c}>{t(`admin.health.class.${c}`)}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={refetch} disabled={loading}>
            <RefreshCw size={14} aria-hidden="true" /> {t('admin.health.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <InlineAlert type="error" className="mb-4">
          {t('admin.health.loadError')}
        </InlineAlert>
      )}

      {loading ? (
        <div className="org-health-loading"><div className="spinner" /></div>
      ) : !error && visible.length === 0 ? (
        <div className="admin-empty">
          <p className="text-gray-500">{rows.length === 0 ? t('admin.health.empty') : t('admin.health.emptyFilter')}</p>
        </div>
      ) : !error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t('admin.health.col.org')}</th>
                <th scope="col">{t('admin.health.col.score')}</th>
                <th scope="col">{t('admin.health.col.lastRegistration')}</th>
                <th scope="col">{t('admin.health.col.registrations')}</th>
                <th scope="col">{t('admin.health.col.attendance')}</th>
                <th scope="col">{t('admin.health.col.ctaClicks')}</th>
                <th scope="col">{t('admin.health.col.sales')}</th>
                <th scope="col">{t('admin.health.col.revenue')}</th>
                <th scope="col">{t('admin.health.col.plan')}</th>
                <th scope="col"><span className="sr-only">{t('common.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const { health } = row;
                const days = signalValue(health, 'recency');
                const attendance = signalValue(health, 'attendance');
                return (
                  <tr key={row.id}>
                    <td>
                      <div className="org-health-name">{row.name}</div>
                      <div className="org-health-muted">{row.slug}</div>
                    </td>
                    <td>
                      <div className="org-health-score">
                        <strong>{health.score ?? '—'}</strong>
                        <span className={`badge ${CLASS_BADGE[health.classification]}`}>
                          {t(`admin.health.class.${health.classification}`)}
                        </span>
                      </div>
                      {!health.complete && (
                        <div className="org-health-muted">{t('admin.health.incomplete')}</div>
                      )}
                    </td>
                    <td>{days == null ? t('admin.health.never') : t('admin.health.daysAgo', { count: days })}</td>
                    <td><TrendCell value={signalValue(health, 'trend')} /></td>
                    <td>{attendance == null ? '—' : `${Math.round(attendance * 100)}%`}</td>
                    <td>{row.current?.cta_clicks ?? '—'}</td>
                    <td>{row.current?.approved_purchases ?? '—'}</td>
                    <td><RevenueCell revenue={row.current?.revenue_by_currency} /></td>
                    <td><PlanCell row={row} /></td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setManaging(row)}
                        aria-label={t('admin.plan.manageFor', { org: row.name })}
                      >
                        <Settings2 size={14} aria-hidden="true" /> {t('admin.plan.manage')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {managing && (
        <ManagePlanDialog
          org={managing}
          onClose={() => setManaging(null)}
          onSaved={() => {
            setManaging(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
