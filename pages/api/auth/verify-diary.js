import { verifyDiaryPassword, signToken, createAuthCookie } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body

  if (!password) {
    return res.status(400).json({ error: 'Password is required' })
  }

  const isValid = verifyDiaryPassword(password)

  if (!isValid) {
    return res.status(401).json({ error: 'Incorrect password' })
  }

  // Use HMAC-signed token if HMAC_SECRET is set, otherwise fall back to legacy
  const hmacSecret = process.env.HMAC_SECRET
  let cookieValue

  if (hmacSecret) {
    cookieValue = await signToken(hmacSecret)
  } else {
    cookieValue = createAuthCookie()
  }

  res.setHeader(
    'Set-Cookie',
    `diary_auth=${cookieValue}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
  )

  return res.status(200).json({ success: true })
}
