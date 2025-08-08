import { getWeaponByName, getWeaponPerks, getAllWeapons } from '@/lib/serverQueries'
import { slugToWeaponName, weaponNameToSlug } from '@/lib/utils'
import WeaponClient from '@/components/WeaponClient'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

interface WeaponPageProps {
  params: Promise<{ weaponSlug: string }>
}

export default async function WeaponPage({ params }: WeaponPageProps) {
  const { weaponSlug } = await params
  const weaponName = slugToWeaponName(weaponSlug)
  
  try {
    // Fetch data on the server
    const initialWeapon = await getWeaponByName(weaponName)
    
    if (!initialWeapon) {
      notFound()
    }
    
    const initialPerks = await getWeaponPerks(initialWeapon.id)
    console.log('Server-side loaded:', weaponName, 'with', initialPerks.length, 'perks')

    return (
      <Suspense fallback={
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading weapon data...</p>
          </div>
        </div>
      }>
        <WeaponClient 
          weaponSlug={weaponSlug}
          initialWeapon={initialWeapon}
          initialPerks={initialPerks}
        />
      </Suspense>
    )
  } catch (error) {
    console.error('Error in WeaponPage:', error)
    notFound()
  }
}

// Generate static params for better performance
export async function generateStaticParams() {
  try {
    const weapons = await getAllWeapons()
    console.log('generateStaticParams - weapons count:', weapons.length)
    
    const params = weapons.map((weapon) => ({
      weaponSlug: weaponNameToSlug(weapon.name)
    }))
    
    console.log('generateStaticParams - first few slugs:', params.slice(0, 3))
    return params
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}