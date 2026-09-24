import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

/**
 * Aviso inline de sucesso ou erro, anunciado a leitores de tela.
 * Mesmo padrão visual do aviso de Configurações, com estilos globais (`.inline-alert`).
 *
 * @param {Object} props
 * @param {'success'|'error'} props.type
 * @param {React.ReactNode} props.children - texto do aviso
 * @param {() => void} [props.onClose] - quando informado, exibe o botão de fechar
 * @param {string} [props.className]
 */
export default function InlineAlert({ type = 'success', children, onClose, className = '' }) {
  const { t } = useTranslation();
  const isError = type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <div
      className={`inline-alert inline-alert--${isError ? 'error' : 'success'} ${className}`.trim()}
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
    >
      <Icon size={18} aria-hidden="true" />
      <span className="inline-alert-text">{children}</span>
      {onClose && (
        <button
          type="button"
          className="inline-alert-dismiss"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
