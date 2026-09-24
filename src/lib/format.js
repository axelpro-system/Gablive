/**
 * Formatação de moeda e de datas para campos `datetime-local`.
 * Funções puras — sem dependência de React ou Supabase.
 */

const pad = (n) => String(n).padStart(2, '0');

/**
 * Formata um valor monetário no padrão brasileiro (ex.: "R$ 1.497,00").
 * @param {number|string|null|undefined} value
 * @param {string} [currency='BRL']
 * @returns {string} '' quando o valor não é numérico — nunca "R$ NaN".
 */
export function formatCurrency(value, currency = 'BRL') {
  if (value === null || value === undefined || value === '') return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
}

/**
 * Converte um instante (ISO) no valor de um `<input type="datetime-local">`,
 * no fuso local do navegador ("yyyy-MM-ddTHH:mm").
 * @param {string|null|undefined} iso
 * @returns {string} '' quando vazio ou inválido.
 */
export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Converte o valor de um `<input type="datetime-local">` (hora local) em ISO UTC.
 * @param {string|null|undefined} value
 * @returns {string|null} null quando vazio ou inválido.
 */
export function fromDatetimeLocalValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
