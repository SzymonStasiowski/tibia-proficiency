'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useWeaponByName, useWeaponPerks, useSubmitVote, getUserSession } from '@/hooks'
import { slugToWeaponName } from '@/lib/utils'
import { useState } from 'react'

export default function WeaponPage() {
  const params = useParams()
  const weaponSlug = params.weaponSlug as string
  const weaponName = slugToWeaponName(weaponSlug)
  
  const { data: weapon, isLoading: weaponLoading, error: weaponError } = useWeaponByName(weaponName)
  const { data: perks, isLoading: perksLoading } = useWeaponPerks(weapon?.id || '')
  const submitVoteMutation = useSubmitVote()
  
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]) // Array of perk IDs
  const [hasVoted, setHasVoted] = useState(false)
  
  if (weaponLoading || perksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading weapon data...</p>
        </div>
      </div>
    )
  }
  
  if (weaponError || !weapon) {
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
    setSelectedPerks(current => {
      // If perk is already selected, remove it
      if (current.includes(perkId)) {
        return current.filter(id => id !== perkId)
      }
      // Otherwise add it
      return [...current, perkId]
    })
  }

  const handleSubmitVote = async () => {
    if (selectedPerks.length === 0) {
      alert('Please select at least one perk before voting!')
      return
    }
    
    try {
      const userSession = getUserSession()
      await submitVoteMutation.mutateAsync({
        weapon_id: weapon!.id,
        selected_perks: selectedPerks,
        userSession
      })
      
      setHasVoted(true)
      alert(`Thank you for voting! Your build has been submitted for ${weapon.name}.`)
    } catch (error) {
      console.error('Error submitting vote:', error)
      alert('Failed to submit vote. Please try again.')
    }
  }

  const handleViewResults = () => {
    // TODO: Navigate to results page
    console.log('View results for:', weapon.name)
    alert('Results page coming soon!')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                ← Back to Categories
              </Link>
              <div className="w-px h-6 bg-gray-600"></div>
              <h1 className="text-xl font-bold">Weapon Proficiency Builder</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleViewResults}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors text-sm font-medium"
              >
                📊 View Community Results
              </button>
              <button
                              onClick={() => weapon.name && window.open(`https://tibia.fandom.com/wiki/${weapon.name.replace(/ /g, '_')}`, '_blank')}
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
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
            <h2 className="text-lg font-semibold mb-2 text-blue-300">How to use:</h2>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• Click on perk icons to select your preferred build</li>
              <li>• Hover over perks to see detailed descriptions</li>
              <li>• Some slots have multiple perk options - choose wisely!</li>
              <li>• Submit your vote to help the community decide the best builds</li>
            </ul>
          </div>

          {/* Weapon Info */}
          <div className="mb-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-6">
              {weapon.image_url ? (
                <img 
                  src={weapon.image_url} 
                  alt={weapon.name}
                  className="w-20 h-20 object-contain"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-20 h-20 flex items-center justify-center text-4xl">⚔️</div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{weapon.name}</h1>
                <p className="text-gray-400">Type: {weapon.weapon_type}</p>
                {weapon.vocation && <p className="text-gray-400">Vocation: {weapon.vocation}</p>}
              </div>
            </div>
          </div>

          {/* Perks Selection */}
          {perks && perks.length > 0 ? (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Select your preferred perks:</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {perks.map((perk) => {
                  const isSelected = selectedPerks.includes(perk.id)
                  return (
                    <div
                      key={perk.id}
                      onClick={() => handlePerkSelect(perk.id)}
                      className={`
                        cursor-pointer p-4 rounded-lg border-2 transition-all duration-200
                        ${isSelected 
                          ? 'border-yellow-500 bg-yellow-900/20' 
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {perk.main_icon_url ? (
                          <img 
                            src={perk.main_icon_url} 
                            alt={perk.name}
                            className="w-8 h-8 object-contain flex-shrink-0"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 flex items-center justify-center text-sm">⚡</div>
                        )}
                        <div>
                          <h3 className={`font-semibold ${isSelected ? 'text-yellow-300' : 'text-white'}`}>
                            {perk.name}
                          </h3>
                          {perk.description && (
                            <p className="text-sm text-gray-400 mt-1">{perk.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Tier {perk.tier_level} • {perk.vote_count} votes
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6 text-center">
              <p className="text-gray-400">No perks available for this weapon yet.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={handleSubmitVote}
              disabled={hasVoted || selectedPerks.length === 0 || submitVoteMutation.isPending}
              className={`
                px-8 py-3 rounded-lg font-semibold transition-all duration-200
                ${hasVoted 
                  ? 'bg-green-600 text-white cursor-not-allowed' 
                  : selectedPerks.length > 0
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-black hover:scale-105 shadow-lg disabled:opacity-50'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {submitVoteMutation.isPending 
                ? '⏳ Submitting...'
                : hasVoted 
                  ? '✅ Vote Submitted!' 
                  : '🗳️ Submit Your Vote'
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

          {/* Vote Count Display (Mock) */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
              <div className="text-2xl font-bold text-green-400">347</div>
              <div className="text-sm text-gray-400">Total Votes</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
              <div className="text-2xl font-bold text-blue-400">89%</div>
              <div className="text-sm text-gray-400">Consensus on Slot 1</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
              <div className="text-2xl font-bold text-purple-400">23</div>
              <div className="text-sm text-gray-400">Unique Builds</div>
            </div>
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