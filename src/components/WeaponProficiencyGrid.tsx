import { Weapon } from '@/hooks/useWeapons'
import { Perk as DatabasePerk } from '@/hooks/usePerks'
// Removed legacy PerkSlot (mockData-based)
import PerkIcon from './PerkIcon'
import SmartTooltip from './SmartTooltip'
import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Toolbar, ToolbarSection } from '@/components/ui/toolbar'

// Database Perk Slot Component
interface DatabasePerkSlotProps {
  perk: DatabasePerk
  isSelected?: boolean
  onClick?: () => void
  percentage?: number
  showPercentage?: boolean
}

function DatabasePerkSlot({ perk, isSelected = false, onClick, percentage = 0, showPercentage = false }: DatabasePerkSlotProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const tooltipContent = (
    <div>
      <div className="font-semibold text-yellow-300 mb-1">{perk.name}</div>
      <div className="text-gray-300 text-sm leading-relaxed mb-2">{perk.description}</div>
      <div className="text-xs text-gray-500 border-t border-gray-700 pt-1">{perk.vote_count} votes</div>
    </div>
  )

  return (
    <div className="relative flex justify-center">
      <SmartTooltip content={tooltipContent} isVisible={showTooltip}>
        {/* Main Perk Container */}
        <div
          className={`
            relative w-20 h-20 cursor-pointer flex justify-center items-center transition-all duration-300 rounded-lg p-1
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
            iconUrl={perk.main_icon_url || ''}
            altText={perk.name}
            overlayIcon={perk.type_icon_url}
          />
          
          {/* Percentage Overlay */}
          {showPercentage && (
            <Badge className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[10px] leading-none">
              {percentage}%
            </Badge>
          )}
        </div>
      </SmartTooltip>
    </div>
  )
}

// Mobile Perk Option Component with labels instead of tooltips
interface MobilePerkOptionProps {
  perk: DatabasePerk
  isSelected?: boolean
  onClick?: () => void
  percentage?: number
  showPercentage?: boolean
}

function MobilePerkOption({ perk, isSelected = false, onClick, percentage = 0, showPercentage = false }: MobilePerkOptionProps) {
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 ${
        isSelected 
          ? 'bg-yellow-400/10 border-2 border-yellow-400 shadow-lg shadow-yellow-400/20' 
          : 'bg-gray-600 border border-gray-500 hover:bg-gray-500'
      }`}
      onClick={onClick}
    >
      {/* Perk Icon */}
      <div className={`flex-shrink-0 ${isSelected ? '' : 'grayscale'}`}>
        <PerkIcon
          iconUrl={perk.main_icon_url || ''}
          altText={perk.name}
          overlayIcon={perk.type_icon_url}
          size="large"
        />
      </div>
      
      {/* Perk Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-yellow-300 text-sm">{perk.name}</div>
          {showPercentage && (
            <Badge className="text-[10px] leading-none px-2 py-0.5">
              {percentage}%
            </Badge>
          )}
        </div>
        <div className="text-gray-300 text-xs leading-relaxed">{perk.description}</div>
        <div className="text-xs text-gray-500 mt-1">{perk.vote_count} votes</div>
      </div>
    </div>
  )
}

interface WeaponProficiencyGridProps {
  weapon: Weapon
  perks: DatabasePerk[]
  onPerkSelect?: (perkId: string) => void
  selectedPerks?: string[] // Array of perk IDs
  votes?: { selected_perks?: string[] }[] // Array of all votes for percentage calculation
}

export default function WeaponProficiencyGrid({ 
  weapon, 
  perks,
  onPerkSelect, 
  selectedPerks = [],
  votes = []
}: WeaponProficiencyGridProps) {
  // Group perks by tier level (1-7 slots)
  const perksByTier = perks.reduce((acc, perk) => {
    const tier = perk.tier_level
    if (!acc[tier]) {
      acc[tier] = []
    }
    acc[tier].push(perk)
    return acc
  }, {} as Record<number, DatabasePerk[]>)

  // Calculate percentages for each perk
  const perkPercentages = useMemo<Record<string, number>>(() => {
    if (!votes.length) return {}
    
    // Count votes for each perk
    const perkVoteCounts = votes.reduce((acc, vote) => {
      if (vote.selected_perks && Array.isArray(vote.selected_perks)) {
        vote.selected_perks.forEach((perkId: string) => {
          acc[perkId] = (acc[perkId] || 0) + 1
        })
      }
      return acc
    }, {} as Record<string, number>)

    // Calculate percentages by tier
    const percentages: Record<string, number> = {}
    Object.entries(perksByTier).forEach(([tierStr, tierPerks]) => {
      const totalTierVotes = tierPerks.reduce((sum, perk) => {
        return sum + (perkVoteCounts[perk.id] || 0)
      }, 0)
      
      tierPerks.forEach((perk) => {
        const voteCount = perkVoteCounts[perk.id] || 0
        percentages[perk.id] = totalTierVotes > 0 ? Math.round((voteCount / totalTierVotes) * 100) : 0
      })
    })
    
    return percentages
  }, [votes, perksByTier])

  const handlePerkClick = (perkId: string) => {
    onPerkSelect?.(perkId)
  }

  return (
    <Card className="p-0">
      <CardHeader className="pb-2">
        <Toolbar>
          <ToolbarSection>
            <PerkIcon
              iconUrl={weapon.image_url || ''}
              altText={weapon.name}
              className="p-1"
            />
            <div>
              <CardTitle className="text-xl md:text-2xl">{weapon.name}</CardTitle>
              <CardDescription>{weapon.weapon_type}</CardDescription>
              <p className="text-sm text-gray-500">{perks.length} perks available across {Object.keys(perksByTier).length} tiers</p>
            </div>
          </ToolbarSection>
        </Toolbar>
      </CardHeader>
      <CardContent className="pt-2">

      {/* Mobile Layout */}
      <div className="block md:hidden">
        {Array.from({ length: 7 }, (_, slotIndex) => {
          const tier = slotIndex
          const tierPerks = perksByTier[tier] || []
          
          if (tierPerks.length === 0) return null
          
          return (
            <div key={slotIndex} className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-3 text-center">
                Slot {slotIndex + 1}
              </h3>
              <div className="space-y-3">
                {tierPerks.map((perk) => (
                  <MobilePerkOption
                    key={perk.id}
                    perk={perk}
                    isSelected={selectedPerks.includes(perk.id)}
                    onClick={() => handlePerkClick(perk.id)}
                    percentage={perkPercentages[perk.id] || 0}
                    showPercentage={tierPerks.length > 1 && votes.length > 0}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        {/* Slot Numbers Row */}
        <div className="grid grid-cols-7 gap-4 mb-4">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="text-center">
              <Badge className="px-3 py-1 font-bold">{i + 1}</Badge>
            </div>
          ))}
        </div>

        {/* Perk Slots Grid */}
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 7 }, (_, slotIndex) => {
            const tier = slotIndex // Database tiers are 0-indexed, slots are 0-6 displayed as 1-7
            const tierPerks = perksByTier[tier] || []
            
            return (
              <div key={slotIndex} className="space-y-2">
                {tierPerks.length > 0 ? (
                  tierPerks.map((perk) => (
                    <DatabasePerkSlot
                      key={perk.id}
                      perk={perk}
                      isSelected={selectedPerks.includes(perk.id)}
                      onClick={() => handlePerkClick(perk.id)}
                      percentage={perkPercentages[perk.id] || 0}
                      showPercentage={tierPerks.length > 1 && votes.length > 0}
                    />
                  ))
                ) : (
                  // Empty slot
                  <Skeleton className="w-16 h-16 rounded" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Perks Summary */}
      {selectedPerks.length > 0 && (
        <div className="mt-6 p-3 md:p-4 bg-gray-700 rounded border border-gray-600">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3">Your Selected Build:</h3>
          <div className="space-y-2 md:space-y-3">
            {selectedPerks.map((perkId) => {
              const perk = perks.find(p => p.id === perkId)
              
              if (!perk) return null
              
              return (
                <div key={perkId} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <Badge className="w-fit">Slot {perk.tier_level + 1}</Badge>
                  <div className="flex-1 min-w-0">
                    <span className="text-yellow-300 font-medium text-sm md:text-base block sm:inline">
                      {perk.name}
                    </span>
                    <span className="text-gray-400 text-xs md:text-sm block sm:inline sm:ml-2 leading-relaxed">
                      {perk.description}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      </CardContent>
    </Card>
  )
} 