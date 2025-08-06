import { getWeaponByName, getWeaponPerks, getAllWeapons } from '@/lib/serverQueries'
import { slugToWeaponName, weaponNameToSlug } from '@/lib/utils'
import WeaponClient from '@/components/WeaponClient'
import { notFound } from 'next/navigation'

interface WeaponPageProps {
  params: { weaponSlug: string }
}

export default async function WeaponPage({ params }: WeaponPageProps) {
  const { weaponSlug } = params
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
      <WeaponClient 
        weaponSlug={weaponSlug}
        initialWeapon={initialWeapon}
        initialPerks={initialPerks}
      />
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