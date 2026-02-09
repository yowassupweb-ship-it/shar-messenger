import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Простая base64 кодировка для проверки basic auth
function verifyAuth(request: NextRequest): boolean {
  const basicAuth = request.headers.get('authorization')
  
  if (!basicAuth) {
    return false
  }

  const auth = basicAuth.split(' ')[1]
  const [username, password] = Buffer.from(auth, 'base64').toString().split(':')

  const validUsername = process.env.ADMIN_USERNAME || 'admin'
  const validPassword = process.env.ADMIN_PASSWORD || 'vstravel995'

  return username === validUsername && password === validPassword
}

export function middleware(request: NextRequest) {
  // Проверяем авторизацию для всех страниц кроме API проверки статуса
  if (request.nextUrl.pathname === '/api/health' || request.nextUrl.pathname === '/api/ai-availability') {
    return NextResponse.next()
  }

  const isAuthenticated = verifyAuth(request)

  if (!isAuthenticated) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}