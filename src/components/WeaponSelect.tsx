'use client'

import { useState, useEffect, useRef } from 'react'
// Removed unused Link import
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAllWeapons } from '@/hooks'
import { weaponNameToSlug } from '@/lib/utils'

interface WeaponSelectProps {
  onWeaponSelect?: (weaponName: string) => void
  placeholder?: string
}

export default function WeaponSelect({ onWeaponSelect, placeholder }: WeaponSelectProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { data: weapons = [] } = useAllWeapons()
  
  // Filter weapons based on query
  const filteredWeapons = query.trim() === '' 
    ? weapons.slice(0, 10) // Show first 10 when no query
    : weapons
        .filter(weapon => 
          weapon.name.toLowerCase().includes(query.toLowerCase()) ||
          weapon.weapon_type?.toLowerCase().includes(query.toLowerCase()) ||
          weapon.vocation?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10)

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setSelectedIndex(-1)
    setIsOpen(true)
  }

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredWeapons.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && filteredWeapons[selectedIndex]) {
          handleWeaponSelect(filteredWeapons[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle weapon selection
  const handleWeaponSelect = (weapon: any) => {
    setQuery('')
    setIsOpen(false)
    setSelectedIndex(-1)
    
    if (onWeaponSelect) {
      // If callback provided, use it (for creator mode)
      onWeaponSelect(weapon.name)
    } else {
      // Otherwise navigate normally
      router.push(`/weapon/${weaponNameToSlug(weapon.name)}`)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      {/* Weapon Select Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder || "Select a weapon... (e.g., 'Cobra Rod', 'Falcon Battleaxe')"}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="w-full px-6 py-4 pr-12 text-lg rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {/* Dropdown Arrow */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {filteredWeapons.length > 0 ? (
            <>
              {filteredWeapons.map((weapon, index) => (
                <div
                  key={weapon.id}
                  onClick={() => handleWeaponSelect(weapon)}
                  className={`
                    px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0
                    ${index === selectedIndex 
                      ? 'bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {weapon.image_url ? (
                      <Image 
                        src={weapon.image_url} 
                        alt={weapon.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 object-contain flex-shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center text-xl flex-shrink-0">⚔️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {weapon.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {weapon.weapon_type}{weapon.vocation && ` • ${weapon.vocation}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {query.trim() && filteredWeapons.length > 10 && (
                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 text-center">
                  Showing first 10 results. Keep typing to narrow down...
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
              {query.trim() ? 'No weapons found' : 'Loading weapons...'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}