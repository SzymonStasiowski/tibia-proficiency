import { Perk } from '@/lib/mockData'
import { useState } from 'react'
import PerkIcon from './PerkIcon'

interface PerkSlotProps {
  perk: Perk
  isSelected?: boolean
  onClick?: () => void
  showDescription?: boolean
}

export default function PerkSlot({ perk, isSelected = false, onClick, showDescription = false }: PerkSlotProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      {/* Main Perk Container */}
      <div
        className={`
          relative w-16 h-16 cursor-pointer transition-all duration-300
          ${isSelected ? 'hover:scale-105' : 'grayscale hover:scale-105 hover:grayscale-0'}
        `}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Main Icon with Fallback */}
        <PerkIcon
          iconUrl={perk.main_icon_url}
          altText={perk.perk_name}
          overlayIcon={perk.type_icon_url}
        />
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg border border-gray-700 whitespace-nowrap shadow-lg">
          <div className="font-semibold text-yellow-300">{perk.perk_name}</div>
          <div className="text-gray-300">{perk.perk_description}</div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}

      {/* Description below (if enabled) */}
      {showDescription && (
        <div className="mt-2 text-center">
          <div className="text-xs font-semibold text-gray-200">{perk.perk_name}</div>
          <div className="text-xs text-gray-400 mt-1">{perk.perk_description}</div>
        </div>
      )}
    </div>
  )
} 