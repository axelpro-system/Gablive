/**
 * Sanitizes input string to prevent XSS attacks.
 * @param {string} str - Raw user input
 * @returns {string} Safe HTML-escaped string
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates basic email structure
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Validates that a phone number contains only digits/formatting characters
 * and has a plausible number of digits (8-15, covers local and
 * international formats with country code).
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  const value = String(phone || '').trim();
  if (!value) return false;
  if (!/^[\d\s()+-]+$/.test(value)) return false;
  const digitCount = (value.match(/\d/g) || []).length;
  return digitCount >= 8 && digitCount <= 15;
}
