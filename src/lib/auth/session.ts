/**
 * Enterprise Cryptographic Session Management
 * Uses Universal Web Crypto API (HMAC-SHA256) compatible with both Edge Middleware & Node.js runtimes.
 */

export interface SessionPayload {
  userId?: string
  email: string
  role: 'admin' | 'viewer'
  name?: string
  iat: number
  exp: number
}

export const SESSION_COOKIE_NAME = 'mis_session_token'
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60 // 7 days

const SESSION_SECRET =
  process.env.AUTH_SECRET ||
  process.env.SESSION_SECRET ||
  'isquare-mis-enterprise-hmac-sha256-key-v1-2026'

const encoder = new TextEncoder()

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function getHmacKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token.
 */
export async function createSessionToken(data: {
  userId?: string
  email: string
  role: 'admin' | 'viewer'
  name?: string
}): Promise<string> {
  const iat = Date.now()
  const exp = iat + SESSION_MAX_AGE_SECONDS * 1000

  const payload: SessionPayload = {
    userId: data.userId,
    email: data.email.trim().toLowerCase(),
    role: data.role,
    name: data.name,
    iat,
    exp,
  }

  const payloadJson = JSON.stringify(payload)
  const encodedPayload = uint8ArrayToBase64Url(encoder.encode(payloadJson))

  const key = await getHmacKey()
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload))
  const signature = uint8ArrayToBase64Url(new Uint8Array(signatureBuffer))

  return `${encodedPayload}.${signature}`
}

/**
 * Verifies and decodes an HMAC-SHA256 session token.
 * Returns null if token is missing, invalid, tampered, or expired.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [encodedPayload, signature] = parts
  if (!encodedPayload || !signature) return null

  try {
    const key = await getHmacKey()
    const signatureBytes = base64UrlToUint8Array(signature)
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as BufferSource,
      encoder.encode(encodedPayload)
    )

    if (!isValid) return null

    const payloadBytes = base64UrlToUint8Array(encodedPayload)
    const decoder = new TextDecoder()
    const payloadJson = decoder.decode(payloadBytes)
    const payload = JSON.parse(payloadJson) as SessionPayload

    // Check expiration
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null
    }

    if (!payload.email || (payload.role !== 'admin' && payload.role !== 'viewer')) {
      return null
    }

    return payload
  } catch (err) {
    return null
  }
}

/**
 * Cookie options for setting the session cookie securely.
 */
export function getSessionCookieOptions(): {
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax'
  path: string
  maxAge: number
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}
