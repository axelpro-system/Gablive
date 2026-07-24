/** Mirrors src/lib/emailQueueRetry.js — keep in sync (Edge deploy bundle). */

export const MAX_EMAIL_ATTEMPTS = 3
export const EMAIL_BACKOFF_MINUTES_PER_ATTEMPT = 5

export type EmailQueueNextState = {
  status: "sent" | "pending" | "failed"
  attempts: number
  sent_at: string | null
  scheduled_at: string | null
  error: string | null
}

export function nextEmailQueueStateAfterAttempt(input: {
  attempts?: number
  success: boolean
  now?: Date
  errorMessage?: string | null
}): EmailQueueNextState {
  const currentAttempts = Number.isFinite(input.attempts as number)
    ? (input.attempts as number)
    : 0
  const nextAttempts = currentAttempts + 1
  const at = input.now instanceof Date ? input.now : new Date()

  if (input.success) {
    return {
      status: "sent",
      attempts: nextAttempts,
      sent_at: at.toISOString(),
      scheduled_at: null,
      error: null,
    }
  }

  if (nextAttempts < MAX_EMAIL_ATTEMPTS) {
    const backoffMs =
      EMAIL_BACKOFF_MINUTES_PER_ATTEMPT * nextAttempts * 60 * 1000
    return {
      status: "pending",
      attempts: nextAttempts,
      sent_at: null,
      scheduled_at: new Date(at.getTime() + backoffMs).toISOString(),
      error:
        input.errorMessage != null ? String(input.errorMessage) : "send failed",
    }
  }

  return {
    status: "failed",
    attempts: nextAttempts,
    sent_at: null,
    scheduled_at: null,
    error:
      input.errorMessage != null ? String(input.errorMessage) : "send failed",
  }
}
