import { Perk } from '@/lib/mockData'
import { useState } from 'react'
import PerkIcon from './PerkIcon'
import SmartTooltip from './SmartTooltip'

interface PerkSlotProps {
  perk: Perk
  isSelected?: boolean
  onClick?: () => void
  showDescription?: boolean
}

export default function PerkSlot({ perk, isSelected = false, onClick, showDescription = false }: PerkSlotProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const tooltipContent = (
    <div>
      <div className="font-semibold text-yellow-300 mb-1">{perk.perk_name}</div>
      <div className="text-gray-300 text-sm leading-relaxed">{perk.perk_description}</div>
    </div>
  )

  return (
    <div className="relative">
      <SmartTooltip content={tooltipContent} isVisible={showTooltip}>
        {/* Main Perk Container */}
        <div
          className={`
            size-18 cursor-pointer transition-all duration-300 rounded-lg p-1
            ${isSelected 
              ? 'hover:scale-105 border-2 border-yellow-400 shadow-lg shadow-yellow-400/50' 
              : 'grayscale hover:scale-105 hover:grayscale-0 border-2 border-transparent'
            }
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
      </SmartTooltip>

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