/**
 * Default HTML email templates for Gablive (Resend html body).
 * Placeholders: {name}, {webinar_title}, {wait_url}, {room_url}, {replay_url}, {email}
 */

const BRAND_RED = '#E31C23';
const INK = '#101828';
const SLATE = '#475467';
const MUTED = '#98A2B3';
const BORDER = '#EAECF0';
const SURFACE = '#FCFCFD';

function layout({ preheader, title, bodyHtml, ctaLabel, ctaUrl, footerNote }) {
  const ctaBlock = ctaLabel && ctaUrl
    ? `
      <tr>
        <td style="padding:8px 32px 28px;">
          <a href="${ctaUrl}" target="_blank" rel="noopener"
             style="display:inline-block;background:${BRAND_RED};color:#ffffff;text-decoration:none;
                    font-family:Inter,Segoe UI,Arial,sans-serif;font-size:15px;font-weight:600;
                    padding:12px 22px;border-radius:8px;">
            ${ctaLabel}
          </a>
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <!--[if !mso]><!-->
  <style>
    @media (max-width:600px) {
      .container { width:100% !important; }
      .px { padding-left:20px !important; padding-right:20px !important; }
    }
  </style>
  <!--<![endif]-->
</head>
<body style="margin:0;padding:0;background:${SURFACE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${SURFACE};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="560" cellspacing="0" cellpadding="0"
               style="width:560px;max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:${BRAND_RED};padding:18px 32px;">
              <span style="font-family:Inter,Segoe UI,Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                Gablive
              </span>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:28px 32px 8px;">
              <h1 style="margin:0 0 12px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:22px;line-height:1.3;color:${INK};font-weight:700;">
                ${title}
              </h1>
              <div style="font-family:Inter,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:${SLATE};">
                ${bodyHtml}
              </div>
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td style="padding:0 32px 24px;border-top:1px solid ${BORDER};">
              <p style="margin:16px 0 0;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.5;color:${MUTED};">
                ${footerNote || 'Você recebeu este e-mail porque se inscreveu em um webinário na Gablive.'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const DEFAULT_EMAIL_SUBJECTS = {
  confirmation: 'Inscrição confirmada — {webinar_title}',
  reminder: 'Começa em breve — {webinar_title}',
  replay: 'Replay liberado — {webinar_title}',
};

/**
 * Default bodies stored in email_configs (editable in dashboard).
 * Full layout is applied at send time when body looks plain, or send uses body as-is if full HTML document.
 */
export function getDefaultEmailBodyHtml(type) {
  switch (type) {
    case 'confirmation':
      return layout({
        preheader: 'Sua inscrição no webinário foi confirmada.',
        title: 'Inscrição confirmada',
        bodyHtml: `
          <p style="margin:0 0 12px;">Olá <strong>{name}</strong>,</p>
          <p style="margin:0 0 12px;">Sua vaga em <strong>{webinar_title}</strong> está garantida.</p>
          <p style="margin:0 0 0;">Guarde este e-mail. No horário do evento, entre pela sala com o botão abaixo.</p>
        `,
        ctaLabel: 'Acessar sala de espera',
        ctaUrl: '{wait_url}',
        footerNote: 'Se o botão não funcionar, copie e cole no navegador: {wait_url}',
      });
    case 'reminder':
      return layout({
        preheader: 'Seu webinário começa em breve.',
        title: 'Estamos quase no ar',
        bodyHtml: `
          <p style="margin:0 0 12px;">Olá <strong>{name}</strong>,</p>
          <p style="margin:0 0 12px;"><strong>{webinar_title}</strong> começa em breve.</p>
          <p style="margin:0 0 0;">Entre agora para não perder o início e as ofertas da transmissão.</p>
        `,
        ctaLabel: 'Entrar no webinário',
        ctaUrl: '{room_url}',
        footerNote: 'Link direto: {room_url}',
      });
    case 'replay':
      return layout({
        preheader: 'O replay do webinário já está disponível.',
        title: 'Replay liberado',
        bodyHtml: `
          <p style="margin:0 0 12px;">Olá <strong>{name}</strong>,</p>
          <p style="margin:0 0 12px;">O replay de <strong>{webinar_title}</strong> já está disponível.</p>
          <p style="margin:0 0 0;">Assista quando quiser e aproveite a oferta enquanto estiver ativa.</p>
        `,
        ctaLabel: 'Assistir replay',
        ctaUrl: '{replay_url}',
        footerNote: 'Link do replay: {replay_url}',
      });
    default:
      return '<p>Olá {name},</p><p>{webinar_title}</p>';
  }
}

/**
 * @param {string} template
 * @param {Record<string, string>} vars
 */
export function applyEmailPlaceholders(template, vars = {}) {
  if (!template) return '';
  let out = String(template);
  const map = {
    name: vars.name ?? '',
    webinar_title: vars.webinar_title ?? vars.webinarTitle ?? '',
    wait_url: vars.wait_url ?? vars.waitUrl ?? '',
    room_url: vars.room_url ?? vars.roomUrl ?? '',
    replay_url: vars.replay_url ?? vars.replayUrl ?? '',
    email: vars.email ?? '',
    link: vars.room_url ?? vars.roomUrl ?? vars.wait_url ?? '',
  };

  for (const [key, value] of Object.entries(map)) {
    const safe = String(value ?? '');
    out = out.split(`{${key}}`).join(safe);
    out = out.split(`{{${key}}}`).join(safe);
  }
  return out;
}

/**
 * Build subject + html ready to send via Resend.
 * If config body is empty, uses branded default for the type.
 */
export function buildResendEmailPayload({ type, subject, bodyHtml, vars }) {
  const fallbackSubject = DEFAULT_EMAIL_SUBJECTS[type] || 'Gablive';
  const rawSubject = subject && String(subject).trim() ? subject : fallbackSubject;
  const rawHtml =
    bodyHtml && String(bodyHtml).trim()
      ? bodyHtml
      : getDefaultEmailBodyHtml(type);

  return {
    subject: applyEmailPlaceholders(rawSubject, vars),
    html: applyEmailPlaceholders(rawHtml, vars),
  };
}

export function defaultEmailConfigsForWebinar(webinarId) {
  return [
    {
      webinar_id: webinarId,
      type: 'confirmation',
      subject: DEFAULT_EMAIL_SUBJECTS.confirmation,
      body_html: getDefaultEmailBodyHtml('confirmation'),
      send_before_minutes: null,
      enabled: true,
    },
    {
      webinar_id: webinarId,
      type: 'reminder',
      subject: DEFAULT_EMAIL_SUBJECTS.reminder,
      body_html: getDefaultEmailBodyHtml('reminder'),
      send_before_minutes: 60,
      enabled: true,
    },
    {
      webinar_id: webinarId,
      type: 'replay',
      subject: DEFAULT_EMAIL_SUBJECTS.replay,
      body_html: getDefaultEmailBodyHtml('replay'),
      send_before_minutes: -1440,
      enabled: true,
    },
  ];
}
