import { NextRequest } from 'next/server'

const ALLOWED_HOSTS = new Set<string>([
  'static.wikia.nocookie.net',
])

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url')
  if (!urlParam) {
    return new Response('Missing url', { status: 400 })
  }

  let target: URL
  try {
    target = new URL(urlParam)
  } catch {
    return new Response('Invalid url', { status: 400 })
  }

  if (target.protocol !== 'https:') {
    return new Response('Only https is allowed', { status: 400 })
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return new Response('Host not allowed', { status: 403 })
  }

  try {
    const upstream = await fetch(target.toString(), {
      // Important: avoid sending cookies, and add a permissive referer like the host root
      headers: {
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': `https://${target.hostname}/`,
        'User-Agent': 'Mozilla/5.0 (compatible; TibiaVoteBot/1.0; +https://tibiavote.vercel.app)'
      },
      cache: 'force-cache',
      // Next.js runtime can stream the body directly
      // @ts-expect-error: duplex is not typed in lib.dom for fetch yet
      duplex: 'half',
    })

    if (!upstream.ok || !upstream.body) {
      return new Response('Upstream error', { status: upstream.status || 502 })
    }

    const contentType = upstream.headers.get('content-type') || 'image/png'
    const res = new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    })

    return res
  } catch (e) {
    return new Response('Proxy fetch failed', { status: 500 })
  }
}


