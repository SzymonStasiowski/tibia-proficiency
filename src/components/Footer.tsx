'use client'

import { useState } from 'react'

export default function Footer() {
  const [copied, setCopied] = useState(false)

  const copyNickname = async () => {
    try {
      await navigator.clipboard.writeText('Zwykly Parcel')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">
                <span style={{ color: '#9146FF' }}>tibia</span><span style={{ color: '#53FC18' }}>vote</span>
              </h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Community-driven weapon proficiency builder for Tibia. Build, vote, and discover the best perk combinations for every weapon.
            </p>
          </div>

          {/* Support Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-pink-500">💖</span>
              Support This Project
            </h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Like this tool? Tip some Tibia Coins to:
            </p>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-base text-blue-400 font-mono">
                  Zwykly Parcel
                </div>
                <button
                  onClick={copyNickname}
                  title="Copy nickname"
                  className="p-2 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              {copied && (
                <div className="text-xs text-green-500 mt-1">Copied to clipboard!</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <div>
              2025 tibiavote
            </div>
            <div className="flex items-center gap-4">
              <span>Made with ❤️ for the Tibia community</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}