const PUBLIC_BUCKET = 'images-public'

export type MediaRecord = {
  id: string
  storage_path: string
}

export function getPublicUrl(storagePath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_STORAGE_URL or NEXT_PUBLIC_SUPABASE_URL for public storage URLs')
  }
  return `${baseUrl}/storage/v1/object/public/${PUBLIC_BUCKET}/${storagePath}`
}

export function getImageFromRecord(params: {
  media?: MediaRecord | null
  legacyUrl?: string | null
}): string | null {
  const { media, legacyUrl } = params
  if (media?.storage_path) return getPublicUrl(media.storage_path)
  // No more legacy fallback: enforce first-party only
  return null
}

export type MediaKind = 'weapon' | 'perk-main' | 'perk-type'

export function buildStoragePath(
  kind: MediaKind,
  sha256Hex: string,
  ext: string,
  slugOrId?: string
): string {
  const cleanExt = ext.replace(/^\./, '')
  if (kind === 'weapon') {
    const prefix = slugOrId ? `weapons/${slugOrId}` : 'weapons/unknown'
    return `${prefix}/${sha256Hex}.${cleanExt}`
  }
  if (kind === 'perk-main') {
    return `perks/main/${sha256Hex}.${cleanExt}`
  }
  return `perks/type/${sha256Hex}.${cleanExt}`
}

export function asDisplayUrl(url: string | null): string | null {
  if (!url) return null
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supaPrefix = baseUrl ? `${baseUrl}/storage/v1/object/public/` : null
  if (supaPrefix && url.startsWith(supaPrefix)) return url
  // If it looks like a Supabase public URL but baseUrl differs (e.g., region alias), allow direct
  if (url.includes('/storage/v1/object/public/')) return url
  // If it looks like a media id (uuid), support internal canonical route
  if (/^[0-9a-fA-F-]{36}$/.test(url)) {
    return `/api/image/${url}`
  }
  // Enforce first-party only: do not proxy external URLs
  return null
}


