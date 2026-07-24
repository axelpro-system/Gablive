/** Max Resend attempts before terminal failure (includes the final try). */
export const MAX_EMAIL_ATTEMPTS = 3;

/** Backoff base: attempt N schedules N * this many minutes ahead. */
export const EMAIL_BACKOFF_MINUTES_PER_ATTEMPT = 5;

/**
 * Pure next-state for email_queue after a send attempt.
 *
 * @param {{ attempts?: number, success: boolean, now?: Date, errorMessage?: string|null }} input
 * @returns {{
 *   status: 'sent'|'pending'|'failed',
 *   attempts: number,
 *   sent_at: string|null,
 *   scheduled_at: string|null,
 *   error: string|null,
 * }}
 */
export function nextEmailQueueStateAfterAttempt({
  attempts = 0,
  success,
  now = new Date(),
  errorMessage = null,
}) {
  const currentAttempts = Number.isFinite(attempts) ? attempts : 0;
  const nextAttempts = currentAttempts + 1;
  const at = now instanceof Date ? now : new Date(now);

  if (success) {
    return {
      status: 'sent',
      attempts: nextAttempts,
      sent_at: at.toISOString(),
      scheduled_at: null,
      error: null,
    };
  }

  if (nextAttempts < MAX_EMAIL_ATTEMPTS) {
    const backoffMs =
      EMAIL_BACKOFF_MINUTES_PER_ATTEMPT * nextAttempts * 60 * 1000;
    return {
      status: 'pending',
      attempts: nextAttempts,
      sent_at: null,
      scheduled_at: new Date(at.getTime() + backoffMs).toISOString(),
      error: errorMessage != null ? String(errorMessage) : 'send failed',
    };
  }

  return {
    status: 'failed',
    attempts: nextAttempts,
    sent_at: null,
    scheduled_at: null,
    error: errorMessage != null ? String(errorMessage) : 'send failed',
  };
}
