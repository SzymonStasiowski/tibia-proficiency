import { getWeaponCategories, getHotWeapons, getPopularBuilds } from '@/lib/serverQueries'
import HomeClient from '@/components/HomeClient'

// Force dynamic rendering to prevent stale data in production
export const dynamic = 'force-dynamic'

export default async function Home() {
  // Fetch data on the server
  const [initialCategories, initialHotWeapons, initialPopularBuilds] = await Promise.all([
    getWeaponCategories(),
    getHotWeapons(10),
    getPopularBuilds(10)
  ])

  return (
    <HomeClient 
      initialCategories={initialCategories}
      initialHotWeapons={initialHotWeapons}
      initialPopularBuilds={initialPopularBuilds}
    />
  )
}
