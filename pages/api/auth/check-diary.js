import { verifyAuthCookieAsync } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const isAuthenticated = await verifyAuthCookieAsync(req.cookies)

  return res.status(200).json({ authenticated: isAuthenticated })
}
