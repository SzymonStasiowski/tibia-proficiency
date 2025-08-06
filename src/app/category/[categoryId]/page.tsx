'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useWeaponsByCategory, useWeaponCategories } from '@/hooks'
import { weaponNameToSlug } from '@/lib/utils'

export default function CategoryPage() {
  const params = useParams()
  const categoryId = params.categoryId as string
  
  const { data: categories } = useWeaponCategories()
  const { data: weapons, isLoading: weaponsLoading, error: weaponsError } = useWeaponsByCategory(categoryId)
  
  const category = categories?.find(cat => cat.id === categoryId)
  
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

  if (!category && categories) {
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

        {/* Weapons Grid */}
        {weaponsLoading ? (
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
        ) : weapons && weapons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {weapons.map((weapon) => (
              <Link 
                key={weapon.id}
                href={`/weapon/${weaponNameToSlug(weapon.name)}`}
                className="block"
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 hover:scale-105">
                  <div className="text-center">
                    {weapon.image_url ? (
                      <img 
                        src={weapon.image_url} 
                        alt={weapon.name}
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
                    {weapon.vocation && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {weapon.vocation}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
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