import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { fetchHtml, HtmlCache, logDryRun } from './shared'
import { load } from 'cheerio'

type Ctx = {
  admin: SupabaseClient<Database>
  cache: HtmlCache
  limit: number
  dryRun: boolean
  delayMs: number
}

export async function scrapeItems(ctx: Ctx) {
  console.log('Scrape: items')
  const sources: string[] = [
    'https://tibia.fandom.com/wiki/Helmets',
    'https://tibia.fandom.com/wiki/Armors',
    'https://tibia.fandom.com/wiki/Legs',
    'https://tibia.fandom.com/wiki/Boots',
    'https://tibia.fandom.com/wiki/Shields',
    'https://tibia.fandom.com/wiki/Spellbooks',
    'https://tibia.fandom.com/wiki/Quivers',
    'https://tibia.fandom.com/wiki/Amulets_and_Necklaces',
    'https://tibia.fandom.com/wiki/Rings',
  ]

  // Load existing items once for case-insensitive merge by name+slot
  const existing = await ctx.admin
    .from('items')
    .select('id,name,slot')
  if (existing.error) throw existing.error
  const key = (n: string, s: string) => `${n.trim().toLowerCase()}|${s.trim().toLowerCase()}`
  const existingMap = new Map<string, { id: string }>()
  for (const row of existing.data || []) {
    existingMap.set(key(row.name, row.slot), { id: row.id })
  }

  const allRows: Array<Database['public']['Tables']['items']['Insert'] & { id?: string }> = []

  const perUrlCounts: Record<string, number> = {}
  for (const url of sources.slice(0, ctx.limit)) {
    const html = await fetchHtml(url, ctx.cache, ctx.delayMs)
    const $ = load(html)
    const { category, slot } = mapCategoryAndSlot(url)

    const tables = $('table').filter((_: number, el: any) => {
      const headers = $(el)
        .find('th')
        .map((__: number, th: any) => $(th).text().trim().toLowerCase())
        .get() as string[]
      const hasItemCol = headers.some((h) => /^(item|name)\b/.test(h))
      return hasItemCol && headers.length >= 4
    })

    tables.each((__: number, tableEl: any) => {
      const headers = $(tableEl)
        .find('th')
        .map((_: number, th: any) => $(th).text().trim().toLowerCase())
        .get() as string[]
      const col = buildHeaderIndex(headers)
      const rows = $(tableEl).find('tbody tr').toArray()
      rowLoop: for (const tr of rows) {
        const $tr = $(tr)
        const tds = $tr.find('td')
        if (tds.length === 0) continue rowLoop
        const itemIdx = col.item ?? 0
        const $itemCell = $(tds[itemIdx])
        const name = $itemCell.find('a').last().text().trim() || $itemCell.text().trim()
        if (!name) continue rowLoop
        const lower = name.toLowerCase()
        if (['items in tibia', 'items', 'amulets and necklaces', 'amulets', 'necklaces', 'rings', 'shields', 'spellbooks', 'quivers'].includes(lower)) continue rowLoop
        let icon_url = extractIconUrl($itemCell)
        if (!icon_url) {
          const href = $itemCell.find('a').first().attr('href')
          if (href && href.startsWith('/wiki/')) {
            try {
              const itemUrl = new URL(href, 'https://tibia.fandom.com').toString()
              // Note: synchronous loop; await here via async IIFE pattern
              // We cannot make this outer function async, so push a placeholder and post-process is complex.
              // Instead, we synchronously fetch via de-async technique is not possible; convert outer scope to async per table using toArray/map
            } catch {}
          }
        }
        const armorIdx = col.armor
        const attrIdx = col.attributes
        const resistIdx = col.resistances
        const imbuIdx = col.imbu_slots
        const lvlIdx = col.level_req
        const vocIdx = col.vocation
        const armor = armorIdx != null && tds[armorIdx] ? parseIntSafe($(tds[armorIdx]).text()) : null
        const attributes = attrIdx != null && tds[attrIdx] ? clean($(tds[attrIdx]).text()) || null : null
        const resistances = resistIdx != null && tds[resistIdx] ? clean($(tds[resistIdx]).text()) || null : null
        const imbu_slots = imbuIdx != null && tds[imbuIdx] ? parseIntSafe($(tds[imbuIdx]).text()) : null
        const level_req = lvlIdx != null && tds[lvlIdx] ? parseIntSafe($(tds[lvlIdx]).text()) : null
        const vocationText = vocIdx != null && tds[vocIdx] ? clean($(tds[vocIdx]).text()) : ''
        const vocation_reqs = parseVocations(vocationText)

        const row = {
          name,
          slot,
          category,
          vocation_reqs: vocation_reqs.length ? vocation_reqs : null,
          level_req: level_req ?? null,
          icon_url: icon_url || null,
          armor: armor ?? null,
          attributes,
          resistances,
          imbu_slots: imbu_slots ?? null,
          source_url: url,
        } as Database['public']['Tables']['items']['Insert']

        const k = key(name, slot)
        const existingId = existingMap.get(k)?.id
        if (existingId) {
          ;(row as any).id = existingId
        }
        allRows.push(row)
      }
    })
    perUrlCounts[url] = (perUrlCounts[url] || 0) + allRows.filter(r => r.source_url === url).length
  }

  logDryRun(ctx.dryRun, `Prepared ${allRows.length} item rows`)
  if (ctx.dryRun) {
    for (const [u, c] of Object.entries(perUrlCounts)) {
      console.log(`- ${u} -> ${c} rows`)
    }
  }
  if (!ctx.dryRun && allRows.length) {
    // Split into inserts (no id) and updates (have id)
    const inserts = allRows.filter((r: any) => !r.id)
    const updates = allRows.filter((r: any) => r.id)
    const batchSize = 1000
    // Inserts
    for (let i = 0; i < inserts.length; i += batchSize) {
      const chunk = inserts.slice(i, i + batchSize).map((r: any) => { const { id, ...rest } = r; return rest })
      if (chunk.length === 0) continue
      const { error } = await ctx.admin.from('items').insert(chunk)
      if (error) throw error
    }
    // Updates
    for (let i = 0; i < updates.length; i += batchSize) {
      const chunk = updates.slice(i, i + batchSize)
      for (const r of chunk as any[]) {
        const { id, ...rest } = r
        const { error } = await ctx.admin.from('items').update(rest).eq('id', id)
        if (error) throw error
      }
    }
  }
}

function extractIconUrl(cell: any): string | null {
  const pickHttp = (u?: string | null) => {
    if (!u) return null
    const url = u.trim()
    if (!url || url.startsWith('data:')) return null
    if (url.startsWith('//')) return `https:${url}`
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return null
  }

  const img = cell.find('img').first()
  if (img && img.length) {
    const ds = pickHttp(img.attr('data-src'))
    if (ds) return ds
    const dorig = pickHttp(img.attr('data-original'))
    if (dorig) return dorig
    const srcset = img.attr('srcset')
    if (srcset) {
      const parts = srcset.split(',').map((p: string) => p.trim().split(' ')[0]).reverse()
      for (const p of parts) {
        const ok = pickHttp(p)
        if (ok) return ok
      }
    }
    const src = pickHttp(img.attr('src'))
    if (src) return src
  }

  // Some pages include real image inside <noscript>
  const nos = cell.find('noscript').first()
  if (nos && nos.length) {
    const html = nos.html() || ''
    if (html.includes('<img')) {
      const $n = load(html)
      const img2 = $n('img').first()
      const url = pickHttp(img2.attr('src') || img2.attr('data-src') || img2.attr('data-original'))
      if (url) return url
      const ss = img2.attr('srcset')
      if (ss) {
        const parts = ss.split(',').map((p: string) => p.trim().split(' ')[0]).reverse()
        for (const p of parts) {
          const ok = pickHttp(p)
          if (ok) return ok
        }
      }
    }
  }

  // Fallback: some tables use background-image in style
  const style = cell.attr('style') || ''
  const m = style.match(/url\(([^)]+)\)/i)
  if (m) {
    const raw = m[1].replace(/['"]/g, '')
    const ok = pickHttp(raw)
    if (ok) return ok
  }
  return null
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function parseIntSafe(s: string): number | null {
  const m = (s || '').match(/-?\d+/)
  return m ? Number(m[0]) : null
}

function parseVocations(text: string): string[] {
  const t = (text || '').toLowerCase()
  const out: string[] = []
  if (!t || /any|all/.test(t)) return out
  if (/(sorcerer|sorcerers)/.test(t)) out.push('sorcerer')
  if (/(druid|druids)/.test(t)) out.push('druid')
  if (/(knight|knights)/.test(t)) out.push('knight')
  if (/(paladin|paladins)/.test(t)) out.push('paladin')
  if (/(monk|monks)/.test(t)) out.push('monk')
  return out
}

function mapCategoryAndSlot(url: string): { category: string; slot: string } {
  const u = url.toLowerCase()
  if (u.includes('/helmets')) return { category: 'helmet', slot: 'helmet' }
  if (u.includes('/armors')) return { category: 'armor', slot: 'armor' }
  if (u.includes('/legs')) return { category: 'legs', slot: 'legs' }
  if (u.includes('/boots')) return { category: 'boots', slot: 'boots' }
  if (u.includes('/shields')) return { category: 'shield', slot: 'offhand' }
  if (u.includes('/spellbooks')) return { category: 'spellbook', slot: 'offhand' }
  if (u.includes('/quivers')) return { category: 'quiver', slot: 'offhand' }
  if (u.includes('/amulets_and_necklaces')) return { category: 'amulet', slot: 'amulet' }
  if (u.includes('/rings')) return { category: 'ring', slot: 'ring' }
  return { category: 'unknown', slot: 'unknown' }
}

function buildHeaderIndex(headers: string[]): Record<string, number | undefined> {
  const norm = headers.map((h) => h.replace(/\s+/g, ' ').trim())
  const find = (...labels: string[]) => {
    const idx = norm.findIndex((h) => labels.some((l) => h.startsWith(l)))
    return idx >= 0 ? idx : undefined
  }
  return {
    item: find('item', 'name'),
    armor: find('arm', 'def', 'def.', 'defense'),
    attributes: find('attributes'),
    resistances: find('resist', 'resist.'),
    imbu_slots: find('imb', 'imb. slots'),
    level_req: find('lvl', 'level'),
    vocation: find('vocation'),
  }
}

