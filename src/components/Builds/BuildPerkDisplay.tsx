'use client'

import { useState } from 'react'
import PerkIcon from '@/components/PerkIcon'
import SmartTooltip from '@/components/SmartTooltip'

interface DatabasePerk {
  id: string
  name: string
  description: string
  main_icon_url: string
  type_icon_url?: string
}

interface BuildPerkDisplayProps {
  selectedPerkIds: string[]
  perks: DatabasePerk[]
  maxDisplay?: number
}

interface SmallPerkSlotProps {
  perk: DatabasePerk
}

function SmallPerkSlot({ perk }: SmallPerkSlotProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const tooltipContent = (
    <div>
      <div className="font-semibold text-yellow-300 mb-1">{perk.name}</div>
      <div className="text-gray-300 text-sm leading-relaxed">{perk.description}</div>
    </div>
  )

  return (
    <SmartTooltip content={tooltipContent} isVisible={showTooltip}>
      <div
        className="w-8 h-8 cursor-pointer transition-all duration-200 rounded hover:scale-110"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <PerkIcon
          iconUrl={perk.main_icon_url}
          altText={perk.name}
          overlayIcon={perk.type_icon_url}
          size="medium"
        />
      </div>
    </SmartTooltip>
  )
}

export default function BuildPerkDisplay({ selectedPerkIds, perks, maxDisplay = 7 }: BuildPerkDisplayProps) {
  // Filter perks to only show selected ones
  const selectedPerks = perks.filter(perk => selectedPerkIds.includes(perk.id))
  
  // Limit display to maxDisplay number of perks
  const displayPerks = selectedPerks.slice(0, maxDisplay)
  const remainingCount = selectedPerks.length - displayPerks.length

  if (displayPerks.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No perks selected
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {/* Display perk icons */}
      <div className="flex items-center gap-1">
        {displayPerks.map((perk) => (
          <SmallPerkSlot key={perk.id} perk={perk} />
        ))}
      </div>
      
      {/* Show remaining count if there are more perks */}
      {remainingCount > 0 && (
        <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
          +{remainingCount}
        </div>
      )}
      
      {/* Show total count */}
      <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
        {selectedPerks.length} perk{selectedPerks.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}