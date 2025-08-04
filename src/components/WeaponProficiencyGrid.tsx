import { Weapon, Perk } from '@/lib/mockData'
import PerkSlot from './PerkSlot'
import PerkIcon from './PerkIcon'
import { useState } from 'react'

interface WeaponProficiencyGridProps {
  weapon: Weapon
  onPerkSelect?: (slotIndex: number, perkIndex: number) => void
  selectedPerks?: { [slotIndex: number]: number } // slotIndex -> perkIndex
}

export default function WeaponProficiencyGrid({ 
  weapon, 
  onPerkSelect, 
  selectedPerks = {} 
}: WeaponProficiencyGridProps) {
  const [localSelectedPerks, setLocalSelectedPerks] = useState<{ [slotIndex: number]: number }>(selectedPerks)

  const handlePerkClick = (slotIndex: number, perkIndex: number) => {
    const newSelection = { ...localSelectedPerks }
    
    // If clicking the same perk, deselect it
    if (newSelection[slotIndex] === perkIndex) {
      delete newSelection[slotIndex]
    } else {
      newSelection[slotIndex] = perkIndex
    }
    
    setLocalSelectedPerks(newSelection)
    onPerkSelect?.(slotIndex, perkIndex)
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <PerkIcon
          iconUrl={weapon.image_url}
          altText={weapon.name}
          className="p-1"
        />
        <div>
          <h2 className="text-2xl font-bold text-white">{weapon.name}</h2>
          <p className="text-gray-400">{weapon.weapon_type}</p>
          <p className="text-sm text-gray-500">{weapon.proficiency_perks_by_slot.length} perk slots available</p>
        </div>
      </div>

      {/* Slot Numbers Row */}
      <div className="grid grid-cols-7 gap-4 mb-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="text-center">
            <div className="bg-gray-600 border border-gray-500 rounded px-3 py-1 text-white font-bold">
              {i + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Perk Slots Grid */}
      <div className="grid grid-cols-7 gap-4">
        {Array.from({ length: 7 }, (_, slotIndex) => {
          const slotPerks = weapon.proficiency_perks_by_slot[slotIndex] || []
          
          return (
            <div key={slotIndex} className="space-y-2">
              {slotPerks.length > 0 ? (
                slotPerks.map((perk, perkIndex) => (
                  <PerkSlot
                    key={`${slotIndex}-${perkIndex}`}
                    perk={perk}
                    isSelected={localSelectedPerks[slotIndex] === perkIndex}
                    onClick={() => handlePerkClick(slotIndex, perkIndex)}
                  />
                ))
              ) : (
                // Empty slot
                <div className="w-16 h-16 bg-gray-600 border border-gray-500 rounded opacity-50"></div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected Perks Summary */}
      {Object.keys(localSelectedPerks).length > 0 && (
        <div className="mt-6 p-4 bg-gray-700 rounded border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-3">Your Selected Build:</h3>
          <div className="space-y-2">
            {Object.entries(localSelectedPerks).map(([slotIndex, perkIndex]) => {
              const slot = parseInt(slotIndex)
              const perk = weapon.proficiency_perks_by_slot[slot]?.[perkIndex]
              
              if (!perk) return null
              
              return (
                <div key={slotIndex} className="flex items-center gap-3 text-sm">
                  <span className="bg-gray-600 px-2 py-1 rounded text-xs font-bold">
                    Slot {slot + 1}
                  </span>
                  <span className="text-yellow-300 font-medium">{perk.perk_name}</span>
                  <span className="text-gray-400">{perk.perk_description}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
} 