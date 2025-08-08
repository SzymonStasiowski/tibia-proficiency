import Link from 'next/link'
import Image from 'next/image'
import { getImageFromRecord, asDisplayUrl } from '@/lib/images'
import { weaponNameToSlug } from '@/lib/utils'

interface HotWeapon {
  id: string
  name: string
  weapon_type?: string | null
  vocation?: string | null
  image_url?: string | null
  media?: { id: string; storage_path: string } | null
  totalVotes: number
}

interface HotWeaponCardProps {
  weapon: HotWeapon
  rank: number
  isHot?: boolean
}

export default function HotWeaponCard({ weapon, rank, isHot = true }: HotWeaponCardProps) {
  // Get weapon style based on weapon type
  const getWeaponStyle = (weaponType: string) => {
    const lowerType = weaponType?.toLowerCase() || ''
    
    if (lowerType.includes('sword')) {
      return { icon: '⚔️', textColor: 'text-red-600 dark:text-red-400' }
    }
    if (lowerType.includes('axe')) {
      return { icon: '🪓', textColor: 'text-orange-600 dark:text-orange-400' }
    }
    if (lowerType.includes('club')) {
      return { icon: '🔨', textColor: 'text-yellow-600 dark:text-yellow-400' }
    }
    if (lowerType.includes('distance')) {
      return { icon: '🏹', textColor: 'text-green-600 dark:text-green-400' }
    }
    if (lowerType.includes('crossbow')) {
      return { icon: '🎯', textColor: 'text-purple-600 dark:text-purple-400' }
    }
    if (lowerType.includes('wand')) {
      return { icon: '✨', textColor: 'text-blue-600 dark:text-blue-400' }
    }
    if (lowerType.includes('rod')) {
      return { icon: '🔮', textColor: 'text-indigo-600 dark:text-indigo-400' }
    }
    if (lowerType.includes('spear')) {
      return { icon: '🗡️', textColor: 'text-pink-600 dark:text-pink-400' }
    }
    
    return { icon: '⚔️', textColor: 'text-gray-600 dark:text-gray-400' }
  }

  const style = getWeaponStyle(weapon.weapon_type || '')
  
  // Golden border styles for hot weapons
  const borderStyle = isHot 
    ? 'border-2 border-amber-400 dark:border-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30'
    : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'

  return (
    <Link 
      href={`/weapon/${weaponNameToSlug(weapon.name)}`}
      className="block"
    >
      <div className={`${borderStyle} rounded-xl p-4 hover:shadow-xl transition-all duration-200 hover:scale-105 relative`}>
        {/* Hot indicator */}
        {isHot && (
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            🔥 #{rank}
          </div>
        )}
        
        <div className="text-center">
          {(() => {
            const raw = getImageFromRecord({ media: (weapon as any).media || null, legacyUrl: weapon.image_url || undefined })
            const url = asDisplayUrl(raw)
            return url ? (
              <Image 
                src={url} 
                alt={weapon.name}
                width={48}
                height={48}
                className="w-12 h-12 mx-auto mb-3 object-contain"
                unoptimized
              />
            ) : (
              <div className="text-3xl mb-3">{style.icon}</div>
            )
          })()}
          
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1 line-clamp-2">
            {weapon.name}
          </h3>
          
          <div className="space-y-1">
            {weapon.vocation && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {weapon.vocation}
              </p>
            )}
            <div className="flex items-center justify-center gap-1 text-xs">
              <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className={isHot ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-blue-600 dark:text-blue-400'}>
                {weapon.totalVotes} votes
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}