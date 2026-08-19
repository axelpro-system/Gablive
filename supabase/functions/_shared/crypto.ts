// ============================================
// Crypto utilities — AES-GCM encrypt/decrypt
// ============================================
// Uses INTEGRATION_ENCRYPTION_KEY (fallback: SUPABASE_JWT_SECRET).
// Packed format: base64(iv) + ":" + base64(ciphertext)

const IV_LENGTH = 12

function getEncryptionKeyMaterial(): string {
  const key = Deno.env.get("INTEGRATION_ENCRYPTION_KEY") ??
    Deno.env.get("SUPABASE_JWT_SECRET")

  if (!key) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY (or SUPABASE_JWT_SECRET) must be set to encrypt/decrypt integration secrets",
    )
  }

  return key
}

function deriveKey(
  keyMaterial: string,
  usage: "encrypt" | "decrypt",
): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    "raw",
    enc.encode(keyMaterial.slice(0, 32).padEnd(32, "\0")),
    { name: "AES-GCM" },
    false,
    [usage],
  )
}

/**
 * Encrypt a string using AES-GCM.
 * Returns "base64(iv):base64(ciphertext)".
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await deriveKey(getEncryptionKeyMaterial(), "encrypt")

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  )

  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return `${ivB64}:${ctB64}`
}

/**
 * Decrypt a string encrypted with encryptSecret.
 */
export async function decryptSecret(encrypted: string): Promise<string> {
  const dec = new TextDecoder()
  const key = await deriveKey(getEncryptionKeyMaterial(), "decrypt")

  const [ivB64, ctB64] = encrypted.split(":")
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0))

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct,
  )

  return dec.decode(plainBuffer)
}

/**
 * Encrypt a credentials object for storage in a JSONB column.
 * Returns { enc: "base64(iv):base64(ciphertext)" }.
 */
export async function encryptSecretsObject(
  secrets: Record<string, string>,
): Promise<{ enc: string }> {
  return { enc: await encryptSecret(JSON.stringify(secrets)) }
}

/**
 * Decrypt a credentials object stored by encryptSecretsObject.
 * Backward-compatible: if the stored JSONB is not in { enc } format
 * (legacy plaintext row written before encryption was introduced),
 * it is returned as-is — callers should re-save to upgrade it.
 */
export async function decryptSecretsObject(
  stored: Record<string, unknown> | null | undefined,
): Promise<Record<string, string>> {
  if (!stored) return {}
  if (typeof stored.enc === "string") {
    return JSON.parse(await decryptSecret(stored.enc))
  }
  return stored as Record<string, string>
}
