import { getWeaponCategories, getHotWeapons, getPopularBuilds } from '@/lib/serverQueries'
import HomeClient from '@/components/HomeClient'

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
