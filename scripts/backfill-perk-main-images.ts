/*
  Backfill missing perks.main_media_id from perks.main_icon_url.

  Key behaviors:
  - Select perks where main_media_id IS NULL and main_icon_url IS NOT NULL (or by --perkId)
  - Try to link by exact source_url first
  - Otherwise fetch, validate, hash, dedupe by media.sha256, upload to perks/main/, insert media, then link
  - Resumable via checkpoint file; supports concurrency and retries

  Usage examples:
    tsx scripts/backfill-perk-main-images.ts --concurrency 8 --limit 2000 --resume
    tsx scripts/backfill-perk-main-images.ts --perkId <uuid> --dry-run
*/

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Database } from '@/lib/database.types'

type PerkRow = {
  id: string
  name: string
  main_icon_url: string | null
  main_media_id: string | null
}

const PUBLIC_BUCKET = 'images-public'
const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const DEFAULT_CONCURRENCY = 8
const DEFAULT_LIMIT = 100000
const DEFAULT_DELAY_MS = 0
const CHECKPOINT = resolve('.perk-main-progress.json')

// Minimal .env loader (same approach as existing backfill script)
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

function parseArgs(): { concurrency: number; limit: number; resume: boolean; delayMs: number; dryRun: boolean; perkId?: string } {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const idx = args.indexOf(flag)
    return idx >= 0 ? args[idx + 1] : undefined
  }
  const has = (flag: string) => args.includes(flag)
  const concurrency = Number(get('--concurrency') || DEFAULT_CONCURRENCY)
  const limit = Number(get('--limit') || DEFAULT_LIMIT)
  const resume = has('--resume')
  const delayMs = Number(get('--delayMs') || DEFAULT_DELAY_MS)
  const dryRun = has('--dry-run') || has('--dryRun')
  const perkId = get('--perkId')
  return { concurrency, limit, resume, delayMs, dryRun, perkId }
}

async function ensureBucket(admin: SupabaseClient<Database>) {
  const { data: list } = await admin.storage.listBuckets()
  const exists = (list || []).some((b) => b.name === PUBLIC_BUCKET)
  if (!exists) {
    await admin.storage.createBucket(PUBLIC_BUCKET, { public: true })
  }
}

type CheckpointState = { processedIds: Record<string, true> }

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

async function fetchAsBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, {
    headers: {
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

function buildPerkMainPath(shaHex: string, ext: string): string {
  const clean = ext.replace(/^\./, '')
  return `perks/main/${shaHex}.${clean}`
}

async function processPerkMain(
  admin: SupabaseClient<Database>,
  row: PerkRow,
  dryRun: boolean
): Promise<void> {
  if (row.main_media_id || !row.main_icon_url) return

  // 1) Try exact source_url link first
  const { data: existingByUrl } = await admin
    .from('media')
    .select('id, storage_path')
    .eq('source_url', row.main_icon_url)
    .maybeSingle()

  if (existingByUrl?.id) {
    if (!dryRun) {
      await admin.from('perks').update({ main_media_id: existingByUrl.id }).eq('id', row.id)
    }
    console.log(`Linked by source_url for perk ${row.id} (${row.name}) -> media ${existingByUrl.id}`)
    return
  }

  if (dryRun) {
    console.log(`Would fetch+dedupe+upload for perk ${row.id} (${row.name}) from ${row.main_icon_url}`)
    return
  }

  // 2) Fetch, validate, hash
  const { buffer, contentType } = await runWithRetry(() => fetchAsBuffer(row.main_icon_url!))
  const hash = crypto.createHash('sha256').update(buffer).digest()
  const shaHex = hash.toString('hex')

  // 3) Dedupe by sha256
  const { data: existingBySha } = await admin
    .from('media')
    .select('id, storage_path')
    .eq('sha256', `\\x${shaHex}`)
    .maybeSingle()

  if (existingBySha?.id) {
    await admin.from('perks').update({ main_media_id: existingBySha.id }).eq('id', row.id)
    console.log(`Reused existing media by sha for perk ${row.id} (${row.name}) -> media ${existingBySha.id}`)
    return
  }

  // 4) Upload and insert media
  const ext = getExtFromContentType(contentType)
  const storagePath = buildPerkMainPath(shaHex, ext)

  const up = await admin.storage.from(PUBLIC_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: false,
    cacheControl: 'public, max-age=31536000, immutable',
  })
  if (up.error && !up.error.message.includes('already exists')) {
    throw up.error
  }

  const { data: inserted, error: insErr } = await admin
    .from('media')
    .insert({
      source_url: row.main_icon_url!,
      storage_path: storagePath,
      format: ext,
      bytes: buffer.byteLength,
      sha256: `\\x${shaHex}`,
      attribution: 'Tibia Wiki (Fandom)'
    })
    .select('id')
    .single()

  if (insErr) {
    // Race-safe: fallback select by sha
    const { data: again, error: againErr } = await admin
      .from('media')
      .select('id')
      .eq('sha256', `\\x${shaHex}`)
      .single()
    if (againErr) throw insErr
    await admin.from('perks').update({ main_media_id: (again as { id: string }).id }).eq('id', row.id)
    console.log(`Linked after insert-select by sha for perk ${row.id} (${row.name}) -> media ${(again as { id: string }).id}`)
    return
  }

  await admin.from('perks').update({ main_media_id: (inserted as { id: string }).id }).eq('id', row.id)
  console.log(`Uploaded and linked for perk ${row.id} (${row.name}) -> media ${(inserted as { id: string }).id}`)
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

async function main() {
  const { concurrency, limit, resume, delayMs, dryRun, perkId } = parseArgs()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env')
  const admin = createClient<Database>(supabaseUrl, serviceKey)

  await ensureBucket(admin)

  const checkpoint = resume && !dryRun ? loadCheckpoint() : { processedIds: {} }

  let perksQuery = admin
    .from('perks')
    .select('id,name,main_icon_url,main_media_id')
  if (perkId) {
    perksQuery = perksQuery.eq('id', perkId)
  } else {
    perksQuery = perksQuery.is('main_media_id', null).not('main_icon_url', 'is', null).limit(limit)
  }

  const { data, error } = await perksQuery
  if (error) throw error
  const items = (data || []) as PerkRow[]

  console.log(`Processing ${items.length} perk(s) | concurrency=${concurrency} | dryRun=${dryRun}`)

  await runQueue(items, concurrency, delayMs, async (row) => {
    if (!dryRun && (checkpoint as CheckpointState).processedIds[row.id]) return
    try {
      await processPerkMain(admin, row, dryRun)
      if (!dryRun) {
        ;(checkpoint as CheckpointState).processedIds[row.id] = true
        saveCheckpoint(checkpoint as CheckpointState)
      }
    } catch (e) {
      console.error('Perk failed:', row.id, row.name, e)
    }
  })

  console.log('Perk main images backfill completed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

 