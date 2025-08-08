'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import BuildPerkDisplay from './BuildPerkDisplay'
import SmartTooltip from './SmartTooltip'
import { weaponNameToSlug } from '@/lib/utils'
import type { PopularBuild, Build } from '@/hooks/useBuilds'

interface BuildCardProps {
  build: PopularBuild | (Build & { weapon_name?: string; weapon_image_url?: string })
  perks?: any[]
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

  const handleVote = () => {
    if (onVote) {
      onVote(build.id)
    }
  }

  // Get weapon info from either build (PopularBuild) or weaponData prop
  const weaponName = (build as PopularBuild).weapon_name || weaponData?.name || 'Unknown Weapon'
  const weaponImageUrl = (build as PopularBuild).weapon_image_url || weaponData?.image_url

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
                  <img
                    src={weaponImageUrl}
                    alt={weaponName}
                    className="w-12 h-12 object-contain bg-gray-700 rounded-lg p-1 hover:bg-gray-600 transition-colors"
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
                  <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium">
                    👤 Solo
                  </span>
                )}
                {build.situation_tags.includes('team') && (
                  <span className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium">
                    👥 Team
                  </span>
                )}
                {build.situation_tags.includes('bosses') && (
                  <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium">
                    👹 Bossing
                  </span>
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
                <button
                  onClick={handleVote}
                  disabled={votingBuildId === build.id}
                  className={`absolute -top-0.5 -right-2 w-4 h-4 rounded-full text-lg font-bold transition-all duration-200 flex items-center justify-center origin-top-right ${
                    userBuildVotes.includes(build.id)
                      ? 'bg-transparent border border-green-500 text-green-400'
                      : 'bg-green-600 text-white disabled:bg-gray-600'
                  }`}
                  title={
                    votingBuildId === build.id
                      ? 'Processing...' 
                      : userBuildVotes.includes(build.id)
                      ? 'Click to remove vote' 
                      : 'Vote for this build'
                  }
                >
                  <span className="inline-block leading-none">
                    {votingBuildId === build.id ? '⏳' : userBuildVotes.includes(build.id) ? '✓' : '+'}
                  </span>
                </button>
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
                    <img
                      src={weaponImageUrl}
                      alt={weaponName}
                      className="w-16 h-16 object-contain bg-gray-700 rounded-lg p-2 hover:bg-gray-600 transition-colors"
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
                    <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
                      👤 Solo
                    </span>
                  )}
                  {build.situation_tags.includes('team') && (
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                      👥 Team
                    </span>
                  )}
                  {build.situation_tags.includes('bosses') && (
                    <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-semibold">
                      👹 Bossing
                    </span>
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
                <button
                  onClick={handleVote}
                  disabled={votingBuildId === build.id}
                  className={`absolute -top-1 -right-4 w-4 h-4 rounded-full text-lg font-bold transition-all duration-200 flex items-center justify-center origin-top-right ${
                    userBuildVotes.includes(build.id)
                      ? 'bg-transparent border border-green-500 text-green-400 hover:bg-green-500/10'
                      : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed'
                  }`}
                  title={
                    votingBuildId === build.id
                      ? 'Processing...' 
                      : userBuildVotes.includes(build.id)
                      ? 'Click to remove vote' 
                      : 'Vote for this build'
                  }
                >
                  <span className="inline-block leading-none">
                    {votingBuildId === build.id
                      ? '⏳' 
                      : userBuildVotes.includes(build.id)
                      ? '✓' 
                      : '+'
                    }
                  </span>
                </button>
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