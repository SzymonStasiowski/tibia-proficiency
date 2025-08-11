// Consistent number formatting that works the same on server and client
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Convert weapon name to URL-friendly slug
export function weaponNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
}

// Convert URL slug back to weapon name for database lookup
export function slugToWeaponName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim()
}

// Convert channel name to URL-friendly slug for creators
export function channelNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
}

// Generate secure creator token
export function generateCreatorToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16))
    const hex = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('')
    return `creator_${hex}`
  } else {
    // Fallback for environments without crypto.getRandomValues
    return `creator_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
  }
}

// Validate creator token format
export function isValidCreatorToken(token: string): boolean {
  return /^creator_[a-f0-9]{32}$/.test(token) || /^creator_[a-z0-9]{26}$/.test(token)
}

// Alternative: if you prefer no formatting to avoid any hydration issues
// Removed formatNumberSimple; use formatNumber for consistent formatting.

// Utility to concatenate class names conditionally (shadcn convention)
export function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(' ')
}