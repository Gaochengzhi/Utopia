import { verifyAuthCookie } from '../../../lib/auth';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if user has valid auth cookie
  const isAuthenticated = verifyAuthCookie(req.cookies);

  return res.status(200).json({ authenticated: isAuthenticated });
}
