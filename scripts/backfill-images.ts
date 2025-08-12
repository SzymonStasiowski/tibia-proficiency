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
import { imageSize } from 'image-size'

type TableKind = 'weapons' | 'perks' | 'items' | 'charms' | 'imbuements'
type MediaKind = 'weapon' | 'perk-main' | 'perk-type' | 'item' | 'charm' | 'imbuement'

const PUBLIC_BUCKET = 'images-public'
const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const DEFAULT_CONCURRENCY = 6
const DEFAULT_LIMIT = 100000
const DEFAULT_DELAY_MS = 150
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

function parseArgs(): { table: TableKind; concurrency: number; limit: number; resume: boolean; delayMs: number; perkId?: string; fixPlaceholders?: boolean; force?: boolean } {
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
  const perkId = get('--perkId')
  const fixPlaceholders = has('--fix-placeholders') || has('--fixPlaceholders')
  const force = has('--force')
  if (!['weapons', 'perks', 'items', 'charms', 'imbuements'].includes(table)) {
    throw new Error('--table must be weapons, perks, items, charms, or imbuements')
  }
  return { table: table as TableKind, concurrency, limit, resume, delayMs, perkId, fixPlaceholders, force }
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

type ItemRow = {
  id: string
  name: string
  icon_url: string | null
  icon_media_id: string | null
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
  if (!res.ok) throw Object.assign(new Error(`Fetch failed: ${res.status}`), { status: res.status })
  const ct = res.headers.get('content-type') || 'application/octet-stream'
  if (!ct.startsWith('image/')) throw new Error('Not an image')
  const arr = await res.arrayBuffer()
  if (arr.byteLength > MAX_BYTES) throw new Error('Image too large')
  let buffer = Buffer.from(arr)
  // Reject 1x1 placeholders
  try {
    const dim = imageSize(buffer)
    if ((dim.width === 1 && dim.height === 1) || (dim.width === 0 && dim.height === 0)) {
      throw new Error('Placeholder 1x1 image')
    }
  } catch (e) {
    // If dimensions fail to parse but content-type is image/gif and size tiny, skip
    if (buffer.length < 128) throw new Error('Invalid or tiny image')
  }
  return { buffer, contentType: ct }
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
  if (kind === 'perk-type') return `perks/type/${shaHex}.${clean}`
  if (kind === 'item') return `items/icons/${shaHex}.${clean}`
  return `charms/icons/${shaHex}.${clean}`
}

async function main() {
  const { table, concurrency, limit, resume, delayMs, perkId, fixPlaceholders } = parseArgs()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env')
  const admin = createClient<Database>(supabaseUrl, serviceKey)

  await ensureBucket(admin)

  const checkpoint = resume && !(table === 'items') ? loadCheckpoint() : { processedIds: {} }

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
  } else if (table === 'perks') {
    // perks
    let perksQuery = admin
      .from('perks')
      .select('id,name,main_icon_url,type_icon_url,main_media_id,type_media_id,weapon_id')
    if (perkId) {
      perksQuery = perksQuery.eq('id', perkId)
    } else {
      perksQuery = perksQuery.limit(limit)
    }
    const { data, error } = await perksQuery
    if (error) throw error
    const items = (data || []) as PerkRow[]
    await runQueue(items, concurrency, delayMs, async (row) => {
      if (checkpoint.processedIds[row.id]) return
      // main
      if (!row.main_media_id && row.main_icon_url) {
        try {
          await runWithRetry(async () => {
            await processOne(admin, row.main_icon_url!, 'perk-main', undefined, 'Tibia Wiki (Fandom)', async (mediaId) => {
              await admin.from('perks').update({ main_media_id: mediaId }).eq('id', row.id)
            })
          })
        } catch (e) {
          console.error('Failed to process main icon for perk', row.id, row.name, e)
        }
      }
      // type
      if (!row.type_media_id && row.type_icon_url) {
        try {
          await runWithRetry(async () => {
            await processOne(admin, row.type_icon_url!, 'perk-type', undefined, 'Tibia Wiki (Fandom)', async (mediaId) => {
              await admin.from('perks').update({ type_media_id: mediaId }).eq('id', row.id)
            })
          })
        } catch (e) {
          console.error('Failed to process type icon for perk', row.id, row.name, e)
        }
      }
      checkpoint.processedIds[row.id] = true
      saveCheckpoint(checkpoint)
    })

    // Strong remediation: for any remaining rows, fetch & upload (dedupe by sha) ignoring checkpoint
    await fillPerksByFetchUpload(admin, Math.max(2, Math.min(8, concurrency)), delayMs)

    // Propagate media IDs to other perks with the same name (shared icons)
    await propagatePerkMediaByName(admin)
    // Link perks by exact source_url if a media row already exists
    await linkPerksBySourceUrl(admin)
    // Finally, link perks by content hash of their legacy URL (dedupe across variant URLs)
    await linkPerksByHash(admin, Math.max(2, Math.min(10, concurrency)), delayMs)
    // Heuristic: link by filename (e.g., Sanguine_Coil.gif) to catch URL variants with same basename
    await linkPerksByFilename(admin)
    // Map by normalized fandom URL (basename + crop params) using already-linked rows
    await linkPerksByNormalizedUrl(admin)
    // Map by normalized key derived directly from media.source_url
    await linkPerksByNormalizedUrlFromMedia(admin)
  } else if (table === 'imbuements') {
    // imbuements
    const { force } = parseArgs()
    let query = admin
      .from('imbuements')
      .select('id, name, icon_url, icon_media_id')
      .not('icon_url', 'is', null)
      .limit(limit)
    if (!force) {
      query = query.is('icon_media_id', null)
    }
    const { data, error } = await query
    if (error) throw error
    const items = (data || []) as { id: string; name: string; icon_url: string | null; icon_media_id: string | null }[]
    console.log(`[backfill] imbuements candidates: ${items.length}`)
    if (items.length === 0) {
      console.log('[backfill] No imbuements to process (either no icon_url set or already linked).')
    }
    await runQueue(items, concurrency, delayMs, async (row) => {
      if (!row.icon_url) return
      await runWithRetry(async () => {
        await processOne(admin, row.icon_url!, 'imbuement', row.id, 'Tibia Wiki (Fandom)', async (mediaId) => {
          await admin.from('imbuements').update({ icon_media_id: mediaId }).eq('id', row.id)
        })
      }, 5)
    })
  } else {
    // items or charms
    const tableName = table === 'charms' ? 'charms' : 'items'
    const baseQ = admin
      .from(tableName)
      .select('id, name, icon_url, icon_media_id')
      .is('icon_media_id', null)
      .not('icon_url', 'is', null)
      .limit(limit)
    const { data: baseRows, error: baseErr } = await baseQ
    if (baseErr) throw baseErr
    let items = (baseRows || []) as ItemRow[]

    if (fixPlaceholders) {
      const { data: linked, error: linkedErr } = await admin
        .from('items')
        .select('id, name, icon_url, icon_media_id, media:icon_media_id(bytes, source_url)')
        .not('icon_media_id', 'is', null)
        .limit(limit)
      if (linkedErr) throw linkedErr
      const bad = (linked || []).filter((r: any) => {
        const m = r.media as { bytes: number | null; source_url: string | null } | null
        if (!m) return false
        const isData = (m.source_url || '').startsWith('data:')
        const tiny = (m.bytes || 0) <= 100
        return isData || tiny
      }) as any[]
      items = items.concat(bad.map((r: any) => ({ id: r.id, name: r.name, icon_url: r.icon_url, icon_media_id: r.icon_media_id } as ItemRow)))
    }
    await runQueue(items, concurrency, delayMs, async (row) => {
      // When fixing placeholders, ignore checkpoint to force reprocessing
      if (!fixPlaceholders && checkpoint.processedIds[row.id]) return
      if (!row.icon_url) return
      await runWithRetry(async () => {
        await processOne(
          admin,
          row.icon_url!,
          table === 'charms' ? 'charm' : 'item',
          row.id,
          'Tibia Wiki (Fandom)',
          async (mediaId) => {
            await admin.from(tableName).update({ icon_media_id: mediaId }).eq('id', row.id)
          }
        )
      }, 5)
      checkpoint.processedIds[row.id] = true
      if (!fixPlaceholders) saveCheckpoint(checkpoint)
    })
  }

  console.log('Backfill completed')
}

async function propagatePerkMediaByName(admin: SupabaseClient<Database>) {
  // Build lookup of name -> main_media_id and name -> type_media_id from rows that have them
  const { data: rows, error } = await admin
    .from('perks')
    .select('id,name,main_media_id,type_media_id')
  if (error) throw error
  const nameToMain: Record<string, string> = {}
  const nameToType: Record<string, string> = {}
  for (const r of rows || []) {
    if ((r as any).main_media_id && !nameToMain[(r as any).name]) nameToMain[(r as any).name] = (r as any).main_media_id
    if ((r as any).type_media_id && !nameToType[(r as any).name]) nameToType[(r as any).name] = (r as any).type_media_id
  }
  // Batch-update missing FKs by name
  const toUpdateMain = (rows || []).filter((r) => !(r as any).main_media_id && nameToMain[(r as any).name])
  const toUpdateType = (rows || []).filter((r) => !(r as any).type_media_id && nameToType[(r as any).name])
  // Chunk updates to avoid large payloads
  const chunk = async <T>(arr: T[], size: number, fn: (part: T[]) => Promise<void>) => {
    for (let i = 0; i < arr.length; i += size) {
      await fn(arr.slice(i, i + size))
    }
  }
  // Update individually with modest concurrency to set the correct FK per row
  const updateOneMain = async (r: any) => {
    const id = r.id as string
    const mediaId = nameToMain[r.name] as string
    if (!id || !mediaId) return
    await admin.from('perks').update({ main_media_id: mediaId }).eq('id', id)
  }
  const updateOneType = async (r: any) => {
    const id = r.id as string
    const mediaId = nameToType[r.name] as string
    if (!id || !mediaId) return
    await admin.from('perks').update({ type_media_id: mediaId }).eq('id', id)
  }

  // Reuse runQueue with low concurrency
  await runQueue(toUpdateMain as any[], 8, 0, updateOneMain)
  await runQueue(toUpdateType as any[], 8, 0, updateOneType)
}

async function linkPerksBySourceUrl(admin: SupabaseClient<Database>) {
  // Fetch perks missing FKs but having legacy URLs
  const { data: rows, error } = await admin
    .from('perks')
    .select('id, name, main_icon_url, type_icon_url, main_media_id, type_media_id')
  if (error) throw error
  const candidates = (rows || []) as any[]

  // Helper to link one side
  const linkOne = async (r: any, side: 'main' | 'type') => {
    const has = side === 'main' ? r.main_media_id : r.type_media_id
    const url: string | null = side === 'main' ? r.main_icon_url : r.type_icon_url
    if (has || !url) return
    const { data: m } = await admin.from('media').select('id').eq('source_url', url).maybeSingle()
    if (m?.id) {
      if (side === 'main') {
        await admin.from('perks').update({ main_media_id: m.id }).eq('id', r.id)
      } else {
        await admin.from('perks').update({ type_media_id: m.id }).eq('id', r.id)
      }
    }
  }

  // Run with modest concurrency
  await runQueue(candidates, 10, 0, async (r) => {
    await linkOne(r, 'main')
    await linkOne(r, 'type')
  })
}

async function linkPerksByHash(
  admin: SupabaseClient<Database>,
  concurrency: number,
  delayMs: number
) {
  // Fetch candidates missing FKs but with legacy URLs
  const { data: rows, error } = await admin
    .from('perks')
    .select('id, name, main_icon_url, type_icon_url, main_media_id, type_media_id')
  if (error) throw error

  const candidates = (rows || []).filter((r: any) => (!r.main_media_id && r.main_icon_url) || (!r.type_media_id && r.type_icon_url)) as any[]

  // Cache url -> mediaId to avoid re-fetching/re-hashing duplicates
  const urlToMediaId: Record<string, string | null> = {}

  const resolveUrlToMediaId = async (url: string, side: 'main' | 'type'): Promise<string | null> => {
    if (urlToMediaId.hasOwnProperty(url)) return urlToMediaId[url]!
    // Fetch and hash
    const { buffer } = await fetchAsBuffer(url)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    const { data: m } = await admin
      .from('media')
      .select('id, storage_path')
      .eq('sha256', `\\x${hash}`)
      .maybeSingle()
    let id: string | null = null
    if (m?.id && m.storage_path) {
      const ok = side === 'main' ? m.storage_path.startsWith('perks/main/') : m.storage_path.startsWith('perks/type/')
      id = ok ? m.id : null
    }
    urlToMediaId[url] = id
    return id
  }

  await runQueue(candidates, concurrency, delayMs, async (r) => {
    // main
    if (!r.main_media_id && r.main_icon_url) {
      try {
        const mediaId = await runWithRetry(() => resolveUrlToMediaId(r.main_icon_url, 'main'))
        if (mediaId) {
          await admin.from('perks').update({ main_media_id: mediaId }).eq('id', r.id)
        }
      } catch (e) {
        // ignore a single failure; continue
      }
    }
    // type
    if (!r.type_media_id && r.type_icon_url) {
      try {
        const mediaId = await runWithRetry(() => resolveUrlToMediaId(r.type_icon_url, 'type'))
        if (mediaId) {
          await admin.from('perks').update({ type_media_id: mediaId }).eq('id', r.id)
        }
      } catch (e) {
        // ignore
      }
    }
  })
}

async function fillPerksByFetchUpload(
  admin: SupabaseClient<Database>,
  concurrency: number,
  delayMs: number
) {
  const { data: rows, error } = await admin
    .from('perks')
    .select('id, name, main_icon_url, type_icon_url, main_media_id, type_media_id')
  if (error) throw error
  const candidates = (rows || []).filter((r: any) => (!r.main_media_id && r.main_icon_url) || (!r.type_media_id && r.type_icon_url)) as any[]
  await runQueue(candidates, concurrency, delayMs, async (r) => {
    if (!r.main_media_id && r.main_icon_url) {
      try {
        await runWithRetry(async () => {
          await processOne(admin, r.main_icon_url!, 'perk-main', undefined, 'Tibia Wiki (Fandom)', async (mediaId) => {
            await admin.from('perks').update({ main_media_id: mediaId }).eq('id', r.id)
          })
        })
      } catch {}
    }
    if (!r.type_media_id && r.type_icon_url) {
      try {
        await runWithRetry(async () => {
          await processOne(admin, r.type_icon_url!, 'perk-type', undefined, 'Tibia Wiki (Fandom)', async (mediaId) => {
            await admin.from('perks').update({ type_media_id: mediaId }).eq('id', r.id)
          })
        })
      } catch {}
    }
  })
}

function extractFilename(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/')
    // Fandom paths often are /images/a/ab/Filename.ext/...
    // Grab the segment that looks like it has a dot extension
    for (let i = parts.length - 1; i >= 0; i--) {
      const seg = parts[i]
      if (seg.includes('.') && seg.length > 1) return seg.toLowerCase()
    }
    return null
  } catch {
    return null
  }
}

async function linkPerksByFilename(admin: SupabaseClient<Database>) {
  // Build filename -> mediaId map from media rows that have source_url
  const { data: mediaRows, error: mediaErr } = await admin
    .from('media')
    .select('id, source_url, storage_path')
    .not('source_url', 'is', null)
  if (mediaErr) throw mediaErr
  const mainFilenameToMedia: Record<string, string> = {}
  const typeFilenameToMedia: Record<string, string> = {}
  for (const m of mediaRows || []) {
    const fn = extractFilename((m as any).source_url as string | null)
    const sp = (m as any).storage_path as string | undefined
    if (!fn || !sp) continue
    if (sp.startsWith('perks/main/') && !mainFilenameToMedia[fn]) mainFilenameToMedia[fn] = (m as any).id
    if (sp.startsWith('perks/type/') && !typeFilenameToMedia[fn]) typeFilenameToMedia[fn] = (m as any).id
  }

  // Fetch perks missing FKs
  const { data: perks, error: perksErr } = await admin
    .from('perks')
    .select('id, name, main_icon_url, type_icon_url, main_media_id, type_media_id')
  if (perksErr) throw perksErr

  const candidates = (perks || []) as any[]

  await runQueue(candidates, 10, 0, async (r) => {
    if (!r.main_media_id) {
      const fn = extractFilename(r.main_icon_url)
      const mediaId = fn ? mainFilenameToMedia[fn] : undefined
      if (mediaId) {
        await admin.from('perks').update({ main_media_id: mediaId }).eq('id', r.id)
      }
    }
    if (!r.type_media_id) {
      const fn = extractFilename(r.type_icon_url)
      const mediaId = fn ? typeFilenameToMedia[fn] : undefined
      if (mediaId) {
        await admin.from('perks').update({ type_media_id: mediaId }).eq('id', r.id)
      }
    }
  })
}

function normalizeFandomKey(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/')
    // Find basename like Weapon_Proficiency_-_General.png
    let basename: string | null = null
    for (let i = parts.length - 1; i >= 0; i--) {
      const seg = parts[i]
      if (seg.includes('.') && seg.length > 1) { basename = seg.toLowerCase(); break }
    }
    if (!basename) return null
    // Extract crop params from path segments when present
    const getVal = (key: string): string | null => {
      const idx = parts.indexOf(key)
      if (idx >= 0 && idx + 1 < parts.length) return parts[idx + 1]
      return null
    }
    const width = getVal('width')
    const xoff = getVal('x-offset')
    const yoff = getVal('y-offset')
    const wwin = getVal('window-width')
    const whei = getVal('window-height')
    const cropKey = width || xoff || yoff || wwin || whei
      ? `|w:${width||''}|x:${xoff||''}|y:${yoff||''}|ww:${wwin||''}|wh:${whei||''}`
      : ''
    return `${basename}${cropKey}`
  } catch {
    return null
  }
}

async function linkPerksByNormalizedUrl(admin: SupabaseClient<Database>) {
  // Build normalization maps from already-linked perks
  const { data: rows, error } = await admin
    .from('perks')
    .select('id,name,main_icon_url,type_icon_url,main_media_id,type_media_id')
  if (error) throw error
  const mainMap: Record<string, string> = {}
  const typeMap: Record<string, string> = {}
  for (const r of rows || []) {
    const rr: any = r
    if (rr.main_media_id && rr.main_icon_url) {
      const k = normalizeFandomKey(rr.main_icon_url)
      if (k && !mainMap[k]) mainMap[k] = rr.main_media_id
    }
    if (rr.type_media_id && rr.type_icon_url) {
      const k = normalizeFandomKey(rr.type_icon_url)
      if (k && !typeMap[k]) typeMap[k] = rr.type_media_id
    }
  }

  // Link missing rows by normalized key
  const missing = (rows || []).filter((r: any) => (!r.main_media_id && r.main_icon_url) || (!r.type_media_id && r.type_icon_url)) as any[]
  await runQueue(missing, 12, 0, async (r) => {
    if (!r.main_media_id && r.main_icon_url) {
      const k = normalizeFandomKey(r.main_icon_url)
      const id = k ? mainMap[k] : undefined
      if (id) await admin.from('perks').update({ main_media_id: id }).eq('id', r.id)
    }
    if (!r.type_media_id && r.type_icon_url) {
      const k = normalizeFandomKey(r.type_icon_url)
      const id = k ? typeMap[k] : undefined
      if (id) await admin.from('perks').update({ type_media_id: id }).eq('id', r.id)
    }
  })
}

async function linkPerksByNormalizedUrlFromMedia(admin: SupabaseClient<Database>) {
  // Build key -> mediaId from ALL media rows with a source_url
  const { data: mediaRows, error: mediaErr } = await admin
    .from('media')
    .select('id, source_url, storage_path')
    .not('source_url', 'is', null)
  if (mediaErr) throw mediaErr

  const mainKeyToMedia: Record<string, string> = {}
  const typeKeyToMedia: Record<string, string> = {}
  for (const m of mediaRows || []) {
    const key = normalizeFandomKey((m as any).source_url as string)
    const sp = (m as any).storage_path as string | undefined
    if (!key || !sp) continue
    if (sp.startsWith('perks/main/') && !mainKeyToMedia[key]) mainKeyToMedia[key] = (m as any).id
    if (sp.startsWith('perks/type/') && !typeKeyToMedia[key]) typeKeyToMedia[key] = (m as any).id
  }

  // Fetch perks missing FKs
  const { data: perks, error: perksErr } = await admin
    .from('perks')
    .select('id, main_icon_url, type_icon_url, main_media_id, type_media_id')
  if (perksErr) throw perksErr

  const rows = (perks || []) as any[]
  await runQueue(rows, 16, 0, async (r) => {
    if (!r.main_media_id && r.main_icon_url) {
      const k = normalizeFandomKey(r.main_icon_url)
      const id = k ? mainKeyToMedia[k] : undefined
      if (id) await admin.from('perks').update({ main_media_id: id }).eq('id', r.id)
    }
    if (!r.type_media_id && r.type_icon_url) {
      const k = normalizeFandomKey(r.type_icon_url)
      const id = k ? typeKeyToMedia[k] : undefined
      if (id) await admin.from('perks').update({ type_media_id: id }).eq('id', r.id)
    }
  })
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
  const { data: existing } = await admin.from('media').select('id,storage_path,source_url,bytes').eq('sha256', `\\x${shaHex}`).maybeSingle()
  if (existing) {
    const src = (existing as any).source_url as string | null
    const bytes = (existing as any).bytes as number | null
    const isPlaceholder = (src && src.startsWith('data:')) || (bytes != null && bytes <= 100)
    if (!isPlaceholder) {
      await onLinked((existing as any).id)
      return
    }
    // else: continue and upload the fetched non-placeholder image
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

async function runWithRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e: any) {
      lastErr = e
      const status = typeof e?.status === 'number' ? e.status : undefined
      const isRetriable = !status || status >= 500 || status === 429
      if (!isRetriable || i === attempts - 1) break
      const jitter = Math.floor(Math.random()*200)
      const backoff = 500 * Math.pow(2, i) + jitter
      await sleep(backoff)
    }
  }
  throw lastErr
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


