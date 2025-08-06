'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWeaponByName, useWeaponPerks, useSubmitVote, useUserSession } from '@/hooks'
import { slugToWeaponName } from '@/lib/utils'
import WeaponProficiencyGrid from '@/components/WeaponProficiencyGrid'
import { useState } from 'react'

interface WeaponClientProps {
  weaponSlug: string
  initialWeapon?: any
  initialPerks?: any[]
}

export default function WeaponClient({ weaponSlug, initialWeapon, initialPerks }: WeaponClientProps) {
  const router = useRouter()
  const weaponName = slugToWeaponName(weaponSlug)
  
  const { data: weapon, isLoading: weaponLoading, error: weaponError } = useWeaponByName(weaponName, initialWeapon)
  const { data: perks, isLoading: perksLoading } = useWeaponPerks(weapon?.id || '', initialPerks)
  const submitVoteMutation = useSubmitVote()
  const userSession = useUserSession()
  
  // Use server data as fallback
  const weaponData = weapon || initialWeapon
  const perksData = perks || initialPerks || []
  const isLoadingWeapon = weaponLoading && !initialWeapon
  const isLoadingPerks = perksLoading && !initialPerks
  
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]) // Array of perk IDs
  const [hasVoted, setHasVoted] = useState(false)
  
  // Calculate if all slots are filled
  const availableTiers = perksData ? [...new Set(perksData.map(perk => perk.tier_level))] : []
  const selectedTiers = perksData ? [...new Set(selectedPerks.map(perkId => {
    const perk = perksData.find(p => p.id === perkId)
    return perk?.tier_level
  }).filter(tier => tier !== undefined))] : []
  const allSlotsFilled = availableTiers.length > 0 && selectedTiers.length === availableTiers.length

  if (isLoadingWeapon || isLoadingPerks) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading weapon data...</p>
        </div>
      </div>
    )
  }
  
  if (weaponError || !weaponData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">
            {weaponError ? 'Error loading weapon' : 'Weapon not found'}
          </h1>
          <p className="text-gray-400 mb-4">
            {weaponError?.message || 'The weapon you are looking for does not exist.'}
          </p>
          <Link href="/" className="text-blue-400 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const handlePerkSelect = (perkId: string) => {
    if (!perksData) return
    
    const selectedPerk = perksData.find(p => p.id === perkId)
    if (!selectedPerk) return
    
    setSelectedPerks(current => {
      // If perk is already selected, remove it
      if (current.includes(perkId)) {
        return current.filter(id => id !== perkId)
      }
      
      // Remove any other perk from the same tier/slot before adding this one
      const filteredPerks = current.filter(id => {
        const perk = perksData.find(p => p.id === id)
        return perk && perk.tier_level !== selectedPerk.tier_level
      })
      
      // Add the new perk
      return [...filteredPerks, perkId]
    })
  }

  const handleSubmitVote = async () => {
    if (!perksData) return
    
    // Get unique tier levels from available perks
    const availableTiers = [...new Set(perksData.map(perk => perk.tier_level))].sort()
    
    // Check if user has selected a perk for each available tier
    const selectedTiers = [...new Set(selectedPerks.map(perkId => {
      const perk = perksData.find(p => p.id === perkId)
      return perk?.tier_level
    }).filter(tier => tier !== undefined))].sort()
    
    if (selectedTiers.length !== availableTiers.length) {
      const missingSlots = availableTiers.filter(tier => !selectedTiers.includes(tier))
      const slotNumbers = missingSlots.map(tier => tier + 1).join(', ')
      alert(`Please select a perk for all slots before voting!\nMissing slots: ${slotNumbers}`)
      return
    }
    
    try {
      await submitVoteMutation.mutateAsync({
        weapon_id: weaponData!.id,
        selected_perks: selectedPerks,
        userSession
      })
      
      setHasVoted(true)
      alert(`Thank you for voting! Your build has been submitted for ${weaponData.name}.`)
    } catch (error) {
      console.error('Error submitting vote:', error)
      alert('Failed to submit vote. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="text-blue-400 hover:text-blue-300 transition-colors p-2 hover:bg-gray-700 rounded"
              >
                ←
              </button>
              <div className="w-px h-6 bg-gray-600"></div>
              <h1 className="text-xl font-bold">Weapon Proficiency Builder</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => weaponData.name && window.open(`https://tibia.fandom.com/wiki/${weaponData.name.replace(/ /g, '_')}`, '_blank')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded transition-colors text-sm"
              >
                🔗 Tibia Wiki
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Weapon Proficiency Grid */}
          {perksData && perksData.length > 0 ? (
            <WeaponProficiencyGrid
              weapon={weaponData}
              perks={perksData}
              onPerkSelect={handlePerkSelect}
              selectedPerks={selectedPerks}
            />
          ) : (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6 text-center">
              <p className="text-gray-400">No perks available for this weapon yet.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={handleSubmitVote}
              disabled={hasVoted || !allSlotsFilled || submitVoteMutation.isPending}
              className={`
                px-8 py-3 rounded-lg font-semibold transition-all duration-200
                ${hasVoted 
                  ? 'bg-green-600 text-white cursor-not-allowed' 
                  : allSlotsFilled
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-black hover:scale-105 shadow-lg disabled:opacity-50'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {submitVoteMutation.isPending 
                ? '⏳ Submitting...'
                : hasVoted 
                  ? '✅ Vote Submitted!' 
                  : allSlotsFilled
                    ? '🗳️ Submit Your Vote'
                    : `🗳️ Fill All Slots (${selectedTiers.length}/${availableTiers.length})`
              }
            </button>
            
            <button
              onClick={() => setSelectedPerks([])}
              disabled={selectedPerks.length === 0}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors"
            >
              🔄 Clear Selection
            </button>
          </div>

          {/* Subtle Donation Note */}
          {hasVoted && (
            <div className="mt-8 text-center">
              <div className="inline-block bg-yellow-900/20 border border-yellow-800 rounded-lg px-6 py-3 max-w-md">
                <p className="text-sm text-yellow-300 mb-1">
                  ✨ Thanks for contributing to the community data!
                </p>
                <p className="text-xs text-gray-400">
                  If this tool helped you, consider supporting it: <span className="font-mono text-blue-400">Zwykly Parcel</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}