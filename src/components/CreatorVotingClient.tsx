'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCreatorByToken } from '@/hooks/useCreators'
import { weaponNameToSlug } from '@/lib/utils'
import { useToast } from '@/hooks'
import WeaponSelect from '@/components/WeaponSelect'
import WeaponClient from '@/components/WeaponClient'

interface CreatorVotingClientProps {
  creatorToken: string
}

export default function CreatorVotingClient({ creatorToken }: CreatorVotingClientProps) {
  const router = useRouter()
  const { error: showError } = useToast()
  const [selectedWeaponSlug, setSelectedWeaponSlug] = useState<string | null>(null)
  
  // Fetch creator data
  const { data: creator, isLoading: creatorLoading, error: creatorError } = useCreatorByToken(creatorToken)
  
  // Handle creator validation
  if (creatorError || (!creatorLoading && !creator)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-8">
              <h1 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">
                Invalid Creator Link
              </h1>
              <p className="text-red-600 dark:text-red-300 mb-6">
                This creator voting link is invalid or has expired. Please contact the administrator for a new link.
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (creatorLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading creator information...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleWeaponSelect = (weaponName: string) => {
    const slug = weaponNameToSlug(weaponName)
    setSelectedWeaponSlug(slug)
  }

  const handleBackToWeaponSelect = () => {
    setSelectedWeaponSlug(null)
  }

  if (selectedWeaponSlug) {
    // Show weapon voting interface
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Creator Header */}
        <div className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {creator?.avatar_url && (
                  <Image
                    src={creator?.avatar_url}
                    alt={creator?.channel_name || 'Creator avatar'}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full border-2 border-yellow-400"
                    unoptimized
                  />
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    🎮 {creator?.channel_name} - Creator Voting
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your votes will be featured as &quot;Creator&apos;s Choice&quot;
                  </p>
                </div>
              </div>
              <button
                onClick={handleBackToWeaponSelect}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
              >
                ← Change Weapon
              </button>
            </div>
          </div>
        </div>

        {/* Weapon Voting Interface */}
        <WeaponClient 
          weaponSlug={selectedWeaponSlug}
          isCreatorMode={true}
          creatorToken={creatorToken}
        />
      </div>
    )
  }

  // Show weapon selection interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 pt-12">
        {/* Creator Welcome Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-6">
            {creator?.avatar_url && (
              <Image
                src={creator?.avatar_url}
                alt={creator?.channel_name || 'Creator avatar'}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full border-4 border-yellow-400 shadow-lg mr-6"
                unoptimized
              />
            )}
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                Welcome, <span className="text-yellow-600">{creator?.channel_name}!</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                🎯 Creator Voting Dashboard
              </p>
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 max-w-3xl mx-auto mb-8">
            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              🌟 Your votes matter more!
            </h2>
            <p className="text-yellow-700 dark:text-yellow-300">
              As a verified creator, your weapon builds will be featured as "Creator's Choice" and help guide the community. 
              Your votes carry special weight and will be prominently displayed.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Select a Weapon to Vote On
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Choose any weapon below to submit or update your creator recommendation
            </p>
            
            <WeaponSelect 
              onWeaponSelect={handleWeaponSelect}
              placeholder="Search for a weapon to vote on..."
            />
          </div>

          {/* Creator Profile Link */}
          <div className="mt-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your public creator profile will be available at:
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-w-lg mx-auto">
              <code className="text-blue-600 dark:text-blue-400 font-mono">
                tibiavote.com/{creator?.creator_slug}
              </code>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Share this link to promote your weapon recommendations!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}