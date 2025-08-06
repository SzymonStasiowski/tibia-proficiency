'use client'

import { useState } from 'react'

export default function DonationCard() {
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
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border-2 border-yellow-200 dark:border-yellow-800 shadow-lg">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="text-2xl text-pink-500">💖</div>
          <h3 className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
            Support This Project
          </h3>
        </div>
        <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 leading-relaxed">
          Like this? Tip some TC to
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-300 dark:border-yellow-700">
          <div className="flex items-center justify-center gap-2">
            <div className="font-bold text-lg text-blue-600 dark:text-blue-400 font-mono">
              Zwykly Parcel
            </div>
            <button
              onClick={copyNickname}
              title="Copy nickname"
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 