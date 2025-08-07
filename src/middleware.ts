import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Define allowed origins
  const allowedOrigins = [
    'https://tibiavote.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001', // backup dev port
    'https://localhost:3000', // HTTPS dev
  ]
  
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // Check origin for API requests and cross-origin requests
  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      console.warn(`Blocked request from unauthorized origin: ${origin}`)
      return new Response('Forbidden: Unauthorized origin', { 
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
        }
      })
    }
  }
  
  // Additional check for referer on sensitive routes
  if (request.nextUrl.pathname.startsWith('/api') && referer) {
    const refererOrigin = new URL(referer).origin
    if (!allowedOrigins.includes(refererOrigin)) {
      console.warn(`Blocked API request from unauthorized referer: ${refererOrigin}`)
      return new Response('Forbidden: Unauthorized referer', { 
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
        }
      })
    }
  }
  
  const response = NextResponse.next()
  
  // Add CORS headers for allowed origins
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  }
  
  // Add basic security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers })
  }
  
  return response
}

export const config = {
  matcher: [
    // Match all requests including API routes, but exclude static files
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}