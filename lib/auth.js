/**
 * Auth library for Cloudflare Worker environment
 * Uses Web Crypto API (available in both Workers and Node 18+)
 */

// Protected folder configuration
export const PROTECTED_FOLDERS = ['我的日记']

// Check if a path belongs to a protected folder  
export function isProtectedPath(path) {
  if (!path) return false
  return PROTECTED_FOLDERS.some(folder => path.includes(folder))
}

// Mask content for unauthorized users
export function maskContent(content) {
  if (!content) return content
  return content.replace(/[^\s\n]/g, '*')
}

// Mask title for unauthorized users
export function maskTitle(title) {
  if (!title) return title
  if (title.length <= 3) return '*'.repeat(title.length)
  return title.substring(0, 3) + '*'.repeat(title.length - 3)
}

// Verify diary password
export function verifyDiaryPassword(password) {
  const correctPassword = process.env.DIARY_PASSWORD
  if (!correctPassword) {
    console.error('DIARY_PASSWORD not set')
    return false
  }
  return password === correctPassword
}

/**
 * Sign a token with HMAC-SHA256 using Web Crypto API
 */
export async function signToken(secret) {
  const payload = { exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }
  const data = JSON.stringify(payload)

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data)
  )

  // Base64 encode both parts
  const dataB64 = Buffer.from(data).toString('base64')
  const sigB64 = Buffer.from(new Uint8Array(sig)).toString('base64')

  return `${dataB64}.${sigB64}`
}

/**
 * Verify an HMAC-signed token
 */
export async function verifyToken(token, secret) {
  if (!token || !secret) return false

  try {
    const parts = token.split('.')
    if (parts.length !== 2) return false

    const [dataB64, sigB64] = parts
    const data = Buffer.from(dataB64, 'base64').toString()
    const sig = Buffer.from(sigB64, 'base64')

    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const valid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      sig,
      new TextEncoder().encode(data)
    )

    if (!valid) return false

    // Check expiration
    const payload = JSON.parse(data)
    if (Date.now() > payload.exp) return false

    return true
  } catch (e) {
    return false
  }
}

/**
 * Verify auth cookie — supports both legacy (unsigned) and new (HMAC-signed) tokens
 */
export async function verifyAuthCookieAsync(cookies) {
  if (!cookies || !cookies.diary_auth) return false

  const cookieValue = cookies.diary_auth
  const hmacSecret = process.env.HMAC_SECRET

  // Try HMAC-signed token first (new format: base64.base64)
  if (hmacSecret && cookieValue.includes('.')) {
    return await verifyToken(cookieValue, hmacSecret)
  }

  // Fallback: legacy JSON token format (for backward compatibility during migration)
  try {
    const parsed = JSON.parse(cookieValue)
    if (Date.now() > parsed.expires) return false
    if (!parsed.token || parsed.token.length !== 64) return false
    return true
  } catch {
    return false
  }
}

/**
 * Synchronous cookie verification (for contexts where async isn't possible)
 * Only checks legacy format
 */
export function verifyAuthCookie(cookies) {
  if (!cookies || !cookies.diary_auth) return false
  try {
    const parsed = JSON.parse(cookies.diary_auth)
    if (Date.now() > parsed.expires) return false
    if (!parsed.token || parsed.token.length !== 64) return false
    return true
  } catch { return false }
}

// Legacy: generate unsigned token (kept for backward compat)
export function generateAuthToken() {
  const array = new Uint8Array(32)
  globalThis.crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

// Legacy: create unsigned auth cookie
export function createAuthCookie() {
  const token = generateAuthToken()
  const expires = Date.now() + (7 * 24 * 60 * 60 * 1000)
  return JSON.stringify({ token, expires })
}
