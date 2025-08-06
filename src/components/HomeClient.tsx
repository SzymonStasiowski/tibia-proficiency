'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWeaponCategories, useCommunityStats, useWeapons } from '@/hooks'
import { weaponNameToSlug } from '@/lib/utils'
import WeaponCategoryCard from '@/components/WeaponCategoryCard'
import CommunityStats from '@/components/CommunityStats'
import DonationCard from '@/components/DonationCard'
import WeaponSelect from '@/components/WeaponSelect'

interface HomeClientProps {
  initialCategories?: any[]
  initialStats?: any
}

export default function HomeClient({ initialCategories, initialStats }: HomeClientProps) {
  const router = useRouter()
  
  // Use initial data for React Query hooks
  const { data: categories, isLoading: categoriesLoading } = useWeaponCategories(initialCategories)
  const { data: stats, isLoading: statsLoading } = useCommunityStats()
  const { data: weapons, isLoading: weaponsLoading } = useWeapons()
  
  // Use server data as fallback if client data is loading
  const categoriesData = categories || initialCategories || []
  const statsData = stats || initialStats
  const weaponsData = weapons || []
  const isLoadingCategories = categoriesLoading && !initialCategories
  const isLoadingStats = statsLoading && !initialStats

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
      <div className="container mx-auto px-4 pt-12 pb-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-purple-500">tibia</span><span className="text-cyan-500">vote</span>
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
            <button 
              onClick={handleRandomWeapon}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-semibold transition-colors shadow-lg"
            >
              🎲 Random Weapon
            </button>
          </div>
        </div>
      </div>

      {/* Weapon Categories Grid */}
      <div className="container mx-auto px-4 pb-12">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-200">
          Choose Your Weapon Type
        </h2>
        
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

        {/* Community Stats and Donation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2">
            {isLoadingStats ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading community stats...</p>
              </div>
            ) : statsData ? (
              <CommunityStats stats={statsData} />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg text-center">
                <p className="text-gray-600">Unable to load community stats</p>
              </div>
            )}
          </div>
          <div>
            <DonationCard />
          </div>
        </div>
      </div>
    </div>
  )
}