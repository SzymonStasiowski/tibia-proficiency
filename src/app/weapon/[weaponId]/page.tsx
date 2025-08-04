'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { mockWeapons } from '@/lib/mockData'
import WeaponProficiencyGrid from '@/components/WeaponProficiencyGrid'
import { useState } from 'react'

export default function WeaponPage() {
  const params = useParams()
  const weaponId = params.weaponId as string
  
  const weapon = mockWeapons.find(w => w.id === weaponId)
  const [selectedPerks, setSelectedPerks] = useState<{ [slotIndex: number]: number }>({})
  const [hasVoted, setHasVoted] = useState(false)
  
  if (!weapon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">Weapon not found</h1>
          <Link href="/" className="text-blue-400 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const handlePerkSelect = (slotIndex: number, perkIndex: number) => {
    const newSelection = { ...selectedPerks }
    
    // If clicking the same perk, deselect it
    if (newSelection[slotIndex] === perkIndex) {
      delete newSelection[slotIndex]
    } else {
      newSelection[slotIndex] = perkIndex
    }
    
    setSelectedPerks(newSelection)
  }

  const handleSubmitVote = () => {
    if (Object.keys(selectedPerks).length === 0) {
      alert('Please select at least one perk before voting!')
      return
    }
    
    // TODO: Submit to Supabase
    console.log('Submitting vote:', selectedPerks)
    setHasVoted(true)
    
    // Show success message
    alert(`Thank you for voting! Your build has been submitted for ${weapon.name}.`)
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
                onClick={() => window.open(weapon.url, '_blank')}
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

          {/* Weapon Proficiency Grid */}
          <WeaponProficiencyGrid
            weapon={weapon}
            onPerkSelect={handlePerkSelect}
            selectedPerks={selectedPerks}
          />

          {/* Action Buttons */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={handleSubmitVote}
              disabled={hasVoted || Object.keys(selectedPerks).length === 0}
              className={`
                px-8 py-3 rounded-lg font-semibold transition-all duration-200
                ${hasVoted 
                  ? 'bg-green-600 text-white cursor-not-allowed' 
                  : Object.keys(selectedPerks).length > 0
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-black hover:scale-105 shadow-lg'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {hasVoted ? '✅ Vote Submitted!' : '🗳️ Submit Your Vote'}
            </button>
            
            <button
              onClick={() => setSelectedPerks({})}
              disabled={Object.keys(selectedPerks).length === 0}
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