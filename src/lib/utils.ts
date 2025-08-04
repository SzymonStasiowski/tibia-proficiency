// Consistent number formatting that works the same on server and client
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Alternative: if you prefer no formatting to avoid any hydration issues
export function formatNumberSimple(num: number): string {
  return num.toString()
} 