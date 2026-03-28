import { verifyDiaryPassword, createAuthCookie } from '../../../lib/auth';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Verify password
  const isValid = verifyDiaryPassword(password);

  if (!isValid) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // Create auth cookie
  const cookieValue = createAuthCookie();

  // Set cookie (7 days expiry)
  res.setHeader('Set-Cookie', `diary_auth=${cookieValue}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`);

  return res.status(200).json({ success: true });
}
