import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCreateWebinar } from '../../hooks/useWebinar';
import { WEBINAR_TYPE, VIDEO_PLATFORM, DEFAULT_REPLAY_HOURS, RECURRENCE_TYPE } from '../../lib/constants';
import { ArrowLeft, ArrowRight, Video, Radio, Youtube, Infinity as InfinityIcon, CalendarClock } from 'lucide-react';
import './CreateWebinarPage.css';

export default function CreateWebinarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createWebinar, loading } = useCreateWebinar();

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: WEBINAR_TYPE.RECORDED,
    video_url: '',
    video_platform: VIDEO_PLATFORM.YOUTUBE,
    scheduled_at: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    replay_enabled: true,
    replay_expires_hours: DEFAULT_REPLAY_HOURS,
    presenter_name: '',
    is_just_in_time: false,
    use_wait_room: false,
    recurrence_type: RECURRENCE_TYPE.NONE,
    session_duration_minutes: 60,
  });

  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const webinar = await createWebinar({
        ...form,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        status: form.is_just_in_time || form.scheduled_at ? 'scheduled' : 'draft',
      });
      navigate(`/webinars/${webinar.id}`);
    } catch (err) {
      setError(err.message || 'Error creating webinar');
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="create-webinar-page">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/webinars')}>
          <ArrowLeft size={18} />
          {t('common.back')}
        </button>
      </div>

      <div className="create-webinar-card">
        <div className="create-webinar-header">
          <h1>{t('webinar.createWebinar')}</h1>
          <p className="page-subtitle">Configure seu novo webinário</p>
        </div>

        <form onSubmit={handleSubmit} className="create-webinar-form">
          {error && <div className="auth-error">{error}</div>}

          {/* Title */}
          <div className="input-group">
            <label className="input-label" htmlFor="cw-title">
              {t('webinar.titleLabel')} <span className="required">*</span>
            </label>
            <input
              id="cw-title"
              type="text"
              className="input"
              placeholder={t('webinar.titlePlaceholder')}
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="input-group">
            <label className="input-label" htmlFor="cw-desc">
              {t('webinar.descriptionLabel')}
            </label>
            <textarea
              id="cw-desc"
              className="input textarea"
              placeholder={t('webinar.descriptionPlaceholder')}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Type */}
          <div className="input-group">
            <label className="input-label">{t('webinar.typeLabel')}</label>
            <div className="type-selector">
              <button
                type="button"
                className={`type-option ${form.type === WEBINAR_TYPE.LIVE ? 'selected' : ''}`}
                onClick={() => updateField('type', WEBINAR_TYPE.LIVE)}
              >
                <Radio size={24} />
                <span className="type-option-label">{t('webinar.typeLive')}</span>
                <span className="type-option-desc">YouTube Live embed</span>
              </button>
              <button
                type="button"
                className={`type-option ${form.type === WEBINAR_TYPE.RECORDED ? 'selected' : ''}`}
                onClick={() => updateField('type', WEBINAR_TYPE.RECORDED)}
              >
                <Video size={24} />
                <span className="type-option-label">{t('webinar.typeRecorded')}</span>
                <span className="type-option-desc">Vídeo pré-gravado</span>
              </button>
            </div>
          </div>

          {/* Video URL */}
          <div className="input-group">
            <label className="input-label" htmlFor="cw-video">
              {t('webinar.videoUrl')}
            </label>
            <div className="input-with-icon">
              <Youtube size={18} className="input-icon" />
              <input
                id="cw-video"
                type="url"
                className="input input-icon-left"
                placeholder={t('webinar.videoUrlPlaceholder')}
                value={form.video_url}
                onChange={(e) => updateField('video_url', e.target.value)}
              />
            </div>
            <span className="input-hint">YouTube ou Vimeo</span>
          </div>

          {/* Presenter */}
          <div className="input-group">
            <label className="input-label" htmlFor="cw-presenter">
              Nome do apresentador
            </label>
            <input
              id="cw-presenter"
              type="text"
              className="input"
              placeholder="Ex: João Silva"
              value={form.presenter_name}
              onChange={(e) => updateField('presenter_name', e.target.value)}
            />
          </div>

          {/* Webinar mode: único vs Just-in-Time */}
          <div className="input-group">
            <label className="input-label">Modo do webinário</label>
            <div className="type-selector">
              <button
                type="button"
                className={`type-option ${!form.is_just_in_time ? 'selected' : ''}`}
                onClick={() => updateField('is_just_in_time', false)}
              >
                <CalendarClock size={24} />
                <span className="type-option-label">Webinar único</span>
                <span className="type-option-desc">Data e hora fixas para todos</span>
              </button>
              <button
                type="button"
                className={`type-option ${form.is_just_in_time ? 'selected' : ''}`}
                onClick={() => updateField('is_just_in_time', true)}
              >
                <InfinityIcon size={24} />
                <span className="type-option-label">Just in Time (evergreen)</span>
                <span className="type-option-desc">Começa quando o lead entra</span>
              </button>
            </div>
          </div>

          {!form.is_just_in_time && (
            <div className="form-row">
              <div className="input-group">
                <label className="input-label" htmlFor="cw-date">
                  {t('webinar.scheduledAt')}
                </label>
                <input
                  id="cw-date"
                  type="datetime-local"
                  className="input"
                  value={form.scheduled_at}
                  onChange={(e) => updateField('scheduled_at', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="cw-tz">
                  {t('webinar.timezone')}
                </label>
                <select
                  id="cw-tz"
                  className="input select"
                  value={form.timezone}
                  onChange={(e) => updateField('timezone', e.target.value)}
                >
                  <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                  <option value="America/New_York">New York (EST)</option>
                  <option value="America/Chicago">Chicago (CST)</option>
                  <option value="America/Denver">Denver (MST)</option>
                  <option value="America/Los_Angeles">Los Angeles (PST)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                </select>
              </div>
            </div>
          )}

          {form.is_just_in_time && (
            <div className="form-row">
              <div className="input-group">
                <label className="input-label" htmlFor="cw-recurrence">
                  Recorrência das sessões
                </label>
                <select
                  id="cw-recurrence"
                  className="input select"
                  value={form.recurrence_type}
                  onChange={(e) => updateField('recurrence_type', e.target.value)}
                >
                  <option value={RECURRENCE_TYPE.NONE}>Sempre disponível (inicia na entrada)</option>
                  <option value={RECURRENCE_TYPE.DAILY}>Sessões diárias</option>
                  <option value={RECURRENCE_TYPE.WEEKLY}>Sessões semanais</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="cw-duration">
                  Duração da sessão (minutos)
                </label>
                <input
                  id="cw-duration"
                  type="number"
                  className="input"
                  min={1}
                  value={form.session_duration_minutes}
                  onChange={(e) => updateField('session_duration_minutes', parseInt(e.target.value, 10) || 60)}
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label toggle-label">
              <input
                type="checkbox"
                className="toggle"
                checked={form.use_wait_room}
                onChange={(e) => updateField('use_wait_room', e.target.checked)}
              />
              Usar sala de espera antes do início
            </label>
          </div>

          {/* Replay */}
          <div className="form-row">
            <div className="input-group">
              <label className="input-label toggle-label">
                <input
                  type="checkbox"
                  className="toggle"
                  checked={form.replay_enabled}
                  onChange={(e) => updateField('replay_enabled', e.target.checked)}
                />
                {t('webinar.replayEnabled')}
              </label>
            </div>
            {form.replay_enabled && (
              <div className="input-group">
                <label className="input-label" htmlFor="cw-replay-hours">
                  {t('webinar.replayExpires')}
                </label>
                <input
                  id="cw-replay-hours"
                  type="number"
                  className="input"
                  min={1}
                  max={720}
                  value={form.replay_expires_hours}
                  onChange={(e) => updateField('replay_expires_hours', parseInt(e.target.value, 10))}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="create-webinar-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/webinars')}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-create btn-lg"
              disabled={loading || !form.title}
            >
              {loading ? (
                <span className="spinner spinner-sm" />
              ) : (
                <>
                  {t('webinar.createWebinar')}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
