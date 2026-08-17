/**
 * Centralized logging utility for errors and observability.
 */

export const logger = {
  error: (message, err = null, context = {}) => {
    console.error(`[ERROR] ${message}`, err, context);
    // Future: send to Sentry, Datadog, or backend audit log
  },
  warn: (message, context = {}) => {
    console.warn(`[WARN] ${message}`, context);
  },
  info: (message, context = {}) => {
    console.info(`[INFO] ${message}`, context);
  },
};
