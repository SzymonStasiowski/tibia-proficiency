const PUBLIC_BUCKET = 'images-public'

export type MediaRecord = {
  id: string
  storage_path: string
}

export function getPublicUrl(storagePath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for public storage URLs')
  }
  return `${baseUrl}/storage/v1/object/public/${PUBLIC_BUCKET}/${storagePath}`
}

export function getImageFromRecord(params: {
  media?: MediaRecord | null
  legacyUrl?: string | null
}): string | null {
  const { media, legacyUrl } = params
  if (media?.storage_path) {
    return getPublicUrl(media.storage_path)
  }
  return legacyUrl || null
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
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supaPrefix = baseUrl ? `${baseUrl}/storage/v1/object/public/` : null
  if (supaPrefix && url.startsWith(supaPrefix)) {
    return url
  }
  return `/api/img?url=${encodeURIComponent(url)}`
}


