import { WeaponCategory } from '@/lib/mockData'

interface WeaponCategoryCardProps {
  category: WeaponCategory
  onClick?: () => void
}

export default function WeaponCategoryCard({ category, onClick }: WeaponCategoryCardProps) {
  return (
    <div 
      className={`
        ${category.bgColor} 
        border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 
        hover:scale-105 hover:shadow-lg
      `}
      onClick={onClick}
    >
      <div className="text-center">
        <div className="text-4xl mb-3">{category.icon}</div>
        <h3 className={`text-xl font-bold ${category.color} mb-2`}>
          {category.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
          {category.weaponCount} weapons
        </p>
        <span className="inline-block bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
          {category.badge}
        </span>
      </div>
    </div>
  )
} 