/**
 * Lê o corpo JSON de um erro de `supabase.functions.invoke`.
 * Em respostas não-2xx o SDK devolve um FunctionsHttpError cuja `context` é a Response;
 * a mensagem padrão ("Edge Function returned a non-2xx status code") não diz o motivo.
 *
 * @param {unknown} error
 * @returns {Promise<object|null>} corpo parseado, ou null se não houver corpo JSON legível
 */
export async function readFunctionErrorBody(error) {
  const response = error?.context;
  if (!response || typeof response.json !== 'function') return null;
  try {
    const body = await (typeof response.clone === 'function' ? response.clone() : response).json();
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}
