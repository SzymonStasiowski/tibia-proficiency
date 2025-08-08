'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { useWeaponsByCategory, useWeaponCategories } from '@/hooks'
import { weaponNameToSlug } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'

interface CategoryItem {
  id: string
  name: string
  weaponCount: number
}

interface WeaponListItem {
  id: string
  name?: string | null
  vocation?: string | null
  image_url?: string | null
  totalVotes?: number
}

interface CategoryClientProps {
  initialWeapons?: WeaponListItem[]
  initialCategories?: CategoryItem[]
}

export default function CategoryClient({ initialWeapons, initialCategories }: CategoryClientProps) {
  const params = useParams()
  const categoryId = params.categoryId as string
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  const { data: categories } = useWeaponCategories(initialCategories as any)
  const { data: weapons, isLoading: weaponsLoading, error: weaponsError } = useWeaponsByCategory(categoryId, initialWeapons as any)
  
  // Use server data as fallback - prioritize server data since hooks might not be working
  const categoriesData: CategoryItem[] = (initialCategories as CategoryItem[] | undefined) || (categories as CategoryItem[] | undefined) || []
  const rawWeaponsData: WeaponListItem[] = (initialWeapons as WeaponListItem[] | undefined) || (weapons as unknown as WeaponListItem[]) || []
  const isLoadingWeapons = weaponsLoading && !initialWeapons
  
  // Filter and sort weapons
  const weaponsData: WeaponListItem[] = useMemo(() => {
    let filtered: WeaponListItem[] = [...rawWeaponsData]
    
    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      filtered = filtered.filter((weapon: WeaponListItem) => 
        (weapon.name || '').toLowerCase().includes(query) ||
        (weapon.vocation || '').toLowerCase().includes(query)
      )
    }
    
    // Sort by total votes (descending), then by name
    return filtered.sort((a: WeaponListItem, b: WeaponListItem) => {
      const votesA = a.totalVotes || 0
      const votesB = b.totalVotes || 0
      
      if (votesA !== votesB) {
        return votesB - votesA // Descending by votes
      }
      
      return (a.name || '').localeCompare(b.name || '') // Ascending by name as tiebreaker
    })
  }, [rawWeaponsData, debouncedSearchQuery])
  

  
  const category = categoriesData?.find(cat => cat.id === categoryId)
  
  // Helper function to get weapon style (same as in WeaponCategoryCard)
  const getWeaponStyle = (name: string) => {
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes('sword')) {
      return { icon: '⚔️', textColor: 'text-red-600 dark:text-red-400' }
    }
    if (lowerName.includes('axe')) {
      return { icon: '🪓', textColor: 'text-orange-600 dark:text-orange-400' }
    }
    if (lowerName.includes('club')) {
      return { icon: '🔨', textColor: 'text-yellow-600 dark:text-yellow-400' }
    }
    if (lowerName.includes('distance')) {
      return { icon: '🏹', textColor: 'text-green-600 dark:text-green-400' }
    }
    if (lowerName.includes('crossbow')) {
      return { icon: '🎯', textColor: 'text-purple-600 dark:text-purple-400' }
    }
    if (lowerName.includes('wand')) {
      return { icon: '✨', textColor: 'text-blue-600 dark:text-blue-400' }
    }
    if (lowerName.includes('rod')) {
      return { icon: '🔮', textColor: 'text-indigo-600 dark:text-indigo-400' }
    }
    if (lowerName.includes('spear')) {
      return { icon: '🗡️', textColor: 'text-pink-600 dark:text-pink-400' }
    }
    
    return { icon: '⚔️', textColor: 'text-gray-600 dark:text-gray-400' }
  }

  if (!category && categoriesData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category not found</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  const style = getWeaponStyle(category.name)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">{style.icon}</div>
          <h1 className={`text-4xl font-bold mb-4 ${style.textColor}`}>
            {category.name}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
            {category.weaponCount} weapons available
          </p>
          <Link 
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
          >
            ← Back to Categories
          </Link>
        </div>

        {/* Search Filter */}
        <div className="mb-8 max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search weapons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          {debouncedSearchQuery.trim() && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
              Showing {weaponsData.length} weapons matching "{debouncedSearchQuery}"
            </p>
          )}
        </div>



        {/* Weapons Grid */}
        {isLoadingWeapons ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading weapons...</p>
          </div>
        ) : weaponsError ? (
          <div className="text-center py-12">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-8 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">Failed to load weapons</h3>
              <p className="text-sm text-red-600 dark:text-red-400">
                {weaponsError.message || 'An error occurred while loading weapons'}
              </p>
            </div>
          </div>
        ) : (weaponsData && weaponsData.length > 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {weaponsData.map((weapon, index) => {
              // Top 5 weapons get gold borders
              const isTop5 = index < 5
              const borderStyle = isTop5 
                ? 'border-2 border-amber-400 dark:border-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30'
                : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              
              return (
                <Link 
                  key={weapon.id}
                  href={`/weapon/${weaponNameToSlug(weapon.name || '')}`}
                  className="block"
                >
                  <div className={`${borderStyle} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 relative`}>
                    {/* Top 5 indicator */}
                    {isTop5 && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        🔥 #{index + 1}
                      </div>
                    )}
                  <div className="text-center">
                    {weapon.image_url ? (
                      <img 
                        src={weapon.image_url as string} 
                        alt={weapon.name || 'Weapon'}
                        className="w-16 h-16 mx-auto mb-4 object-contain"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            const fallback = document.createElement('div')
                            fallback.textContent = '⚔️'
                            fallback.className = 'text-4xl mb-4'
                            parent.insertBefore(fallback, target)
                          }
                        }}
                      />
                    ) : (
                      <div className="text-4xl mb-4">⚔️</div>
                    )}
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                      {weapon.name}
                    </h3>
                    <div className="space-y-1">
                      {weapon.vocation && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {weapon.vocation}
                        </p>
                      )}
                      <div className="flex items-center justify-center gap-1 text-xs">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className={isTop5 ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-blue-600 dark:text-blue-400'}>
                          {weapon.totalVotes || 0} votes
                        </span>
                      </div>
                    </div>
                  </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No weapons found</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No weapons are available in this category yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}