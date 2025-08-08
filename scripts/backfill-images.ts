/*
  Backfill images from external URLs into Supabase Storage and media table.

  Usage:
    tsx scripts/backfill-images.ts --table weapons --concurrency 6 --limit 1000 --resume
    tsx scripts/backfill-images.ts --table perks --concurrency 6 --limit 1000 --resume
*/

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Database } from '@/lib/database.types'

type TableKind = 'weapons' | 'perks'
type MediaKind = 'weapon' | 'perk-main' | 'perk-type'

const PUBLIC_BUCKET = 'images-public'
const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const DEFAULT_CONCURRENCY = 6
const DEFAULT_LIMIT = 100000
const DEFAULT_DELAY_MS = 0
const CHECKPOINT = resolve('.backfill-progress.json')

// Minimal .env loader to avoid external deps in scripts
function loadEnvFile(path: string) {
  try {
    if (!existsSync(path)) return
    const raw = readFileSync(path, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!match) continue
      const key = match[1]
      let value = match[2]
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {
    // ignore
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'))
loadEnvFile(resolve(process.cwd(), '.env'))

function parseArgs(): { table: TableKind; concurrency: number; limit: number; resume: boolean; delayMs: number } {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const idx = args.indexOf(flag)
    return idx >= 0 ? args[idx + 1] : undefined
  }
  const has = (flag: string) => args.includes(flag)
  const table = (get('--table') as TableKind) || 'weapons'
  const concurrency = Number(get('--concurrency') || DEFAULT_CONCURRENCY)
  const limit = Number(get('--limit') || DEFAULT_LIMIT)
  const resume = has('--resume')
  const delayMs = Number(get('--delayMs') || DEFAULT_DELAY_MS)
  if (!['weapons', 'perks'].includes(table)) {
    throw new Error('--table must be weapons or perks')
  }
  return { table: table as TableKind, concurrency, limit, resume, delayMs }
}

function getPublicUrlFromPath(storagePath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${baseUrl}/storage/v1/object/public/${PUBLIC_BUCKET}/${storagePath}`
}

async function ensureBucket(admin: SupabaseClient<Database>) {
  const { data: list } = await admin.storage.listBuckets()
  const exists = (list || []).some((b) => b.name === PUBLIC_BUCKET)
  if (!exists) {
    await admin.storage.createBucket(PUBLIC_BUCKET, { public: true })
    // Also set public policy via dashboard if needed
  }
}

type WeaponRow = {
  id: string
  name: string
  image_url: string | null
  image_media_id: string | null
}

type PerkRow = {
  id: string
  name: string
  main_icon_url: string | null
  type_icon_url: string | null
  main_media_id: string | null
  type_media_id: string | null
  weapon_id: string
}

type CheckpointState = {
  processedIds: Record<string, true>
}

function loadCheckpoint(): CheckpointState {
  if (existsSync(CHECKPOINT)) {
    try {
      return JSON.parse(readFileSync(CHECKPOINT, 'utf-8')) as CheckpointState
    } catch {
      return { processedIds: {} }
    }
  }
  return { processedIds: {} }
}

function saveCheckpoint(state: CheckpointState) {
  writeFileSync(CHECKPOINT, JSON.stringify(state, null, 2))
}

async function fetchAsBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }>
{
  const res = await fetch(url, {
    headers: {
      // Prefer original formats; avoid negotiating webp/avif
      Accept: 'image/png,image/jpeg,image/gif,image/svg+xml,image/*;q=0.8,*/*;q=0.5',
      Referer: 'https://tibia.fandom.com/',
      Origin: 'https://tibia.fandom.com',
      'User-Agent': 'Mozilla/5.0 (compatible; ProficiencyBot/1.0; +https://proficiency.app)'
    }
  })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const ct = res.headers.get('content-type') || 'application/octet-stream'
  if (!ct.startsWith('image/')) throw new Error('Not an image')
  const arr = await res.arrayBuffer()
  if (arr.byteLength > MAX_BYTES) throw new Error('Image too large')
  return { buffer: Buffer.from(arr), contentType: ct }
}

function getExtFromContentType(contentType: string | null): string {
  if (!contentType) return 'png'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('svg')) return 'svg'
  return 'png'
}

function buildPath(kind: MediaKind, shaHex: string, ext: string, slugOrId?: string): string {
  const clean = ext.replace(/^\./, '')
  if (kind === 'weapon') return `weapons/${slugOrId || 'unknown'}/${shaHex}.${clean}`
  if (kind === 'perk-main') return `perks/main/${shaHex}.${clean}`
  return `perks/type/${shaHex}.${clean}`
}

async function main() {
  const { table, concurrency, limit, resume, delayMs } = parseArgs()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env')
  const admin = createClient<Database>(supabaseUrl, serviceKey)

  await ensureBucket(admin)

  const checkpoint = resume ? loadCheckpoint() : { processedIds: {} }

  // Fetch candidates
  if (table === 'weapons') {
    const { data, error } = await admin
      .from('weapons')
      .select('id,name,image_url,image_media_id')
      .is('image_media_id', null)
      .not('image_url', 'is', null)
      .limit(limit)
    if (error) throw error
    const items = (data || []) as WeaponRow[]
    await runQueue(items, concurrency, delayMs, async (row) => {
      if (checkpoint.processedIds[row.id]) return
      if (!row.image_url) return
      await runWithRetry(async () => {
        await processOne(admin, row.image_url!, 'weapon', row.id, 'Tibia Wiki (Fandom)', async (mediaId) => {
          await admin.from('weapons').update({ image_media_id: mediaId }).eq('id', row.id)
        })
      })
      checkpoint.processedIds[row.id] = true
      saveCheckpoint(checkpoint)
    })
  } else {
    // perks
    const { data, error } = await admin
      .from('perks')
      .select('id,name,main_icon_url,type_icon_url,main_media_id,type_media_id,weapon_id')
      .limit(limit)
    if (error) throw error
    const items = (data || []) as PerkRow[]
    await runQueue(items, concurrency, delayMs, async (row) => {
      if (checkpoint.processedIds[row.id]) return
      // main
      if (!row.main_media_id && row.main_icon_url) {
        await runWithRetry(async () => {
          await processOne(admin, row.main_icon_url!, 'perk-main', undefined, 'Tibia Wiki (Fandom)', async (mediaId) => {
            await admin.from('perks').update({ main_media_id: mediaId }).eq('id', row.id)
          })
        })
      }
      // type
      if (!row.type_media_id && row.type_icon_url) {
        await runWithRetry(async () => {
          await processOne(admin, row.type_icon_url!, 'perk-type', undefined, 'Tibia Wiki (Fandom)', async (mediaId) => {
            await admin.from('perks').update({ type_media_id: mediaId }).eq('id', row.id)
          })
        })
      }
      checkpoint.processedIds[row.id] = true
      saveCheckpoint(checkpoint)
    })
  }

  console.log('Backfill completed')
}

async function processOne(
  admin: SupabaseClient<Database>,
  url: string,
  kind: MediaKind,
  slugOrId: string | undefined,
  attribution: string | null,
  onLinked: (mediaId: string) => Promise<void>
) {
  // Fetch image
  const { buffer, contentType } = await fetchAsBuffer(url)
  const hash = crypto.createHash('sha256').update(buffer).digest()
  const shaHex = hash.toString('hex')

  // Dedupe by sha
  const { data: existing } = await admin.from('media').select('id,storage_path').eq('sha256', `\\x${shaHex}`).maybeSingle()
  if (existing) {
    await onLinked(existing.id)
    return
  }

  const ext = getExtFromContentType(contentType)
  const path = buildPath(kind, shaHex, ext, slugOrId)

  // Upload
  const up = await admin.storage.from(PUBLIC_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
    cacheControl: 'public, max-age=31536000, immutable',
  })
  if (up.error && !up.error.message.includes('already exists')) {
    throw up.error
  }

  // Insert media row (idempotent)
  const { data: inserted, error: insErr } = await admin
    .from('media')
    .insert({ source_url: url, storage_path: path, format: ext, bytes: buffer.byteLength, sha256: `\\x${shaHex}`, attribution })
    .select('id')
    .single()
  if (insErr) {
    // Try select
    const { data: again, error: againErr } = await admin.from('media').select('id').eq('sha256', `\\x${shaHex}`).single()
    if (againErr) throw insErr
    await onLinked((again as { id: string }).id)
    return
  }

  await onLinked((inserted as { id: string }).id)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runQueue<T>(items: T[], concurrency: number, delayMs: number, task: (item: T) => Promise<void>) {
  let index = 0
  const workers: Promise<void>[] = []
  async function worker() {
    while (true) {
      const i = index++
      if (i >= items.length) break
      try {
        if (delayMs > 0) await sleep(delayMs)
        await task(items[i])
      } catch (e) {
        console.error('Task failed:', e)
      }
    }
  }
  for (let i = 0; i < Math.max(1, concurrency); i++) {
    workers.push(worker())
  }
  await Promise.all(workers)
}

async function runWithRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e: any) {
      lastErr = e
      const status = typeof e?.status === 'number' ? e.status : undefined
      const isRetriable = !status || status >= 500 || status === 429
      if (!isRetriable || i === attempts - 1) break
      const backoff = 500 * Math.pow(2, i)
      await sleep(backoff)
    }
  }
  throw lastErr
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


