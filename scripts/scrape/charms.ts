import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { fetchHtml, HtmlCache, logDryRun } from './shared'

type Ctx = {
  admin: SupabaseClient<Database>
  cache: HtmlCache
  limit: number
  dryRun: boolean
  delayMs: number
}

export async function scrapeCharms(ctx: Ctx) {
  console.log('Scrape: charms (stub)')
  const sources: string[] = []
  for (const url of sources.slice(0, ctx.limit)) {
    const html = await fetchHtml(url, ctx.cache, ctx.delayMs)
    logDryRun(ctx.dryRun, `Would upsert charm(s) from ${url} (length=${html.length})`)
    if (!ctx.dryRun) {
      // TODO: admin.from('charms').upsert(...)
    }
  }
}

