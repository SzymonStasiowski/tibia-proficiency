import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

export type Database = import('@/lib/database.types').Database

export function loadEnv() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
  dotenv.config({ path: path.resolve(process.cwd(), '.env') })
}

export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env (URL or SERVICE ROLE KEY)')
  return createClient<Database>(url, key)
}

export class HtmlCache {
  private dir: string
  constructor(dir = path.resolve('.cache/scrape')) {
    this.dir = dir
    fs.mkdirSync(this.dir, { recursive: true })
  }
  private fileFor(url: string) {
    const safe = url.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
    return path.join(this.dir, `${safe}.html`)
  }
  has(url: string) { return fs.existsSync(this.fileFor(url)) }
  read(url: string) { return fs.readFileSync(this.fileFor(url), 'utf8') }
  write(url: string, html: string) { fs.writeFileSync(this.fileFor(url), html, 'utf8') }
}

export async function fetchHtml(url: string, cache: HtmlCache, delayMs = 300): Promise<string> {
  if (cache.has(url)) return cache.read(url)
  if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs))
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ProficiencyScraper/1.0 (+https://proficiency.app)',
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': 'https://tibia.fandom.com/',
    }
  })
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`)
  const html = await res.text()
  cache.write(url, html)
  return html
}

export function logDryRun(dryRun: boolean, message: string) {
  if (dryRun) console.log(`[dry-run] ${message}`)
}

