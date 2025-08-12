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

export async function scrapeCharms(ctx: Ctx) {
  console.log('Scrape: charms')
  const sources: string[] = [
    'https://tibia.fandom.com/wiki/Cyclopedia',
  ]

  // Load existing charms for merge by name (case-insensitive)
  const existing = await ctx.admin
    .from('charms')
    .select('id,name')
  if (existing.error) throw existing.error
  const key = (n: string) => n.trim().toLowerCase()
  const existingMap = new Map<string, { id: string }>()
  for (const row of existing.data || []) {
    existingMap.set(key(row.name), { id: row.id })
  }

  const allRows: Array<Database['public']['Tables']['charms']['Insert'] & { id?: string; icon_url?: string | null }> = []
  const perUrlCounts: Record<string, number> = {}

  for (const url of sources.slice(0, ctx.limit)) {
    const html = await fetchHtml(url, ctx.cache, ctx.delayMs)
    const $ = load(html)

    // Find tables that look like the "List of Charms": must have Charm, Type, Description headers
    const tables = $('table').filter((_: number, el: any) => {
      const headers = $(el)
        .find('th')
        .map((__: number, th: any) => $(th).text().trim().toLowerCase())
        .get() as string[]
      const hasCharm = headers.some((h) => h.startsWith('charm') || h.startsWith('name'))
      const hasType = headers.some((h) => h.startsWith('type'))
      const hasDescOrEffect = headers.some((h) => h.startsWith('description') || h.startsWith('effect'))
      return hasCharm && hasType && hasDescOrEffect
    })

    tables.each((__: number, tableEl: any) => {
      const headers = $(tableEl)
        .find('th')
        .map((_: number, th: any) => $(th).text().trim().toLowerCase())
        .get() as string[]
      const col = buildCharmHeaderIndex(headers)
      const rows = $(tableEl).find('tbody tr').toArray()
      rowLoop: for (const tr of rows) {
        const $tr = $(tr)
        const tds = $tr.find('td')
        if (tds.length === 0) continue rowLoop

        const nameIdx = col.name ?? col.charm ?? 0
        const $nameCell = $(tds[nameIdx])
        const name = $nameCell.find('a').last().text().trim() || $nameCell.text().trim()
        if (!name) continue rowLoop

        const typeIdx = col.type
        const typeRaw = typeIdx != null && tds[typeIdx] ? $(tds[typeIdx]).text().trim().toLowerCase() : ''
        const type = normalizeCharmType(typeRaw)
        if (!type) continue rowLoop

        const descIdx = col.description ?? col.effect
        const description = descIdx != null && tds[descIdx] ? clean($(tds[descIdx]).text()) : ''

        // Icon is optional at scrape stage; store original URL if present (migration adds icon_url)
        let iconIdx = col.icon
        let icon_url: string | null = null
        if (iconIdx == null) {
          // Heuristic: icon cell is often immediately after name
          const maybe = nameIdx + 1
          if (maybe < tds.length) iconIdx = maybe
        }
        if (iconIdx != null && tds[iconIdx]) {
          icon_url = extractIconUrl($(tds[iconIdx]))
        }

        const row = {
          name,
          type,
          description: description || null,
          source_url: `${url}#Charms`,
          // Not part of base schema; optional column added via migration
          icon_url: icon_url || null,
        } as Database['public']['Tables']['charms']['Insert'] & { icon_url?: string | null }

        const existingId = existingMap.get(key(name))?.id
        if (existingId) {
          ;(row as any).id = existingId
        }
        allRows.push(row)
      }
    })
    perUrlCounts[url] = (perUrlCounts[url] || 0) + allRows.filter((r) => (r as any).source_url?.startsWith(url)).length
  }

  logDryRun(ctx.dryRun, `Prepared ${allRows.length} charm rows`)
  if (ctx.dryRun) {
    for (const [u, c] of Object.entries(perUrlCounts)) {
      console.log(`- ${u} -> ${c} rows`)
    }
    // Print a couple of samples to verify fields
    const samples = allRows.slice(0, 3).map((r) => ({ name: r.name, type: r.type, hasIcon: Boolean((r as any).icon_url), description: r.description?.slice(0, 80) }))
    console.log('Samples:', samples)
  }
  if (!ctx.dryRun && allRows.length) {
    const inserts = allRows.filter((r: any) => !r.id)
    const updates = allRows.filter((r: any) => r.id)
    const batchSize = 1000
    // Inserts
    for (let i = 0; i < inserts.length; i += batchSize) {
      const chunk = inserts.slice(i, i + batchSize).map((r: any) => { const { id, ...rest } = r; return rest })
      if (chunk.length === 0) continue
      const { error } = await ctx.admin.from('charms').insert(chunk)
      if (error) throw error
    }
    // Updates
    for (let i = 0; i < updates.length; i += batchSize) {
      const chunk = updates.slice(i, i + batchSize)
      for (const r of chunk as any[]) {
        const { id, ...rest } = r
        const { error } = await ctx.admin.from('charms').update(rest).eq('id', id)
        if (error) throw error
      }
    }
  }
}

function buildCharmHeaderIndex(headers: string[]): Record<string, number | undefined> {
  const norm = headers.map((h) => h.replace(/\s+/g, ' ').trim())
  const find = (...labels: string[]) => {
    const idx = norm.findIndex((h) => labels.some((l) => h.startsWith(l)))
    return idx >= 0 ? idx : undefined
  }
  return {
    icon: find('icon'),
    charm: find('charm'),
    name: find('name'),
    type: find('type'),
    description: find('description'),
    effect: find('effect'),
  }
}

function normalizeCharmType(t: string): 'minor' | 'major' | null {
  const s = (t || '').toLowerCase()
  if (s.includes('minor')) return 'minor'
  if (s.includes('major')) return 'major'
  return null
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
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

  const style = cell.attr('style') || ''
  const m = style.match(/url\(([^)]+)\)/i)
  if (m) {
    const raw = m[1].replace(/['"]/g, '')
    const ok = pickHttp(raw)
    if (ok) return ok
  }
  return null
}

