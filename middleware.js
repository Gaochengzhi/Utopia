import { NextResponse } from 'next/server'

// Blocked paths - common scanner targets
const blockedPatterns = [
  /\.php$/i,
  /\.asp$/i,
  /\.aspx$/i,
  /\.jsp$/i,
  /\.cgi$/i,
  /wp-admin/i,
  /wp-content/i,
  /wp-includes/i,
  /wordpress/i,
  /xmlrpc/i,
  /phpmyadmin/i,
  /admin\.php/i,
  /config\.php/i,
  /setup\.php/i,
  /install\.php/i,
  /\.env$/i,
  /\.git\//i,
  /\.svn\//i,
  /\.htaccess/i,
  /\.htpasswd/i,
  /web\.config/i,
  /\.sql$/i,
  /\.bak$/i,
  /\.backup$/i,
  /\.old$/i,
  /\.orig$/i,
  /\.swp$/i,
  /\.DS_Store/i,
  /Thumbs\.db/i,
  /shell/i,
  /eval-stdin/i,
  /think(php)?/i,
  /vendor\//i,
  /ckeditor/i,
  /fckeditor/i,
  /ckfinder/i,
  /elfinder/i,
  /filemanager/i,
  /uploads?\//i,
  /temp\//i,
  /tmp\//i,
  /backup\//i,
  /debug/i,
  /console/i,
  /manager/i,
  /administrator/i,
  /login\.php/i,
]

// Blocked user agents (common scanners)
const blockedUserAgents = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /python-requests/i,
  /curl\/\d/i,
  /wget/i,
  /libwww/i,
  /lwp-/i,
  /scanner/i,
  /attack/i,
  /exploit/i,
  /injection/i,
]

export function middleware(request) {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''

  // Skip middleware for image API routes
  if (pathname.startsWith('/.pic/')) {
    return NextResponse.next()
  }

  // Check for blocked paths
  if (blockedPatterns.some(pattern => pattern.test(pathname))) {
    // Return 404 without logging - silent drop
    return new NextResponse(null, { status: 404 })
  }

  // Check for suspicious user agents
  if (blockedUserAgents.some(pattern => pattern.test(userAgent))) {
    return new NextResponse(null, { status: 403 })
  }

  // Add security headers
  const response = NextResponse.next()

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

// Only run middleware on specific paths (exclude static assets)
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
