export const CHAT_MESSAGE_CAP = 200;
export const CHAT_SEND_MIN_INTERVAL_MS = 2000;

/**
 * Keep only the last `cap` messages for the live chat window.
 *
 * @param {unknown[]} messages
 * @param {number} [cap]
 * @returns {unknown[]}
 */
export function capChatMessages(messages, cap = CHAT_MESSAGE_CAP) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  if (messages.length <= cap) return messages;
  return messages.slice(messages.length - cap);
}

/**
 * Throttle chat sends for a single client session.
 *
 * @param {number|null|undefined} lastSendAtMs
 * @param {number} nowMs
 * @param {number} [minIntervalMs]
 * @returns {boolean}
 */
export function canSendChatMessage(
  lastSendAtMs,
  nowMs,
  minIntervalMs = CHAT_SEND_MIN_INTERVAL_MS
) {
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) return false;
  if (lastSendAtMs == null) return true;
  if (typeof lastSendAtMs !== 'number' || !Number.isFinite(lastSendAtMs)) return true;
  return nowMs - lastSendAtMs >= minIntervalMs;
}
