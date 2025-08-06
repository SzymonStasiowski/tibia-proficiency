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
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Alternative: if you prefer no formatting to avoid any hydration issues
export function formatNumberSimple(num: number): string {
  return num.toString()
} 