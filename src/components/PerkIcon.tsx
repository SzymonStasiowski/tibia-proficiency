import { useState } from 'react'

interface PerkIconProps {
  iconUrl: string
  altText: string
  size?: 'small' | 'large'
  overlayIcon?: string | null
  className?: string
}

export default function PerkIcon({ 
  iconUrl, 
  altText, 
  size = 'large', 
  overlayIcon, 
  className = '' 
}: PerkIconProps) {
  const [imageError, setImageError] = useState(false)
  const [overlayError, setOverlayError] = useState(false)

  // Create a fallback icon based on perk name
  const getFallbackIcon = (name: string) => {
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes('defence') || lowerName.includes('defense')) {
      return '🛡️'
    } else if (lowerName.includes('damage') || lowerName.includes('attack')) {
      return '⚔️'
    } else if (lowerName.includes('critical')) {
      return '⚡'
    } else if (lowerName.includes('life') || lowerName.includes('heal')) {
      return '❤️'
    } else if (lowerName.includes('mana')) {
      return '💙'
    } else if (lowerName.includes('club')) {
      return '🔨'
    } else if (lowerName.includes('sword')) {
      return '⚔️'
    } else if (lowerName.includes('distance')) {
      return '🏹'
    } else {
      return '✨'
    }
  }

  const sizeClasses = size === 'small' ? 'w-4 h-4' : 'w-16 h-16'
  const iconSize = size === 'small' ? 'text-xs' : 'text-2xl'

  return (
    <div className={`relative ${sizeClasses} ${className}`}>
      {!imageError ? (
        <img
          src={iconUrl}
          alt={altText}
          className="w-full h-full object-cover rounded bg-gray-700 border border-gray-600"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : (
        // Fallback game-like icon
        <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 border border-gray-500 rounded flex items-center justify-center shadow-inner">
          <span className={`${iconSize} filter drop-shadow-sm`}>
            {getFallbackIcon(altText)}
          </span>
        </div>
      )}
      
      {/* Overlay Icon */}
      {overlayIcon && !overlayError && (
        <div className="absolute top-0 right-0 w-4 h-4 bg-gray-800 border border-gray-500 rounded-sm overflow-hidden">
          <img
            src={overlayIcon}
            alt="Type indicator"
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={() => setOverlayError(true)}
          />
        </div>
      )}
      
      {/* Fallback overlay if overlay image fails */}
      {overlayIcon && overlayError && (
        <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-600 border border-yellow-500 rounded-sm flex items-center justify-center">
          <span className="text-xs">⭐</span>
        </div>
      )}
    </div>
  )
} 