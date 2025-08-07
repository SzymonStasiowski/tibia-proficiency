'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWeaponByName, useWeaponPerks, useSubmitVote, useUserSession, useWeaponVotesWithUser, useWeaponBuilds, useUserBuildVotes } from '@/hooks'
import { useSubmitCreatorVote } from '@/hooks/useCreators'
import { slugToWeaponName } from '@/lib/utils'
import WeaponProficiencyGrid from '@/components/WeaponProficiencyGrid'
import VotingResults from '@/components/VotingResults'
import Toast from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import { useState, useEffect } from 'react'

interface WeaponClientProps {
  weaponSlug: string
  initialWeapon?: any
  initialPerks?: any[]
  isCreatorMode?: boolean
  creatorToken?: string
}

export default function WeaponClient({ 
  weaponSlug, 
  initialWeapon, 
  initialPerks,
  isCreatorMode = false,
  creatorToken 
}: WeaponClientProps) {
  const router = useRouter()
  const weaponName = slugToWeaponName(weaponSlug)
  
  const { data: weapon, isLoading: weaponLoading, error: weaponError } = useWeaponByName(weaponName, initialWeapon)
  const { data: perks, isLoading: perksLoading } = useWeaponPerks(weapon?.id || '', initialPerks)
  const submitVoteMutation = useSubmitVote()
  const submitCreatorVoteMutation = useSubmitCreatorVote()
  const userSession = useUserSession()
  
  // Use server data as fallback
  const weaponData = weapon || initialWeapon
  const perksData = perks || initialPerks || []
  const isLoadingWeapon = weaponLoading && !initialWeapon
  const isLoadingPerks = perksLoading && !initialPerks
  
  // Check if user has already voted for this weapon - optimized to use single request
  const { allVotes, userVote: existingVote, isLoading: votesLoading } = useWeaponVotesWithUser(weaponData?.id || '', userSession)
  
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]) // Array of perk IDs
  const [showResults, setShowResults] = useState(false)
  const [mode, setMode] = useState<'perks' | 'builds'>('perks') // Toggle between perk voting and builds
  
  // Builds-related hooks
  const { data: builds, isLoading: buildsLoading } = useWeaponBuilds(weaponData?.id || '')
  const { data: userBuildVotes, isLoading: userBuildVotesLoading } = useUserBuildVotes(userSession)
  
  // Toast system
  const { toasts, removeToast, success, error: showError, info } = useToast()
  
  // Check if user has voted and set initial state
  useEffect(() => {
    if (existingVote && existingVote.selected_perks) {
      // Ensure selected_perks is an array of strings
      const perks = Array.isArray(existingVote.selected_perks) 
        ? existingVote.selected_perks.filter((p): p is string => typeof p === 'string')
        : []
      setSelectedPerks(perks)
      setShowResults(true)
    }
  }, [existingVote])
  
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
    if (!perksData) {
      showError('Unable to submit vote. Please refresh the page and try again.')
      return
    }

    // For creator mode, check creator token; for regular mode, check user session
    if (isCreatorMode && !creatorToken) {
      showError('Invalid creator session. Please refresh the page and try again.')
      return
    } else if (!isCreatorMode && !userSession) {
      showError('Unable to submit vote. Please refresh the page and try again.')
      return
    }
    
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
      showError(`Please select a perk for all slots before voting! Missing slots: ${slotNumbers}`)
      return
    }
    
    try {
      if (isCreatorMode && creatorToken) {
        // Creator voting
        await submitCreatorVoteMutation.mutateAsync({
          weapon_id: weaponData!.id,
          selected_perks: selectedPerks,
          creator_token: creatorToken
        })
        
        setShowResults(true)
        success(`🌟 Creator recommendation updated for ${weaponData.name}!`)
        info('Your build is now featured as the "Creator\'s Choice" for this weapon!')
      } else {
        // Regular voting
        await submitVoteMutation.mutateAsync({
          weapon_id: weaponData!.id,
          selected_perks: selectedPerks,
          userSession: userSession!
        })
        
        setShowResults(true)
        
        if (existingVote) {
          success(`Your vote has been updated for ${weaponData.name}!`)
          info('Your previous vote has been replaced with your new selection.')
        } else {
          success(`Thank you for voting! Your build has been submitted for ${weaponData.name}.`)
          info('Your vote helps the community find the best perk combinations!')
        }
      }
    } catch (error: any) {
      console.error('Error submitting vote:', error)
      showError(`Failed to submit vote: ${error?.message || 'Unknown error'}. Please try again.`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Special creator mode header */}
      {isCreatorMode && (
        <div className="bg-yellow-600 text-yellow-900 py-2 px-4 text-center font-semibold">
          🎯 Creator Mode: Your vote will be featured as "Creator's Choice"
        </div>
      )}
      
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
              <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity cursor-pointer">
                <span style={{ color: '#c1121f' }}>tibia</span><span style={{ color: '#fdf0d5' }}>vote</span>
              </Link>
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
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Mode Switcher */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Choose Your Approach</h2>
                <p className="text-gray-400 text-sm">
                  {mode === 'perks' 
                    ? 'Vote on individual perks for this weapon' 
                    : 'Browse and vote on community builds for different situations'
                  }
                </p>
              </div>
              
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setMode('perks')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === 'perks'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  🎲 Individual Perks
                </button>
                <button
                  onClick={() => setMode('builds')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === 'builds'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  🏗️ Community Builds
                </button>
              </div>
            </div>
          </div>
          {/* Individual Perks Mode */}
          {mode === 'perks' && (
            <>
              {/* Compact Progress */}
              {!showResults && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">Build Your Weapon</h2>
                <div className="text-sm text-gray-400">
                  {selectedTiers.length}/{availableTiers.length} slots filled
                </div>
              </div>
            </div>
          )}

          {/* Weapon Proficiency Grid */}
          {!showResults && perksData && perksData.length > 0 ? (
            <div>
              <WeaponProficiencyGrid
                weapon={weaponData}
                perks={perksData}
                onPerkSelect={handlePerkSelect}
                selectedPerks={selectedPerks}
              />
              
              {/* Compact Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleSubmitVote}
                  disabled={!allSlotsFilled || submitVoteMutation.isPending || !userSession}
                  className={`
                    px-6 py-2 rounded-lg font-medium transition-all duration-200 text-sm w-full sm:w-auto
                    ${allSlotsFilled && userSession
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-50'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {submitVoteMutation.isPending 
                    ? '⏳ Submitting...'
                    : !userSession
                      ? '⏳ Loading...'
                      : allSlotsFilled
                        ? existingVote ? '🔄 Update Vote' : '🗳️ Submit Vote'
                        : `Fill All Slots (${selectedTiers.length}/${availableTiers.length})`
                  }
                </button>
                
                <button
                  onClick={() => setShowResults(true)}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 text-sm w-full sm:w-auto"
                >
                  📊 View Results
                </button>
                
                <button
                  onClick={() => setSelectedPerks([])}
                  disabled={selectedPerks.length === 0}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors text-sm w-full sm:w-auto"
                >
                  🔄 Clear
                </button>
              </div>
            </div>
          ) : !showResults ? (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6 text-center">
              <p className="text-gray-400">No perks available for this weapon yet.</p>
            </div>
          ) : null}

              {/* Voting Results */}
              {showResults && allVotes && perksData && (
                <VotingResults 
                  perks={perksData} 
                  votes={allVotes} 
                  isVisible={showResults}
                  onEditVote={() => setShowResults(false)}
                  hasUserVoted={!!existingVote}
                />
              )}
            </>
          )}

          {/* Community Builds Mode */}
          {mode === 'builds' && (
            <div className="space-y-6">
              {/* Builds List */}
              {buildsLoading ? (
                <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading community builds...</p>
                </div>
              ) : builds && builds.length > 0 ? (
                <div className="grid gap-4">
                  {builds.map((build) => (
                    <div key={build.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-2">{build.name}</h3>
                          {build.description && (
                            <p className="text-gray-400 mb-3">{build.description}</p>
                          )}
                          
                          {/* Situation Tags */}
                          {build.situation_tags && build.situation_tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {build.situation_tags.map((tag) => (
                                <span 
                                  key={tag}
                                  className="px-2 py-1 bg-blue-600 text-blue-100 rounded text-xs font-medium"
                                >
                                  {tag.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">{build.vote_count}</div>
                          <div className="text-sm text-gray-400">votes</div>
                        </div>
                      </div>
                      
                      {/* Vote Button */}
                      <div className="flex justify-between items-center">
                        <button
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                          disabled={userBuildVotes?.includes(build.id)}
                        >
                          {userBuildVotes?.includes(build.id) ? '✓ Voted' : '👍 Vote for this build'}
                        </button>
                        
                        <div className="text-sm text-gray-400">
                          Created {new Date(build.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                  <p className="text-gray-400 mb-4">No community builds yet for this weapon.</p>
                  <p className="text-sm text-gray-500">Be the first to create a build!</p>
                </div>
              )}
              
              {/* Create Build Button */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Create Your Own Build</h3>
                <p className="text-gray-400 mb-4">Share your optimal perk combination with the community</p>
                <button
                  onClick={() => setMode('perks')}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  🎯 Create New Build
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  )
}