/*
  Usage examples:
    tsx scripts/scrape/_runner.ts items --limit 100 --dryRun
    tsx scripts/scrape/_runner.ts imbuements --limit 100
    tsx scripts/scrape/_runner.ts all --limit 50 --dryRun
*/
import { loadEnv, createAdminClient, HtmlCache } from './shared'
import { scrapeItems } from './items'
import { scrapeImbuements } from './imbuements'
import { scrapeCharms } from './charms'

function parseArgs() {
  const args = process.argv.slice(2)
  const domain = (args[0] || 'items') as 'items' | 'imbuements' | 'charms' | 'all'
  const get = (f: string) => {
    const i = args.indexOf(f)
    return i >= 0 ? args[i + 1] : undefined
  }
  const has = (f: string) => args.includes(f)
  return {
    domain,
    limit: Number(get('--limit') || 1000),
    dryRun: has('--dryRun'),
    delayMs: Number(get('--delayMs') || 300),
  }
}

async function main() {
  const { domain, limit, dryRun, delayMs } = parseArgs()
  loadEnv()
  const admin = createAdminClient()
  const cache = new HtmlCache()
  const ctx = { admin, cache, limit, dryRun, delayMs }
  if (domain === 'items') await scrapeItems(ctx)
  else if (domain === 'imbuements') await scrapeImbuements(ctx)
  else if (domain === 'charms') await scrapeCharms(ctx)
  else {
    await scrapeItems(ctx)
    await scrapeImbuements(ctx)
    await scrapeCharms(ctx)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

