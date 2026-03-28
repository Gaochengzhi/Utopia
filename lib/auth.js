const crypto = require('crypto');

// Protected folder configuration
export const PROTECTED_FOLDERS = ['我的日记'];

// Check if a path belongs to a protected folder
export function isProtectedPath(path) {
  if (!path) return false;
  return PROTECTED_FOLDERS.some(folder => path.includes(folder));
}

// Verify diary password
export function verifyDiaryPassword(password) {
  const correctPassword = process.env.DIARY_PASSWORD;
  if (!correctPassword) {
    console.error('DIARY_PASSWORD not set in environment variables');
    return false;
  }
  return password === correctPassword;
}

// Generate auth token
export function generateAuthToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Verify auth token from cookies
export function verifyAuthCookie(cookies) {
  if (!cookies || !cookies.diary_auth) {
    return false;
  }

  try {
    const { token, expires } = JSON.parse(cookies.diary_auth);

    // Check if token expired
    if (Date.now() > expires) {
      return false;
    }

    // Verify token format (basic validation)
    if (!token || token.length !== 64) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

// Mask content for unauthorized users
export function maskContent(content) {
  if (!content) return content;

  // Replace all characters except newlines and spaces with asterisks
  return content.replace(/[^\s\n]/g, '*');
}

// Mask title for unauthorized users (show first few characters)
export function maskTitle(title) {
  if (!title) return title;

  // Show first 3 characters and replace rest with asterisks
  if (title.length <= 3) {
    return '*'.repeat(title.length);
  }

  return title.substring(0, 3) + '*'.repeat(title.length - 3);
}

// Create auth cookie value
export function createAuthCookie() {
  const token = generateAuthToken();
  const expires = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

  return JSON.stringify({ token, expires });
}
