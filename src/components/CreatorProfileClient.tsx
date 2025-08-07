'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Creator, CreatorStats } from '@/hooks/useCreators'
import { weaponNameToSlug } from '@/lib/utils'
import { useToast } from '@/hooks'
import Toast from '@/components/Toast'

interface CreatorVote {
  id: string
  weapon_id: string
  selected_perks: string[]
  created_at: string
  updated_at: string
  weapons: {
    id: string
    name: string
    image_url: string | null
    weapon_type: string | null
    vocation: string | null
  }
}

interface CreatorProfileClientProps {
  creator: Creator
  creatorVotes: CreatorVote[]
  creatorStats: CreatorStats | null
}

export default function CreatorProfileClient({ 
  creator, 
  creatorVotes, 
  creatorStats 
}: CreatorProfileClientProps) {
  const router = useRouter()
  const { success } = useToast()
  const [filter, setFilter] = useState<'all' | 'recent'>('all')

  // Get platform colors and icons
  const getPlatformInfo = (platform: string | null) => {
    switch (platform) {
      case 'twitch':
        return {
          color: 'bg-purple-600',
          textColor: 'text-purple-600',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-700',
          icon: '📺'
        }
      case 'youtube':
        return {
          color: 'bg-red-600',
          textColor: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-700',
          icon: '🎥'
        }
      case 'kick':
        return {
          color: 'bg-green-600',
          textColor: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-700',
          icon: '🎮'
        }
      default:
        return {
          color: 'bg-gray-600',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-700',
          icon: '🎯'
        }
    }
  }

  const platformInfo = getPlatformInfo(creator.platform)

  // Filter votes based on selected filter
  const filteredVotes = filter === 'recent' 
    ? creatorVotes.slice(0, 10)
    : creatorVotes

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/${creator.creator_slug}`
    try {
      await navigator.clipboard.writeText(url)
      success('Profile URL copied to clipboard!')
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      success('Copy this URL: ' + url)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return '1 day ago'
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`
    if (diffInHours < 720) return `${Math.floor(diffInHours / 168)} weeks ago`
    return formatDate(dateString)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/')}
                className="text-blue-600 hover:text-blue-500 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                ←
              </button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
                <span style={{ color: '#9146FF' }}>tibia</span><span style={{ color: '#53FC18' }}>vote</span>
              </Link>
            </div>
            
            <button
              onClick={handleShareProfile}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              📤 Share Profile
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Creator Hero Section */}
        <div className={`${platformInfo.bgColor} ${platformInfo.borderColor} border rounded-xl p-8 mb-8`}>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              {creator.channel_url ? (
                <a
                  href={creator.channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:scale-105 transition-transform cursor-pointer"
                  title={`Visit ${creator.channel_name} on ${creator.platform}`}
                >
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.channel_name}
                      className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-4xl">
                      {platformInfo.icon}
                    </div>
                  )}
                </a>
              ) : (
                <>
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.channel_name}
                      className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-4xl">
                      {platformInfo.icon}
                    </div>
                  )}
                </>
              )}
              
              {/* Platform Badge */}
              <div className={`absolute -bottom-2 -right-2 ${platformInfo.color} text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1`}>
                {platformInfo.icon} {creator.platform?.toUpperCase()}
              </div>
            </div>

            {/* Creator Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {creator.channel_name}
              </h1>
            </div>

            {/* Stats */}
            {creatorStats && (
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {creatorStats.weapons_voted}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Weapons Voted
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {creatorStats.total_votes}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Votes
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Creator's Choices Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                🌟 Creator's Choice Weapons
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Weapon builds personally recommended by {creator.channel_name}
              </p>
            </div>
            
            {creatorVotes.length > 10 && (
              <div className="flex gap-2 mt-4 sm:mt-0">
                <button
                  onClick={() => setFilter('recent')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    filter === 'recent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Recent
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  All ({creatorVotes.length})
                </button>
              </div>
            )}
          </div>

          {/* Weapons Grid */}
          {filteredVotes.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
              {filteredVotes.map((vote) => (
                <Link
                  key={vote.id}
                  href={`/weapon/${weaponNameToSlug(vote.weapons.name)}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 overflow-hidden group relative p-3 hover:scale-105"
                  title={`${vote.weapons.name} - ${vote.weapons.weapon_type} (${formatTimeAgo(vote.updated_at)})`}
                >
                  {/* Weapon Image */}
                  <div className="flex items-center justify-center">
                    {vote.weapons.image_url ? (
                      <img
                        src={vote.weapons.image_url}
                        alt={vote.weapons.name}
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <div className="text-2xl">⚔️</div>
                    )}
                  </div>
                  
                  {/* Creator Badge */}
                  <div className="absolute top-0.5 right-0.5 bg-yellow-500 text-yellow-900 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold">
                    ⭐
                  </div>
                  
                  {/* Perk Count Badge */}
                  <div className="absolute bottom-0.5 right-0.5 bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold">
                    {vote.selected_perks.length}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No recommendations yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {creator.channel_name} hasn't shared any weapon builds yet. Check back soon!
              </p>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">
            Want to contribute to the community?
          </h3>
          <p className="text-blue-100 mb-4">
            Vote on your favorite weapon builds and help the Tibia community find the best strategies!
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Voting
          </Link>
        </div>
      </div>
      
      <Toast />
    </div>
  )
}