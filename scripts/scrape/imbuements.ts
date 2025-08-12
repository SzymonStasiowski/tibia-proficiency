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

export async function scrapeImbuements(ctx: Ctx) {
  console.log('Scrape: imbuements')
  const sources: string[] = [
    'https://tibia.fandom.com/wiki/Imbuing',
  ]

  // Load existing for merge by name (case-insensitive)
  const existing = await ctx.admin
    .from('imbuements')
    .select('id,name')
  if (existing.error) throw existing.error
  const key = (n: string) => n.trim().toLowerCase()
  const existingMap = new Map<string, { id: string }>()
  for (const row of existing.data || []) {
    existingMap.set(key(row.name), { id: row.id })
  }

  const allRows: Array<Database['public']['Tables']['imbuements']['Insert'] & { id?: string; icon_url?: string | null }> = []
  const perUrlCounts: Record<string, number> = {}

  for (const url of sources.slice(0, ctx.limit)) {
    const html = await fetchHtml(url, ctx.cache, ctx.delayMs)
    const $ = load(html)

    const baseImbues = await extractBaseImbuements($, ctx)
    for (const imb of baseImbues) {
      // Single icon used across tiers
      const icon_url = imb.icon_url || null
      // Generate tiers 1..3 with prefixed names
      const tiers: Array<{ tier: number; name: string }> = [
        { tier: 1, name: `Basic ${imb.name}` },
        { tier: 2, name: `Intricate ${imb.name}` },
        { tier: 3, name: `Powerful ${imb.name}` },
      ]
      for (const t of tiers) {
        const row = {
          name: t.name,
          tier: t.tier,
          allowed_slots: imb.allowed_slots,
          source_url: url,
          // optional column, added via migration
          icon_url,
        } as Database['public']['Tables']['imbuements']['Insert'] & { icon_url?: string | null }

        const ex = existingMap.get(key(row.name))?.id
        if (ex) {
          ;(row as any).id = ex
        }
        allRows.push(row)
      }
    }

    perUrlCounts[url] = (perUrlCounts[url] || 0) + baseImbues.length * 3
  }

  logDryRun(ctx.dryRun, `Prepared ${allRows.length} imbuement rows`)
  if (ctx.dryRun) {
    for (const [u, c] of Object.entries(perUrlCounts)) {
      console.log(`- ${u} -> ${c} rows`)
    }
    const samples = allRows.slice(0, 6).map((r) => ({ name: r.name, tier: r.tier, slots: (r.allowed_slots || []).join(', '), hasIcon: Boolean((r as any).icon_url) }))
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
      const { error } = await ctx.admin.from('imbuements').insert(chunk)
      if (error) throw error
    }
    // Updates
    for (let i = 0; i < updates.length; i += batchSize) {
      const chunk = updates.slice(i, i + batchSize)
      for (const r of chunk as any[]) {
        const { id, ...rest } = r
        const { error } = await ctx.admin.from('imbuements').update(rest).eq('id', id)
        if (error) throw error
      }
    }
  }
}

type BaseImbuement = {
  name: string
  allowed_slots: string[]
  icon_url?: string | null
}

async function extractBaseImbuements($: ReturnType<typeof load>, ctx: Ctx): Promise<BaseImbuement[]> {
  // Heuristic approach: search for known subheadings. This page structure is stable.
  // We try to locate an image adjacent to the heading for icon_url.
  const entries: BaseImbuement[] = []

  const add = async (name: string, slots: string[], iconHint?: string | null) => {
    let icon: string | null = iconHint || null
    if (!icon) {
      icon = await resolveIconForHeading($, name, ctx)
    }
    const allowed = Array.from(new Set(slots.map((s) => s.toLowerCase())))
    entries.push({ name, allowed_slots: allowed, icon_url: icon || null })
  }

  const findIconNear = (headingText: string): string | null => {
    const pickHttp = (u?: string | null) => {
      if (!u) return null
      const url = u.trim()
      if (!url || url.startsWith('data:')) return null
      if (url.startsWith('//')) return `https:${url}`
      if (url.startsWith('http://') || url.startsWith('https://')) return url
      return null
    }
    // Find the heading node containing the text
    const heading = $('h2, h3, h4, h5').filter((_, el) => $(el).text().toLowerCase().includes(headingText.toLowerCase())).first()
    if (!heading.length) return null
    const tag = heading.get(0).tagName.toLowerCase()
    const level = Number(tag.replace('h', '')) || 3
    // Collect nodes until the next heading of same or higher level
    const sectionNodes: any[] = []
    let next = heading.next()
    while (next && next.length) {
      const tn = next.get(0).tagName?.toLowerCase() || ''
      const isHeading = /^h[2-5]$/.test(tn)
      const hLevel = isHeading ? Number(tn.replace('h', '')) : 99
      if (isHeading && hLevel <= level) break
      sectionNodes.push(next)
      next = next.next()
    }
    // Search for the first image within the section nodes
    for (const node of sectionNodes) {
      const img = node.find('img').first()
      if (img && img.length) {
        const url = pickHttp(img.attr('data-src')) || pickHttp(img.attr('data-original'))
          || (() => { const ss = img.attr('srcset'); if (!ss) return null; const parts = ss.split(',').map((p: string) => p.trim().split(' ')[0]).reverse(); for (const p of parts) { const ok = pickHttp(p); if (ok) return ok } return null })()
          || pickHttp(img.attr('src'))
        if (url) return url
      }
    }
    // Fallback: search globally for an image whose alt/title hints at the name
    const candidates = $('img').filter((_, el) => {
      const alt = ($(el).attr('alt') || '').toLowerCase()
      const title = ($(el).attr('title') || '').toLowerCase()
      return alt.includes(headingText.toLowerCase()) || title.includes(headingText.toLowerCase())
    })
    if (candidates.length) {
      const img = candidates.first()
      return pickHttp(img.attr('data-src')) || pickHttp(img.attr('data-original')) || pickHttp(img.attr('src'))
    }
    return null
  }

  // Attack imbuements
  await add('Fire Damage', ['weapon'], findIconNear('Fire Damage'))
  await add('Earth Damage', ['weapon'], findIconNear('Earth Damage'))
  await add('Ice Damage', ['weapon'], findIconNear('Ice Damage'))
  await add('Energy Damage', ['weapon'], findIconNear('Energy Damage'))
  await add('Death Damage', ['weapon'], findIconNear('Death Damage'))
  await add('Life Leech', ['weapon'], findIconNear('Life Leech'))
  await add('Mana Leech', ['weapon'], findIconNear('Mana Leech'))
  await add('Critical Hit', ['weapon'], findIconNear('Critical Hit'))

  // Protective imbuements
  await add('Death Protection', ['helmet', 'armor', 'offhand'], findIconNear('Death Protection'))
  await add('Earth Protection', ['helmet', 'armor', 'offhand'], findIconNear('Earth Protection'))
  await add('Fire Protection', ['helmet', 'armor', 'offhand'], findIconNear('Fire Protection'))
  await add('Ice Protection', ['helmet', 'armor', 'offhand'], findIconNear('Ice Protection'))
  await add('Energy Protection', ['helmet', 'armor', 'offhand'], findIconNear('Energy Protection'))
  await add('Holy Protection', ['helmet', 'armor', 'offhand'], findIconNear('Holy Protection'))
  await add('Paralysis Deflection', ['boots'], findIconNear('Paralysis Deflection'))

  // Support imbuements
  await add('Walking Speed', ['boots'], findIconNear('Walking Speed'))
  await add('Capacity', ['backpack'], findIconNear('Capacity'))

  // Skill improving imbuements
  await add('Magic Level', ['helmet', 'weapon'], findIconNear('Magic Level'))
  await add('Fist Fighting', ['helmet', 'weapon'], findIconNear('Fist Fighting'))
  await add('Club Fighting', ['helmet', 'weapon'], findIconNear('Club Fighting'))
  await add('Sword Fighting', ['helmet', 'weapon'], findIconNear('Sword Fighting'))
  await add('Axe Fighting', ['helmet', 'weapon'], findIconNear('Axe Fighting'))
  await add('Distance Fighting', ['helmet', 'weapon'], findIconNear('Distance Fighting'))
  await add('Shielding', ['helmet', 'offhand'], findIconNear('Shielding'))

  return entries
}

async function resolveIconForHeading($: ReturnType<typeof load>, headingText: string, ctx: Ctx): Promise<string | null> {
  // Try to find a link in the same section that likely points to the imbuement detail (e.g., "Basic X")
  const heading = $('h2, h3, h4, h5').filter((_, el) => $(el).text().toLowerCase().includes(headingText.toLowerCase())).first()
  if (!heading.length) return null
  const tag = heading.get(0).tagName.toLowerCase()
  const level = Number(tag.replace('h', '')) || 3
  const sectionLinks: Array<{ href: string; text: string }> = []
  let next = heading.next()
  while (next && next.length) {
    const tn = next.get(0).tagName?.toLowerCase() || ''
    const isHeading = /^h[2-5]$/.test(tn)
    const hLevel = isHeading ? Number(tn.replace('h', '')) : 99
    if (isHeading && hLevel <= level) break
    next.find('a[href^="/wiki/"]').each((_, a) => {
      const href = (a as any).attribs?.href as string | undefined
      const text = ($(a).text() || '').trim()
      if (href) sectionLinks.push({ href, text })
    })
    next = next.next()
  }
  // Pick first wiki link that is not a hash and not a table of contents
  // Prefer links whose text includes tier keywords; these typically point to the imbuement page
  const tierLink = sectionLinks.find((l) => /(basic|intricate|powerful)/i.test(l.text))
  const linkHref = (tierLink || sectionLinks.find((l) => l.href && !l.href.includes('#')))?.href
  if (!linkHref) return null
  try {
    const abs = new URL(linkHref, 'https://tibia.fandom.com').toString()
    const html = await fetchHtml(abs, ctx.cache, ctx.delayMs)
    const $d = load(html)
    const pickHttp = (u?: string | null) => {
      if (!u) return null
      const url = u.trim()
      if (!url || url.startsWith('data:')) return null
      if (url.startsWith('//')) return `https:${url}`
      if (url.startsWith('http://') || url.startsWith('https://')) return url
      return null
    }
    // Try infobox thumbnail first
    const img1 = $d('.portable-infobox .pi-image-thumbnail').first()
    if (img1 && img1.length) {
      return pickHttp(img1.attr('src')) || pickHttp(img1.attr('data-src')) || pickHttp(img1.attr('data-original'))
    }
    // Fallback to main figure image
    const img2 = $d('figure a.image img, figure img').first()
    if (img2 && img2.length) {
      return pickHttp(img2.attr('src')) || pickHttp(img2.attr('data-src')) || pickHttp(img2.attr('data-original'))
    }
  } catch {
    // ignore
  }
  return null
}


