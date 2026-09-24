import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { SUBSCRIPTION_STATUS } from '../../lib/seats';
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../../lib/format';
import InlineAlert from '../ui/InlineAlert';

/**
 * Equipe da plataforma: troca plano, status, fim do teste e observações de uma org.
 * Cada alteração é auditada no servidor (admin-api → audit_logs).
 *
 * @param {{ org: { id: string, name: string, subscription: object|null }, onClose: () => void, onSaved: () => void }} props
 */
export default function ManagePlanDialog({ org, onClose, onSaved }) {
  const { t } = useTranslation();
  const ids = useId();
  const sub = org.subscription;

  const [plans, setPlans] = useState([]);
  const [plansError, setPlansError] = useState(false);
  const [form, setForm] = useState({
    plan_id: sub?.plan?.id ?? '',
    status: sub?.status ?? SUBSCRIPTION_STATUS.TRIAL,
    trial_ends_at: toDatetimeLocalValue(sub?.trial_ends_at),
    internal_notes: sub?.internal_notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let active = true;
    adminApi.listPlans()
      .then((res) => { if (active) setPlans(res.data ?? []); })
      .catch((err) => {
        console.error('listPlans failed', err);
        if (active) setPlansError(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [saving, onClose]);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await adminApi.updateSubscription(org.id, {
        plan_id: form.plan_id,
        status: form.status,
        trial_ends_at: fromDatetimeLocalValue(form.trial_ends_at),
        internal_notes: form.internal_notes.trim() || null,
      });
      onSaved();
    } catch (err) {
      console.error('updateSubscription failed', err);
      setSaveError(t('admin.plan.saveError'));
      setSaving(false);
    }
  };

  const planLabel = (p) => {
    const seats = p.seat_limit == null ? t('admin.plan.unlimited') : t('admin.plan.seats', { count: p.seat_limit });
    return `${p.name} · ${seats}${p.is_active ? '' : ` (${t('admin.plan.notForSale')})`}`;
  };

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3 id={`${ids}-title`} className="modal-title">
              {t('admin.plan.title', { org: org.name })}
            </h3>
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} disabled={saving} aria-label={t('common.close')}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="modal-body">
            {!sub && (
              <InlineAlert type="error" className="mb-4">{t('admin.plan.noSubscription')}</InlineAlert>
            )}
            {plansError && (
              <InlineAlert type="error" className="mb-4">{t('admin.plan.plansError')}</InlineAlert>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor={`${ids}-plan`}>{t('admin.plan.plan')}</label>
              <select id={`${ids}-plan`} className="select" value={form.plan_id} onChange={update('plan_id')} required disabled={!sub}>
                {!form.plan_id && <option value="">—</option>}
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{planLabel(p)}</option>
                ))}
              </select>
              <span className="input-hint">{t('admin.plan.planHint')}</span>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor={`${ids}-status`}>{t('admin.plan.status')}</label>
              <select id={`${ids}-status`} className="select" value={form.status} onChange={update('status')} disabled={!sub}>
                {Object.values(SUBSCRIPTION_STATUS).map((s) => (
                  <option key={s} value={s}>{t(`admin.plan.statusLabel.${s}`)}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor={`${ids}-trial`}>{t('admin.plan.trialEndsAt')}</label>
              <input
                id={`${ids}-trial`}
                type="datetime-local"
                className="input"
                value={form.trial_ends_at}
                onChange={update('trial_ends_at')}
                disabled={!sub}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor={`${ids}-notes`}>{t('admin.plan.notes')}</label>
              <textarea
                id={`${ids}-notes`}
                className="input textarea"
                rows={3}
                maxLength={2000}
                value={form.internal_notes}
                onChange={update('internal_notes')}
                disabled={!sub}
              />
              <span className="input-hint">{t('admin.plan.notesHint')}</span>
            </div>

            {saveError && <InlineAlert type="error">{saveError}</InlineAlert>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !sub || !form.plan_id}>
              {saving ? <span className="spinner spinner-sm" /> : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
