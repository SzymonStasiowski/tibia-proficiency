interface Category {
  id: string
  name: string
  weaponCount: number
}

interface WeaponCategoryCardProps {
  category: Category
  onClick?: () => void
}

export default function WeaponCategoryCard({ category, onClick }: WeaponCategoryCardProps) {
  // Enhanced styling based on weapon type
  const getWeaponStyle = (name: string) => {
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes('sword')) {
      return {
        icon: '⚔️',
        bgColor: 'bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:border-red-800',
        textColor: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300'
      }
    }
    if (lowerName.includes('axe')) {
      return {
        icon: '🪓',
        bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 dark:border-orange-800',
        textColor: 'text-orange-600 dark:text-orange-400',
        badge: 'bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300'
      }
    }
    if (lowerName.includes('club')) {
      return {
        icon: '🔨',
        bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 dark:border-yellow-800',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300'
      }
    }
    if (lowerName.includes('distance')) {
      return {
        icon: '🏹',
        bgColor: 'bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:border-green-800',
        textColor: 'text-green-600 dark:text-green-400',
        badge: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300'
      }
    }
    if (lowerName.includes('crossbow')) {
      return {
        icon: '🎯',
        bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 dark:border-purple-800',
        textColor: 'text-purple-600 dark:text-purple-400',
        badge: 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300'
      }
    }
    if (lowerName.includes('wand')) {
      return {
        icon: '✨',
        bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:border-blue-800',
        textColor: 'text-blue-600 dark:text-blue-400',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300'
      }
    }
    if (lowerName.includes('rod')) {
      return {
        icon: '🔮',
        bgColor: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 dark:border-indigo-800',
        textColor: 'text-indigo-600 dark:text-indigo-400',
        badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300'
      }
    }
    if (lowerName.includes('fist')) {
      return {
        icon: '👊',
        bgColor: 'bg-pink-50 hover:bg-pink-100 border-pink-200 dark:bg-pink-900/20 dark:hover:bg-pink-900/30 dark:border-pink-800',
        textColor: 'text-pink-600 dark:text-pink-400',
        badge: 'bg-pink-100 text-pink-700 dark:bg-pink-800 dark:text-pink-300'
      }
    }
    
    // Default style
    return {
      icon: '⚔️',
      bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600',
      textColor: 'text-gray-600 dark:text-gray-400',
      badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const style = getWeaponStyle(category.name)

  return (
    <div 
      className={`${style.bgColor} border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg`}
      onClick={onClick}
    >
      <div className="text-center">
        <div className="text-4xl mb-3">{style.icon}</div>
        <h3 className={`text-xl font-bold ${style.textColor} mb-2`}>
          {category.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
          {category.weaponCount} weapons
        </p>
        <span className={`inline-block ${style.badge} px-3 py-1 rounded-full text-xs font-medium shadow-sm`}>
          Available
        </span>
      </div>
    </div>
  )
} 