import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

/**
 * Diálogo de confirmação para ações que afetam outras pessoas ou não podem ser desfeitas.
 * Fecha com Esc e com clique no fundo; o foco inicial vai para "Cancelar" (escolha segura).
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {React.ReactNode} props.message
 * @param {string} [props.confirmLabel] - padrão: "Confirmar"
 * @param {'danger'|'primary'} [props.tone='danger']
 * @param {boolean} [props.busy] - desabilita os botões enquanto a ação roda
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onCancel}>
      <div
        className="modal confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="modal-header">
          <h3 id="confirm-dialog-title" className="modal-title confirm-dialog-title">
            {tone === 'danger' && (
              <AlertTriangle size={20} className="confirm-dialog-icon" aria-hidden="true" />
            )}
            {title}
          </h3>
        </div>
        <div className="modal-body">
          <p id="confirm-dialog-message" className="confirm-dialog-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <span className="spinner spinner-sm" /> : (confirmLabel || t('common.confirm'))}
          </button>
        </div>
      </div>
    </div>
  );
}
