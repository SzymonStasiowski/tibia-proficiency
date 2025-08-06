import { getWeaponCategories, getCommunityStats } from '@/lib/serverQueries'
import HomeClient from '@/components/HomeClient'

export default async function Home() {
  // Fetch data on the server
  const [initialCategories, initialStats] = await Promise.all([
    getWeaponCategories(),
    getCommunityStats()
  ])

  return (
    <HomeClient 
      initialCategories={initialCategories}
      initialStats={initialStats}
    />
  )
}
