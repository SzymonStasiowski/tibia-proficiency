import { getWeaponCategories, getCommunityStats, getHotWeapons } from '@/lib/serverQueries'
import HomeClient from '@/components/HomeClient'

export default async function Home() {
  // Fetch data on the server
  const [initialCategories, initialStats, initialHotWeapons] = await Promise.all([
    getWeaponCategories(),
    getCommunityStats(),
    getHotWeapons(10)
  ])

  return (
    <HomeClient 
      initialCategories={initialCategories}
      initialStats={initialStats}
      initialHotWeapons={initialHotWeapons}
    />
  )
}
