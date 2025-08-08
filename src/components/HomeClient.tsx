'use client'

import { useRouter } from 'next/navigation'
import { useWeaponCategories, useWeapons, useHotWeapons, usePopularBuilds, Weapon as DbWeapon } from '@/hooks'
import type { PopularBuild } from '@/hooks/useBuilds'
import { weaponNameToSlug } from '@/lib/utils'
import WeaponCategoryCard from '@/components/WeaponCategoryCard'
import MostVotedBuilds from '@/components/MostVotedBuilds'
import WeaponSelect from '@/components/WeaponSelect'
import HotWeaponCard from '@/components/HotWeaponCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Toolbar, ToolbarSection } from '@/components/ui/toolbar'

interface CategoryItem { id: string; name: string; weaponCount: number }
interface HotWeapon extends Partial<DbWeapon> { id: string; name: string; weapon_type?: string | null; vocation?: string | null; image_url?: string | null; totalVotes: number }

interface HomeClientProps {
  initialCategories?: CategoryItem[]
  initialHotWeapons?: HotWeapon[]
  initialPopularBuilds?: PopularBuild[]
}

export default function HomeClient({ initialCategories, initialHotWeapons, initialPopularBuilds }: HomeClientProps) {
  const router = useRouter()
  
  // Use initial data for React Query hooks
  const { data: categories, isLoading: categoriesLoading } = useWeaponCategories(initialCategories as CategoryItem[] | undefined)
  const { data: popularBuilds, isLoading: popularBuildsLoading } = usePopularBuilds(10, initialPopularBuilds)
  const { data: weapons } = useWeapons()
  const { data: hotWeapons, isLoading: hotWeaponsLoading } = useHotWeapons(10, initialHotWeapons as any)
  
  // Use server data as fallback if client data is loading
  const categoriesData = (categories || initialCategories || []) as CategoryItem[]
  const popularBuildsData = popularBuilds || initialPopularBuilds || []
  const weaponsData = (weapons || []) as DbWeapon[]
  const hotWeaponsData = (hotWeapons || initialHotWeapons || []) as HotWeapon[]
  const isLoadingCategories = categoriesLoading && !initialCategories
  const isLoadingPopularBuilds = popularBuildsLoading && !initialPopularBuilds
  const isLoadingHotWeapons = hotWeaponsLoading && !initialHotWeapons

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/category/${categoryId}`)
  }

  const handleRandomWeapon = () => {
    if (weaponsData && weaponsData.length > 0) {
      const randomWeapon = weaponsData[Math.floor(Math.random() * weaponsData.length)]
      const weaponSlug = weaponNameToSlug(randomWeapon.name)
      router.push(`/weapon/${weaponSlug}`)
    } else {
      // Fallback to random category if no weapons loaded yet
      if (categoriesData && categoriesData.length > 0) {
        const randomCategory = categoriesData[Math.floor(Math.random() * categoriesData.length)]
        router.push(`/category/${randomCategory.id}`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span style={{ color: '#9146FF' }}>tibia</span><span style={{ color: '#53FC18' }}>vote</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Help the community choose the best perk combinations for every weapon. 
            Vote on your preferred proficiency perks and see what the community thinks!
          </p>
          
          {/* Weapon Selector */}
          <div className="mb-8">
            <WeaponSelect />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleRandomWeapon} className="rounded-full px-8 py-3">🎲 Random Weapon</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="rounded-full px-8 py-3">Quick actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })}>
                  Browse categories
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.getElementById('hot-weapons')?.scrollIntoView({ behavior: 'smooth' })}>
                  See hot weapons
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.getElementById('popular-builds')?.scrollIntoView({ behavior: 'smooth' })}>
                  Most voted builds
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Weapon Categories Grid */}
      <div className="container mx-auto px-4 pb-12" id="categories">

        {isLoadingCategories ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading weapon categories...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {categoriesData?.map((category) => (
              <WeaponCategoryCard
                key={category.id}
                category={category}
                onClick={() => handleCategoryClick(category.id)}
              />
            ))}
          </div>
        )}

        {/* Hot Weapons Section */}
        <div className="mb-12">
          <div className="mb-6">
            <Toolbar>
              <ToolbarSection>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">
                    🔥 <span className="bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">Hot Weapons</span>
                  </h2>
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">Most voted weapons by the community</p>
                </div>
              </ToolbarSection>
            </Toolbar>
          </div>

          {isLoadingHotWeapons ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading hot weapons...</p>
            </div>
          ) : hotWeaponsData && hotWeaponsData.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
              {hotWeaponsData.map((weapon: HotWeapon, index: number) => (
                <HotWeaponCard
                  key={weapon.id}
                  weapon={weapon}
                  rank={index + 1}
                  isHot={true}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center max-w-4xl mx-auto">
              <p className="text-gray-600">No hot weapons available yet. Start voting to see popular weapons!</p>
            </Card>
          )}
        </div>

        {/* Most Voted Builds */}
        <div className="mb-12" id="popular-builds">
          <div className="mb-6">
            <Toolbar>
              <ToolbarSection>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">🏆 Most Voted Builds</h2>
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">Top community builds across all weapons</p>
                </div>
              </ToolbarSection>
            </Toolbar>
          </div>
          {isLoadingPopularBuilds ? (
            <Card className="p-4 md:p-8 text-center max-w-4xl mx-auto">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading most voted builds...</p>
            </Card>
          ) : popularBuildsData && popularBuildsData.length > 0 ? (
            <div className="max-w-6xl mx-auto px-4">
              <MostVotedBuilds builds={popularBuildsData} />
            </div>
          ) : (
            <Card className="p-4 md:p-8 text-center max-w-4xl mx-auto">
              <p className="text-gray-600">No builds available yet. Be the first to create a build!</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}