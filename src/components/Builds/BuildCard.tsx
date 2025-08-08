'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import BuildPerkDisplay from '@/components/Builds/BuildPerkDisplay'
import Image from 'next/image'
import SmartTooltip from '@/components/SmartTooltip'
import { weaponNameToSlug } from '@/lib/utils'
import type { PopularBuild, Build } from '@/hooks/useBuilds'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface BuildCardProps {
  build: PopularBuild | (Build & { weapon_name?: string; weapon_image_url?: string })
  perks?: { id: string; name: string; description: string; main_icon_url: string; type_icon_url?: string }[]
  onVote?: (buildId: string) => void
  userBuildVotes?: string[]
  votingBuildId?: string | null
  showRank?: number
  hideVoting?: boolean
  weaponData?: {
    name: string
    image_url?: string
  }
}

export default function BuildCard({ 
  build, 
  perks = [], 
  onVote, 
  userBuildVotes = [], 
  votingBuildId = null,
  showRank,
  hideVoting = false,
  weaponData
}: BuildCardProps) {
  const router = useRouter()
  const [isWeaponHovered, setIsWeaponHovered] = useState(false)
  // const [imageError, setImageError] = useState(false)

  // Get weapon style based on weapon type - similar to HotWeaponCard
  const getWeaponFallback = (_weaponName: string, weaponType?: string) => {
    const lowerType = weaponType?.toLowerCase() || ''
    const lowerName = _weaponName?.toLowerCase() || ''
    
    // First check weapon type if available
    if (lowerType.includes('sword') || lowerName.includes('sword')) {
      return { icon: '⚔️', bgGradient: 'from-red-500/20 to-red-700/20' }
    }
    if (lowerType.includes('axe') || lowerName.includes('axe')) {
      return { icon: '🪓', bgGradient: 'from-orange-500/20 to-orange-700/20' }
    }
    if (lowerType.includes('club') || lowerName.includes('club') || lowerName.includes('hammer')) {
      return { icon: '🔨', bgGradient: 'from-yellow-500/20 to-yellow-700/20' }
    }
    if (lowerType.includes('distance') || lowerType.includes('bow') || lowerName.includes('bow')) {
      return { icon: '🏹', bgGradient: 'from-green-500/20 to-green-700/20' }
    }
    if (lowerType.includes('crossbow') || lowerName.includes('crossbow')) {
      return { icon: '🎯', bgGradient: 'from-purple-500/20 to-purple-700/20' }
    }
    if (lowerType.includes('wand') || lowerName.includes('wand')) {
      return { icon: '✨', bgGradient: 'from-blue-500/20 to-blue-700/20' }
    }
    if (lowerType.includes('rod') || lowerName.includes('rod')) {
      return { icon: '🔮', bgGradient: 'from-indigo-500/20 to-indigo-700/20' }
    }
    if (lowerType.includes('spear') || lowerName.includes('spear')) {
      return { icon: '🗡️', bgGradient: 'from-pink-500/20 to-pink-700/20' }
    }
    
    // Default fallback
    return { icon: '⚔️', bgGradient: 'from-gray-500/20 to-gray-700/20' }
  }

  const handleVote = () => {
    if (onVote) {
      onVote(build.id)
    }
  }

  // Get weapon info from either build (PopularBuild) or weaponData prop
  const weaponName = (build as PopularBuild).weapon_name || weaponData?.name || 'Unknown Weapon'
  const weaponImageUrl = (build as PopularBuild).weapon_image_url || weaponData?.image_url
  const weaponType = (build as PopularBuild & { weapon_type?: string })?.weapon_type || (weaponData as { weapon_type?: string } | undefined)?.weapon_type
  
  // Get fallback styling
  // const fallbackStyle = getWeaponFallback(weaponName, weaponType)

  const handleWeaponClick = () => {
    const weaponSlug = weaponNameToSlug(weaponName)
    router.push(`/weapon/${weaponSlug}?tab=builds`)
  }

  return (
    <div className={`bg-gray-800 rounded-lg border relative ${showRank ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' : 'border-gray-700'}`}>
      {/* Rank Badge */}
      {showRank && (
        <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-yellow-300">
          #{showRank}
        </div>
      )}

      {/* Mobile Layout */}
      <div className="block md:hidden p-4">
        {/* Header Row */}
        <div className="flex items-start gap-3 mb-4">
          {/* Weapon Image */}
          <div className="flex-shrink-0">
            <SmartTooltip
              content={
                <div className="text-center">
                  <div className="font-semibold">{weaponName}</div>
                  <div className="text-xs text-gray-300 mt-1">Click to view builds</div>
                </div>
              }
              isVisible={isWeaponHovered}
            >
              <div
                className="cursor-pointer transition-transform hover:scale-105"
                onMouseEnter={() => setIsWeaponHovered(true)}
                onMouseLeave={() => setIsWeaponHovered(false)}
                onClick={handleWeaponClick}
              >
                {weaponImageUrl ? (
                  <Image
                    src={weaponImageUrl}
                    alt={weaponName}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain bg-gray-700 rounded-lg p-1 hover:bg-gray-600 transition-colors"
                    unoptimized
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-lg transition-colors">
                    ⚔️
                  </div>
                )}
              </div>
            </SmartTooltip>
          </div>
          
          {/* Build Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1">{build.name}</h3>
            {build.description && (
              <p className="text-gray-400 text-sm mb-2 line-clamp-2">{build.description}</p>
            )}
            
            {/* Situation Tags */}
            {build.situation_tags && build.situation_tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mb-2">
                {build.situation_tags.includes('solo') && (
                  <Badge variant="success">👤 Solo</Badge>
                )}
                {build.situation_tags.includes('team') && (
                  <Badge>👥 Team</Badge>
                )}
                {build.situation_tags.includes('bosses') && (
                  <Badge variant="destructive">👹 Bossing</Badge>
                )}
              </div>
            )}
          </div>

          {/* Vote Section */}
          <div className="flex-shrink-0 text-center">
            <div className="relative inline-block">
              <div className="text-2xl font-bold text-white">{build.vote_count}</div>
              <div className="text-xs text-gray-400">votes</div>
              {!hideVoting && (
                <Button
                  onClick={handleVote}
                  disabled={votingBuildId === build.id}
                  className={`absolute -top-0.5 -right-2 w-6 h-6 p-0 rounded-full text-sm font-bold ${
                    userBuildVotes.includes(build.id)
                      ? 'bg-transparent border border-green-500 text-green-400 hover:bg-green-500/10'
                      : ''
                  }`}
                  variant={userBuildVotes.includes(build.id) ? 'ghost' : 'default'}
                  title={
                    votingBuildId === build.id
                      ? 'Processing...'
                      : userBuildVotes.includes(build.id)
                      ? 'Click to remove vote'
                      : 'Vote for this build'
                  }
                >
                  {votingBuildId === build.id ? '⏳' : userBuildVotes.includes(build.id) ? '✓' : '+'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Perks Row */}
        <div className="mb-3">
          <div className="text-sm text-gray-400 mb-2">Selected Perks</div>
          <BuildPerkDisplay 
            selectedPerkIds={Array.isArray(build.selected_perks) ? build.selected_perks.filter((p): p is string => typeof p === 'string') : []}
            perks={perks}
            maxDisplay={7}
          />
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-400 text-right">
          Created {new Date(build.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block p-6">
        <div className="flex items-start gap-6">
          {/* First Child: Weapon Image, Build Name, Description, and Tags */}
          <div className="flex gap-4 w-fit">
            {/* Weapon Image */}
            <div className="flex-shrink-0">
              <SmartTooltip
                content={
                  <div className="text-center">
                    <div className="font-semibold">{weaponName}</div>
                    <div className="text-xs text-gray-300 mt-1">Click to view builds</div>
                  </div>
                }
                isVisible={isWeaponHovered}
              >
                <div
                  className="cursor-pointer transition-transform hover:scale-105"
                  onMouseEnter={() => setIsWeaponHovered(true)}
                  onMouseLeave={() => setIsWeaponHovered(false)}
                  onClick={handleWeaponClick}
                >
                  {weaponImageUrl ? (
                    <Image
                      src={weaponImageUrl}
                      alt={weaponName}
                      width={64}
                      height={64}
                      className="w-16 h-16 object-contain bg-gray-700 rounded-lg p-2 hover:bg-gray-600 transition-colors"
                      unoptimized
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-2xl transition-colors">
                      ⚔️
                    </div>
                  )}
                </div>
              </SmartTooltip>
            </div>
            
            <div className="w-fit max-w-xs">
              <h3 className="text-xl font-semibold text-white mb-2">{build.name}</h3>
              {build.description && (
                <p className="text-gray-400 mb-3 text-sm">{build.description}</p>
              )}
              
              {/* Build Type and Situation Tags */}
              {build.situation_tags && build.situation_tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Primary Build Type Badge */}
                  {build.situation_tags.includes('solo') && (
                    <Badge variant="success">👤 Solo</Badge>
                  )}
                  {build.situation_tags.includes('team') && (
                    <Badge>👥 Team</Badge>
                  )}
                  {build.situation_tags.includes('bosses') && (
                    <Badge variant="destructive">👹 Bossing</Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Second Child: Selected Perks Display */}
          <div className="flex-1 flex justify-center">
            <div className="text-center w-fit">
              <div className="text-sm text-gray-400 mb-2">Selected Perks</div>
              <BuildPerkDisplay 
                selectedPerkIds={Array.isArray(build.selected_perks) ? build.selected_perks.filter((p): p is string => typeof p === 'string') : []}
                perks={perks}
                maxDisplay={7}
              />
            </div>
          </div>
          
          {/* Third Child: Vote Section and Created At */}
          <div className="text-right w-fit flex flex-col items-end gap-3">
            {/* Vote Section */}
            <div className="relative inline-block text-center">
              <div className="text-4xl font-bold text-white">{build.vote_count}</div>
              <div className="text-sm text-gray-400">votes</div>
              {!hideVoting && (
                <Button
                  onClick={handleVote}
                  disabled={votingBuildId === build.id}
                  className={`absolute -top-1 -right-4 w-7 h-7 p-0 rounded-full text-sm font-bold ${
                    userBuildVotes.includes(build.id)
                      ? 'bg-transparent border border-green-500 text-green-400 hover:bg-green-500/10'
                      : ''
                  }`}
                  variant={userBuildVotes.includes(build.id) ? 'ghost' : 'default'}
                  title={
                    votingBuildId === build.id
                      ? 'Processing...'
                      : userBuildVotes.includes(build.id)
                      ? 'Click to remove vote'
                      : 'Vote for this build'
                  }
                >
                  {votingBuildId === build.id ? '⏳' : userBuildVotes.includes(build.id) ? '✓' : '+'}
                </Button>
              )}
            </div>
            
            {/* Created At */}
            <div className="text-sm text-gray-400">
              Created {new Date(build.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}