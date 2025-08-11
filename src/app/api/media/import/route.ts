import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { buildStoragePath, getPublicUrl, type MediaKind } from '@/lib/images'

export const runtime = 'nodejs'

type Body = {
  url: string
  kind: MediaKind
  slugOrId?: string
  attribution?: string | null
}

const PUBLIC_BUCKET = 'images-public'
const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const FETCH_TIMEOUT_MS = 15000

function getExtFromContentType(contentType: string | null): string {
  if (!contentType) return 'png'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('svg')) return 'svg'
  return 'png'
}

export async function POST(req: NextRequest) {
  const json = (await req.json()) as Body
  const { url, kind, slugOrId, attribution } = json || {}

  if (!url || !kind) {
    return new Response('Missing url or kind', { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return new Response('Server misconfigured', { status: 500 })
  }

  // Admin client (service role) to allow storage upload and DB insert
  const admin = createClient(supabaseUrl, serviceKey)

  // 1) Fetch with timeout and validation
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        // Prefer original formats; avoid negotiating webp/avif
        Accept: 'image/png,image/jpeg,image/gif,image/svg+xml,image/*;q=0.8,*/*;q=0.5',
        Referer: 'https://tibia.fandom.com/',
        Origin: 'https://tibia.fandom.com',
        'User-Agent': 'Mozilla/5.0 (compatible; ProficiencyBot/1.0; +https://proficiency.app)'
      },
      signal: controller.signal,
      cache: 'no-store',
    })
  } catch (e) {
    clearTimeout(timer)
    return new Response('Upstream fetch failed', { status: 502 })
  }
  clearTimeout(timer)

  if (!res.ok) {
    return new Response(`Upstream error: ${res.status}`, { status: 502 })
  }

  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  const contentLength = Number(res.headers.get('content-length') || '0')
  if (!contentType.startsWith('image/')) {
    return new Response('Not an image', { status: 415 })
  }
  if (contentLength && contentLength > MAX_BYTES) {
    return new Response('Image too large', { status: 413 })
  }

  // 2) Read body and compute sha256
  const arrayBuf = await res.arrayBuffer()
  if (arrayBuf.byteLength > MAX_BYTES) {
    return new Response('Image too large', { status: 413 })
  }
  const buffer = Buffer.from(arrayBuf)
  const hash = crypto.createHash('sha256').update(buffer).digest()
  const shaHex = hash.toString('hex')

  // 3) If already exists by sha, return existing
  const { data: existing, error: existingErr } = await admin
    .from('media')
    .select('*')
    .eq('sha256', `\\x${shaHex}`)
    .maybeSingle()
  if (existingErr) {
    return new Response('DB error', { status: 500 })
  }
  if (existing) {
    const publicUrl = getPublicUrl(existing.storage_path)
    return Response.json({ id: existing.id, storage_path: existing.storage_path, publicUrl, reused: true })
  }

  // 4) Upload
  const ext = getExtFromContentType(contentType)
  const storagePath = buildStoragePath(kind, shaHex, ext, slugOrId)
  const upload = await admin.storage.from(PUBLIC_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: false,
    cacheControl: 'public, max-age=31536000, immutable',
  })
  if (upload.error) {
    // If conflict, assume already uploaded concurrently; continue to insert/select
    if (upload.error.message && !upload.error.message.includes('already exists')) {
      return new Response(`Upload failed: ${upload.error.message}`, { status: 500 })
    }
  }

  // 5) Insert media row (idempotent by sha/source_url)
  const { data: media, error: insertErr } = await admin
    .from('media')
    .insert({
      source_url: url,
      storage_path: storagePath,
      format: ext,
      bytes: buffer.byteLength,
      sha256: `\\x${shaHex}`,
      attribution: attribution || null,
    })
    .select('*')
    .single()

  if (insertErr) {
    // Possible unique violation race; try select by sha
    const { data: again } = await admin
      .from('media')
      .select('*')
      .eq('sha256', `\\x${shaHex}`)
      .single()
    if (again) {
      const publicUrl = getPublicUrl(again.storage_path)
      return Response.json({ id: again.id, storage_path: again.storage_path, publicUrl, reused: true })
    }
    return new Response('Insert failed', { status: 500 })
  }

  const publicUrl = getPublicUrl(media.storage_path)
  return Response.json({ id: media.id, storage_path: media.storage_path, publicUrl, reused: false })
}


