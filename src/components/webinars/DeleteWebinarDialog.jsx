import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { deleteWebinar, WebinarActionError } from '../../lib/webinars';

/**
 * Modal de confirmação destrutiva reutilizável para excluir um webinário.
 * Exige que o usuário digite o título exato para habilitar a exclusão.
 * A ação em si é delegada ao serviço centralizado `deleteWebinar`
 * (escopo por org + audit log).
 *
 * @param {Object} props
 * @param {{ id: string, title: string }} props.webinar - webinário alvo
 * @param {string} props.orgId  - UUID da organização atual
 * @param {string} props.userId - UUID do usuário atual
 * @param {() => void} props.onClose   - fecha o modal sem excluir
 * @param {(id: string) => void} props.onDeleted - callback após exclusão bem-sucedida
 */
export default function DeleteWebinarDialog({ webinar, orgId, userId, onClose, onDeleted }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const expectedTitle = webinar?.title || '';
  const matches = value.trim() === expectedTitle.trim();

  const handleDelete = async () => {
    if (!matches || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteWebinar({
        id: webinar.id,
        orgId,
        userId,
        expectedTitle,
        confirmationTitle: value,
      });
      onDeleted?.(webinar.id);
    } catch (err) {
      const message =
        err instanceof WebinarActionError ? err.message : t('webinar.deleteError');
      setError(message);
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={deleting ? undefined : onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
            <AlertTriangle size={20} style={{ color: 'var(--color-error-600)' }} />
            {t('webinar.deleteWebinar')}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={deleting}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: 16, color: 'var(--color-gray-600)' }}>
            {t('webinar.deleteConfirm')}
          </p>
          <label className="input-label" style={{ display: 'block', marginBottom: 6 }}>
            {t('webinar.deleteTypeToConfirm')}
          </label>
          <p
            style={{
              marginBottom: 10,
              fontWeight: 600,
              wordBreak: 'break-word',
              color: 'var(--color-gray-900, #101828)',
            }}
          >
            {expectedTitle}
          </p>
          <input
            className="input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={expectedTitle}
            autoFocus
            disabled={deleting}
          />
          {error && (
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--color-error-600)' }}>
              {error}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={deleting}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={!matches || deleting}
          >
            {deleting ? (
              <span className="spinner spinner-sm" />
            ) : (
              <>
                <Trash2 size={16} />
                {t('common.delete')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
