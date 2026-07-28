import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio, Square, RotateCcw } from 'lucide-react';
import { setWebinarStatus, WebinarActionError } from '../../lib/webinars';
import { WEBINAR_STATUS } from '../../lib/constants';

/**
 * Controle de início/encerramento do webinário ao vivo.
 * - Fora do ar (draft/scheduled/ended): botão "Iniciar ao vivo" -> status 'live'.
 * - Ao vivo: botão "Encerrar ao vivo" -> status 'ended'.
 * Toda transição passa pelo serviço centralizado (escopo por org + audit log).
 *
 * @param {Object} props
 * @param {{ id: string, status: string, title: string }} props.webinar
 * @param {string} props.orgId  - UUID da organização atual
 * @param {string} props.userId - UUID do usuário atual
 * @param {(updated: { id: string, title: string, status: string }) => void} props.onStatusChange
 */
export default function WebinarStatusControl({ webinar, orgId, userId, onStatusChange }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const isLive = webinar.status === WEBINAR_STATUS.LIVE;
  const isEnded = webinar.status === WEBINAR_STATUS.ENDED;

  const changeStatus = async (status) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await setWebinarStatus({ id: webinar.id, orgId, userId, status });
      onStatusChange?.(updated);
    } catch (err) {
      const message =
        err instanceof WebinarActionError ? err.message : t('webinar.statusChangeError');
      alert(message);
    } finally {
      setBusy(false);
    }
  };

  if (isLive) {
    return (
      <button
        type="button"
        className="btn btn-danger"
        onClick={() => changeStatus(WEBINAR_STATUS.ENDED)}
        disabled={busy}
      >
        {busy ? <span className="spinner spinner-sm" /> : <Square size={16} />}
        {t('webinar.endLive')}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => changeStatus(WEBINAR_STATUS.LIVE)}
      disabled={busy}
    >
      {busy ? <span className="spinner spinner-sm" /> : isEnded ? <RotateCcw size={16} /> : <Radio size={16} />}
      {isEnded ? t('webinar.goLiveAgain') : t('webinar.goLive')}
    </button>
  );
}
