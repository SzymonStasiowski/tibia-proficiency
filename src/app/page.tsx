'use client'

import { useState } from 'react'
import { weaponCategories, communityStats } from '@/lib/mockData'
import WeaponCategoryCard from '@/components/WeaponCategoryCard'
import CommunityStats from '@/components/CommunityStats'
import DonationCard from '@/components/DonationCard'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleCategoryClick = (categoryId: string) => {
    window.location.href = `/category/${categoryId}`
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement search functionality
    console.log('Search for:', searchQuery)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-12 pb-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Tibia Proficiency
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Help the community choose the best perk combinations for every weapon. 
            Vote on your preferred proficiency perks and see what the community thinks!
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search weapons... (e.g., 'Abyss Hammer', 'Sword', 'Life Leech')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 text-lg rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
              >
                🔍 Search
              </button>
            </div>
          </form>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold transition-colors shadow-lg">
              📊 View Results
            </button>
            <button className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-semibold transition-colors shadow-lg">
              🎲 Random Weapon
            </button>
            <a 
              href="/weapon/abyss-hammer"
              className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-full font-semibold transition-colors shadow-lg text-center"
            >
              🔨 Try Abyss Hammer
            </a>
          </div>
        </div>
      </div>

      {/* Weapon Categories Grid */}
      <div className="container mx-auto px-4 pb-12">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-200">
          Choose Your Weapon Type
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {weaponCategories.map((category) => (
            <WeaponCategoryCard
              key={category.id}
              category={category}
              onClick={() => handleCategoryClick(category.id)}
            />
          ))}
        </div>

        {/* Community Stats and Donation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2">
            <CommunityStats stats={communityStats} />
          </div>
          <div>
            <DonationCard />
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            🌟 Recent Activity
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Most Voted Today */}
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl mb-2">🏆</div>
              <h3 className="font-semibold text-blue-700 dark:text-blue-300">Most Voted Today</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Falcon Battleaxe</p>
              <p className="text-xs text-gray-500">347 votes</p>
            </div>

            {/* Latest Addition */}
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl mb-2">✨</div>
              <h3 className="font-semibold text-green-700 dark:text-green-300">Latest Addition</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Soulmaimer</p>
              <p className="text-xs text-gray-500">Added 2 hours ago</p>
            </div>

            {/* Hot Debate */}
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl mb-2">🔥</div>
              <h3 className="font-semibold text-orange-700 dark:text-orange-300">Hot Debate</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Crystalline Sword</p>
              <p className="text-xs text-gray-500">89% vs 11% split</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-800 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-600 dark:text-gray-400 mb-6">
            <p className="mb-2">
              Made with ❤️ for the Tibia community
            </p>
            <p className="text-sm mb-4">
              Currently tracking {weaponCategories.reduce((total, cat) => total + cat.weaponCount, 0)} weapons across {weaponCategories.length} categories
            </p>
            
            {/* Footer Donation Note */}
            <div className="max-w-md mx-auto bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                <span className="font-semibold">💝 Enjoying this tool?</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Support the project: Send Tibia Coins to <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">Zwykly Parcel</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
