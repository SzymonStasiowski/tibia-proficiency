'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useWeaponByName, useWeaponPerks, useSubmitVote, useUserSession, useWeaponVotesWithUser, useWeaponBuilds, useUserBuildVotes, useVoteForBuild, useRemoveVoteFromBuild, useCreateBuild, SITUATION_TAGS } from '@/hooks'
import { useSubmitCreatorVote } from '@/hooks/useCreators'
import { slugToWeaponName } from '@/lib/utils'
import WeaponProficiencyGrid from '@/components/WeaponProficiencyGrid'
import BuildCard from '@/components/Builds/BuildCard'

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
  const searchParams = useSearchParams()
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
  const { allVotes, userVote: existingVote } = useWeaponVotesWithUser(weaponData?.id || '', userSession)
  
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]) // Array of perk IDs

  // Check URL parameter for initial tab state
  const initialTab = searchParams.get('tab')
  const [mode, setMode] = useState<'perks' | 'builds'>(initialTab === 'builds' ? 'builds' : 'perks')
  const [showCreateBuild, setShowCreateBuild] = useState(false)
  const [buildForm, setBuildForm] = useState({
    name: '',
    description: '',
    situationTags: [] as string[]
  })
  
  // Builds-related hooks
  const { data: builds, isLoading: buildsLoading } = useWeaponBuilds(weaponData?.id || '')
  const { data: userBuildVotes } = useUserBuildVotes(userSession)
  const voteForBuildMutation = useVoteForBuild()
  const removeVoteFromBuildMutation = useRemoveVoteFromBuild()
  const createBuildMutation = useCreateBuild()
  
  // State to track which build is currently being voted on
  const [votingBuildId, setVotingBuildId] = useState<string | null>(null)
  
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
        
    
        success(`🌟 Creator recommendation updated for ${weaponData.name}!`)
        info('Your build is now featured as the "Creator\'s Choice" for this weapon!')
      } else {
        // Regular voting
        await submitVoteMutation.mutateAsync({
          weapon_id: weaponData!.id,
          selected_perks: selectedPerks,
          userSession: userSession!
        })
        
    
        
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

  const handleBuildVote = async (buildId: string) => {
    if (!userSession) {
      showError('Unable to vote. Please refresh the page and try again.')
      return
    }

    setVotingBuildId(buildId)

    try {
      const hasUserVoted = userBuildVotes?.includes(buildId)
      
      if (hasUserVoted) {
        // User wants to unvote
        await removeVoteFromBuildMutation.mutateAsync({
          build_id: buildId,
          user_session: userSession,
          creator_id: isCreatorMode ? creatorToken : undefined
        })
        
        success('🗳️ Vote removed successfully!')
      } else {
        // User wants to vote
        await voteForBuildMutation.mutateAsync({
          build_id: buildId,
          user_session: userSession,
          creator_id: isCreatorMode ? creatorToken : undefined
        })
        
        success('✅ Vote submitted successfully!')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process vote. Please try again.'
      showError(message)
    } finally {
      setVotingBuildId(null)
    }
  }

  const handleCreateBuild = async () => {
    if (!userSession || !weaponData?.id) {
      showError('Unable to create build. Please refresh the page and try again.')
      return
    }

    if (!buildForm.name.trim()) {
      showError('Please enter a name for your build.')
      return
    }

    if (selectedPerks.length === 0) {
      showError('Please select some perks for your build.')
      return
    }

    try {
      await createBuildMutation.mutateAsync({
        weapon_id: weaponData.id,
        name: buildForm.name.trim(),
        description: buildForm.description.trim() || undefined,
        situation_tags: buildForm.situationTags.length > 0 ? buildForm.situationTags : undefined,
        selected_perks: selectedPerks,
        user_session: userSession,
        creator_id: isCreatorMode ? creatorToken : undefined
      })
      
      success('🎉 Build created successfully!')
      
      // Reset form and switch to builds mode to see the new build
      setBuildForm({ name: '', description: '', situationTags: [] })
      setShowCreateBuild(false)
      setMode('builds')
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create build. Please try again.'
      showError(message)
    }
  }

  const toggleSituationTag = (tag: string) => {
    setBuildForm(prev => ({
      ...prev,
      situationTags: prev.situationTags.includes(tag)
        ? prev.situationTags.filter(t => t !== tag)
        : [...prev.situationTags, tag]
    }))
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
                <span style={{ color: '#9146FF' }}>tibia</span><span style={{ color: '#53FC18' }}>vote</span>
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
                  onClick={() => {
                    setMode('perks')
                    // Update URL without reloading
                    const url = new URL(window.location.href)
                    url.searchParams.delete('tab')
                    router.replace(url.pathname + url.search, { scroll: false })
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === 'perks'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  🎲 Individual Perks
                </button>
                <button
                  onClick={() => {
                    setMode('builds')
                    // Update URL without reloading
                    const url = new URL(window.location.href)
                    url.searchParams.set('tab', 'builds')
                    router.replace(url.pathname + url.search, { scroll: false })
                  }}
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
              {(
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
          {perksData && perksData.length > 0 ? (
            <div>
              <WeaponProficiencyGrid
                weapon={weaponData}
                perks={perksData}
                onPerkSelect={handlePerkSelect}
                selectedPerks={selectedPerks}
                votes={allVotes || []}
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
                  onClick={() => setSelectedPerks([])}
                  disabled={selectedPerks.length === 0}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors text-sm w-full sm:w-auto"
                >
                  🔄 Clear
                </button>
                
                {selectedPerks.length > 0 && (
                  <button
                    onClick={() => setShowCreateBuild(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm w-full sm:w-auto"
                  >
                    💾 Save as Build
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6 text-center">
              <p className="text-gray-400">No perks available for this weapon yet.</p>
            </div>
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
                    <BuildCard
                      key={build.id}
                      build={build}
                      perks={perksData}
                      onVote={handleBuildVote}
                      userBuildVotes={userBuildVotes}
                      votingBuildId={votingBuildId}
                      weaponData={weaponData}
                    />
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
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setMode('perks')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    🎲 Select Perks First
                  </button>
                  <button
                    onClick={() => setShowCreateBuild(true)}
                    disabled={selectedPerks.length === 0}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {selectedPerks.length > 0 ? `💾 Create Build (${selectedPerks.length} perks)` : '💾 Create Build'}
                  </button>
                </div>
                {selectedPerks.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Select perks in Individual Perks mode first, or switch to select perks now
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Build Modal */}
      {showCreateBuild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Create New Build</h2>
                <button
                  onClick={() => setShowCreateBuild(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              {/* Selected Perks Preview */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Selected Perks ({selectedPerks.length})</h3>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedPerks.map(perkId => {
                      const perk = perksData?.find(p => p.id === perkId)
                      return perk ? (
                        <div key={perkId} className="text-sm text-gray-300">
                          • {perk.name} (Slot {perk.tier_level + 1})
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              </div>
              
              {/* Build Form */}
              <div className="space-y-4">
                {/* Build Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Build Name *
                  </label>
                  <input
                    type="text"
                    value={buildForm.name}
                    onChange={(e) => setBuildForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Ice Damage Solo Hunter"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={100}
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={buildForm.description}
                    onChange={(e) => setBuildForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe when and how to use this build..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Situation Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Build Tags (Select all that apply)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries({
                      [SITUATION_TAGS.SOLO]: '👤 Solo',
                      [SITUATION_TAGS.TEAM]: '👥 Team', 
                      [SITUATION_TAGS.BOSSES]: '👹 Bossing'
                    }).map(([tag, label]) => (
                      <button
                        key={tag}
                        onClick={() => toggleSituationTag(tag)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          buildForm.situationTags.includes(tag)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-700">
                <button
                  onClick={() => setShowCreateBuild(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBuild}
                  disabled={!buildForm.name.trim() || createBuildMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {createBuildMutation.isPending ? '⏳ Creating...' : '🎉 Create Build'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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