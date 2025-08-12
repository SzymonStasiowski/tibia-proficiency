import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { fetchHtml, HtmlCache, loadEnv, createAdminClient } from './shared'
import { load } from 'cheerio'

type Ctx = {
  admin: SupabaseClient<Database>
  cache: HtmlCache
  limit: number
  delayMs: number
}

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

function key(name: string, slot: string) {
  return `${name.trim().toLowerCase()}|${slot.trim().toLowerCase()}`
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
  const norm = headers.map((h) => h.replace(/\s+/g, ' ').trim().toLowerCase())
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

function pickHttp(input?: string | null): string | null {
  if (!input) return null
  const u = input.trim()
  if (!u || u.startsWith('data:')) return null
  if (u.startsWith('//')) return `https:${u}`
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  return null
}

function extractIconUrlFromCell($cell: any): string | null {
  const img = $cell.find('img').first()
  if (img && img.length) {
    const ds = pickHttp(img.attr('data-src'))
    if (ds) return ds
    const dorig = pickHttp(img.attr('data-original'))
    if (dorig) return dorig
    const srcset = img.attr('srcset')
    if (srcset) {
      const parts = srcset.split(',').map((p: string) => p.trim().split(' ')[0]).reverse()
      for (const p of parts) { const ok = pickHttp(p); if (ok) return ok }
    }
    const src = pickHttp(img.attr('src'))
    if (src) return src
  }
  const nos = $cell.find('noscript').first()
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
        for (const p of parts) { const ok = pickHttp(p); if (ok) return ok }
      }
    }
  }
  const style = $cell.attr('style') || ''
  const m = style.match(/url\(([^)]+)\)/i)
  if (m) {
    const raw = m[1].replace(/['"]/g, '')
    const ok = pickHttp(raw)
    if (ok) return ok
  }
  return null
}

async function extractIconFromDetail(itemHref: string, ctx: Ctx): Promise<string | null> {
  try {
    const url = new URL(itemHref, 'https://tibia.fandom.com').toString()
    const html = await fetchHtml(url, ctx.cache, ctx.delayMs)
    const $ = load(html)
    // Prefer infobox/primary figure icon; avoid layout logos
    const cand = $('aside.portable-infobox .pi-image img, figure a img, .pi-image img, #mw-content-text img').first()
    const tryUrl = cand.attr('src') || cand.attr('data-src') || cand.attr('data-original')
    const final = pickHttp(tryUrl)
    return final
  } catch {
    return null
  }
}

export async function fillItemIcons(ctx: Ctx) {
  console.log('Fill: item icons for missing icon_url')
  // Load existing items map for quick id lookup
  const existing = await ctx.admin.from('items').select('id,name,slot,icon_url')
  if (existing.error) throw existing.error
  const nameSlotToId = new Map<string, { id: string; hasUrl: boolean }>()
  for (const r of existing.data || []) nameSlotToId.set(key((r as any).name, (r as any).slot), { id: (r as any).id, hasUrl: !!(r as any).icon_url })

  let updates = 0
  for (const src of sources.slice(0, ctx.limit)) {
    const html = await fetchHtml(src, ctx.cache, ctx.delayMs)
    const $ = load(html)
    const { slot } = mapCategoryAndSlot(src)
    const tables = $('table').filter((_: number, el: any) => {
      const headers = $(el).find('th').map((__: number, th: any) => $(th).text().trim().toLowerCase()).get() as string[]
      return headers.some((h) => /^(item|name)\b/.test(h))
    }).toArray()

    for (const table of tables) {
      const headers = $(table).find('th').map((_: number, th: any) => $(th).text().trim().toLowerCase()).get() as string[]
      const col = buildHeaderIndex(headers)
      const rows = $(table).find('tbody tr').toArray()
      for (const tr of rows) {
        const tds = $(tr).find('td')
        if (!tds.length) continue
        const itemIdx = col.item ?? 0
        const cell = $(tds[itemIdx])
        const name = cell.find('a').last().text().trim() || cell.text().trim()
        if (!name) continue
        const k = key(name, slot)
        const match = nameSlotToId.get(k)
        if (!match || match.hasUrl) continue

        // Try to get a usable icon URL
        let icon = extractIconUrlFromCell(cell)
        if (!icon) {
          const href = cell.find('a').first().attr('href') || null
          if (href) icon = await extractIconFromDetail(href, ctx)
        }
        if (!icon) continue

        const { error } = await ctx.admin.from('items').update({ icon_url: icon }).eq('id', match.id)
        if (error) throw error
        updates++
      }
    }
  }
  console.log(`Updated icon_url for ${updates} item(s)`) 
}

// CLI runner
if (require.main === module) {
  loadEnv()
  const admin = createAdminClient()
  const cache = new HtmlCache()
  const limit = 9
  const delayMs = 200
  fillItemIcons({ admin, cache, limit, delayMs }).catch((e) => { console.error(e); process.exit(1) })
}


