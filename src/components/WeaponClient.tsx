'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useWeaponByName, useWeaponPerks, useSubmitVote, useUserSession, useWeaponVotesWithUser, useWeaponBuilds, useUserBuildVotes, useVoteForBuild, useRemoveVoteFromBuild, useCreateBuild, SITUATION_TAGS } from '@/hooks'
import { useSubmitCreatorVote } from '@/hooks/useCreators'
import { slugToWeaponName } from '@/lib/utils'
import WeaponProficiencyGrid from '@/components/WeaponProficiencyGrid'
import BuildCard from '@/components/Builds/BuildCard'

// Local Toast component removed; Sonner toaster is global
import { useToast } from '@/hooks/useToast'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Toolbar, ToolbarSection } from '@/components/ui/toolbar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
  const [buildForm, setBuildForm] = useState<{ name: string; description: string; situationTags: string[] }>({
    name: '',
    description: '',
    situationTags: []
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
  const { success, error: showError, info } = useToast()
  
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
          🎯 Creator Mode: Your vote will be featured as &quot;Creator&apos;s Choice&quot;
        </div>
      )}
      
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <Toolbar>
            <ToolbarSection>
              <Button variant="ghost" onClick={() => router.back()}>←</Button>
              <div className="w-px h-6 bg-gray-600" />
              <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity cursor-pointer">
                <span style={{ color: '#9146FF' }}>tibia</span><span style={{ color: '#53FC18' }}>vote</span>
              </Link>
            </ToolbarSection>
            <ToolbarSection>
              <Button variant="secondary" onClick={() => weaponData.name && window.open(`https://tibia.fandom.com/wiki/${weaponData.name.replace(/ /g, '_')}`, '_blank')}>🔗 Tibia Wiki</Button>
            </ToolbarSection>
          </Toolbar>
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
                <Button
                  variant={mode === 'perks' ? 'default' : 'ghost'}
                  onClick={() => {
                    setMode('perks')
                    const url = new URL(window.location.href)
                    url.searchParams.delete('tab')
                    router.replace(url.pathname + url.search, { scroll: false })
                  }}
                  className="px-4 py-2"
                >
                  🎲 Individual Perks
                </Button>
                <Button
                  variant={mode === 'builds' ? 'default' : 'ghost'}
                  onClick={() => {
                    setMode('builds')
                    const url = new URL(window.location.href)
                    url.searchParams.set('tab', 'builds')
                    router.replace(url.pathname + url.search, { scroll: false })
                  }}
                  className="px-4 py-2"
                >
                  🏗️ Community Builds
                </Button>
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
                votes={(allVotes || []).map(v => ({ selected_perks: Array.isArray(v.selected_perks) ? (v.selected_perks as string[]) : [] }))}
              />
              
              {/* Compact Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={handleSubmitVote} disabled={!allSlotsFilled || submitVoteMutation.isPending || !userSession} className="w-full sm:w-auto">
                  {submitVoteMutation.isPending 
                    ? '⏳ Submitting...'
                    : !userSession
                      ? '⏳ Loading...'
                      : allSlotsFilled
                        ? existingVote ? '🔄 Update Vote' : '🗳️ Submit Vote'
                        : `Fill All Slots (${selectedTiers.length}/${availableTiers.length})`
                  }
                </Button>
                

                
                <Button variant="secondary" onClick={() => setSelectedPerks([])} disabled={selectedPerks.length === 0} className="w-full sm:w-auto">🔄 Clear</Button>
                
                {selectedPerks.length > 0 && (
                  <Button onClick={() => setShowCreateBuild(true)} className="w-full sm:w-auto">💾 Save as Build</Button>
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
                  <Button onClick={() => setMode('perks')}>🎲 Select Perks First</Button>
                  <Button onClick={() => setShowCreateBuild(true)} disabled={selectedPerks.length === 0}>
                    {selectedPerks.length > 0 ? `💾 Create Build (${selectedPerks.length} perks)` : '💾 Create Build'}
                  </Button>
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
        <Dialog open={showCreateBuild} onOpenChange={setShowCreateBuild}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Build</DialogTitle>
            </DialogHeader>
              
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
                  <Label htmlFor="build-name">Build Name *</Label>
                  <Input
                    id="build-name"
                    type="text"
                    value={buildForm.name}
                    onChange={(e) => setBuildForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Ice Damage Solo Hunter"
                    maxLength={100}
                    className="mt-2"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <Label htmlFor="build-description">Description (Optional)</Label>
                  <Textarea
                    id="build-description"
                    value={buildForm.description}
                    onChange={(e) => setBuildForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe when and how to use this build..."
                    rows={3}
                    className="mt-2"
                  />
                </div>
                
                {/* Situation Tags */}
                <div>
                  <Label>Build Tags (Select all that apply)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {Object.entries({
                      [SITUATION_TAGS.SOLO]: '👤 Solo',
                      [SITUATION_TAGS.TEAM]: '👥 Team', 
                      [SITUATION_TAGS.BOSSES]: '👹 Bossing'
                    }).map(([tag, label]) => (
                      <Button
                        key={tag}
                        onClick={() => toggleSituationTag(tag)}
                        variant={buildForm.situationTags.includes(tag) ? 'default' : 'secondary'}
                        className="justify-start"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-700">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCreateBuild(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleCreateBuild} disabled={!buildForm.name.trim() || createBuildMutation.isPending}>
                  {createBuildMutation.isPending ? '⏳ Creating...' : '🎉 Create Build'}
                </Button>
              </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Toasts handled globally by <AppToaster /> in layout */}
    </div>
  )
}