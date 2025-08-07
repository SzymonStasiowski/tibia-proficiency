'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts'
import { TrophyIcon } from 'lucide-react'

// Custom Tooltip Component  
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-gray-900 border border-gray-600 rounded-lg p-4 shadow-xl">
        <h3 className="text-white font-semibold text-sm mb-2">{data.fullName}</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data.fill }}
            />
            <span className="text-gray-300 text-sm">
              {data.votes} vote{data.votes !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-white font-bold">
            {data.percentage.toFixed(1)}%
          </div>
        </div>
      </div>
    )
  }
  return null
}

interface VotingResultsProps {
  perks: any[]
  votes: any[]
  isVisible?: boolean
  onEditVote?: () => void
}

interface PerkWithPercentage {
  id: string
  name: string
  description?: string
  tier_level: number
  vote_count: number
  percentage: number
  main_icon_url?: string
  color?: string
}

const COLORS = [
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#8B5A2B', // Brown
  '#6B7280'  // Gray
]

export default function VotingResults({ perks, votes, isVisible = true, onEditVote }: VotingResultsProps) {
  const resultsRef = useRef<HTMLDivElement>(null)
  const [activeSlot, setActiveSlot] = useState(0)

  // Scroll into view when results become visible
  useEffect(() => {
    if (isVisible && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      }, 300) // Small delay to let the component render
    }
  }, [isVisible])
  // Calculate voting percentages by tier
  const { resultsByTier, chartData, topPerks } = useMemo(() => {
    if (!perks.length || !votes.length) {
      return { resultsByTier: {}, chartData: [], topPerks: [] }
    }

    // Group perks by tier level
    const perksByTier = perks.reduce((acc, perk) => {
      const tier = perk.tier_level
      if (!acc[tier]) acc[tier] = []
      acc[tier].push(perk)
      return acc
    }, {} as Record<number, any[]>)

    // Count votes for each perk from all votes
    const perkVoteCounts = votes.reduce((acc, vote) => {
      if (vote.selected_perks && Array.isArray(vote.selected_perks)) {
        vote.selected_perks.forEach((perkId: string) => {
          acc[perkId] = (acc[perkId] || 0) + 1
        })
      }
      return acc
    }, {} as Record<string, number>)

    // Calculate percentages for each tier
    const results: Record<number, PerkWithPercentage[]> = {}
    const allPerksWithData: PerkWithPercentage[] = []
    
    Object.entries(perksByTier).forEach(([tierStr, tierPerks]) => {
      const tier = parseInt(tierStr)
      const typedTierPerks = tierPerks as any[]
      
      // Calculate total votes for this tier
      const totalTierVotes = typedTierPerks.reduce((sum, perk) => {
        return sum + (perkVoteCounts[perk.id] || 0)
      }, 0)
      
      // Calculate percentage for each perk in this tier
      results[tier] = typedTierPerks.map((perk, index) => {
        const voteCount = perkVoteCounts[perk.id] || 0
        const percentage = totalTierVotes > 0 ? (voteCount / totalTierVotes) * 100 : 0
        
        const perkWithData = {
          ...perk,
          vote_count: voteCount,
          percentage: Math.round(percentage * 10) / 10,
          color: COLORS[index % COLORS.length]
        }
        
        allPerksWithData.push(perkWithData)
        return perkWithData
      }).sort((a, b) => b.percentage - a.percentage)
    })

    // Create chart data for each tier
    const chartDataByTier = Object.entries(results).map(([tierStr, tierPerks]) => ({
      tier: parseInt(tierStr),
      data: tierPerks.filter(p => p.vote_count > 0).map(perk => ({
        name: perk.name.length > 15 ? perk.name.substring(0, 15) + '...' : perk.name,
        fullName: perk.name,
        votes: perk.vote_count,
        percentage: perk.percentage,
        fill: perk.color
      }))
    }))

    // Get top 3 most voted perks overall
    const topPerksOverall = allPerksWithData
      .filter(p => p.vote_count > 0)
      .sort((a, b) => b.vote_count - a.vote_count)
      .slice(0, 3)

    return { 
      resultsByTier: results, 
      chartData: chartDataByTier, 
      topPerks: topPerksOverall 
    }
  }, [perks, votes])

  const totalVotes = votes.length

  // Get available slots for tabs
  const availableSlots = Object.keys(resultsByTier).map(Number).sort((a, b) => a - b)
  
  // Set initial active slot
  useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(activeSlot)) {
      setActiveSlot(availableSlots[0])
    }
  }, [availableSlots, activeSlot])

  if (totalVotes === 0) {
    return (
      <div ref={resultsRef} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center">
          <TrophyIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-white mb-2">Community Results</h3>
          <p className="text-gray-400 text-sm">No votes yet. Be the first to vote!</p>
        </div>
      </div>
    )
  }

  const activeSlotData = chartData.find(({ tier }) => tier === activeSlot)

  return (
    <div ref={resultsRef} className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Compact Header */}
      <div className="p-4 md:p-6 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <TrophyIcon className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Community Results</h3>
            <div className="text-sm text-gray-400">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </div>
          </div>
          {onEditVote && (
            <button
              onClick={onEditVote}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium w-full sm:w-auto"
            >
              ✏️ Edit Vote
            </button>
          )}
        </div>
      </div>

      {/* Content with Vertical Tabs (Desktop) / Horizontal Tabs (Mobile) */}
      {activeSlotData && (
        <div>
          {/* Mobile Horizontal Tabs */}
          <div className="block md:hidden mt-4 px-4">
            <div className="flex overflow-x-auto gap-2 pb-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setActiveSlot(slot)}
                  className={`flex-shrink-0 px-4 py-3 text-center font-medium transition-all duration-300 rounded-lg ${
                    activeSlot === slot
                      ? 'text-white bg-blue-600'
                      : 'text-gray-400 bg-gray-700 hover:text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="text-base font-bold">Slot {slot + 1}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex">
            {/* Vertical Tabs */}
            <div className="w-24 border-r border-gray-700">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setActiveSlot(slot)}
                  className={`w-full p-4 text-center font-medium transition-all duration-300 relative ${
                    activeSlot === slot
                      ? 'text-white bg-blue-600/20'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                  }`}
                >
                  {/* Active indicator */}
                  {activeSlot === slot && (
                    <div className="absolute left-0 top-0 w-1 h-full bg-blue-600 rounded-r-full" />
                  )}
                  
                  <div className="text-2xl font-bold">{slot + 1}</div>
                </button>
              ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4">
              <div 
                key={activeSlot} 
                className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-300"
              >
              {/* Pie Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeSlotData.data}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={35}
                      fill="#8884d8"
                      dataKey="votes"
                      stroke="none"
                      strokeWidth={0}
                    >
                      {activeSlotData.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Results List */}
              <div className="space-y-2">
                {resultsByTier[activeSlot]?.map((perk, index) => (
                  <div
                    key={perk.id}
                    className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: perk.color }} />
                    
                    {perk.main_icon_url && (
                      <img 
                        src={perk.main_icon_url} 
                        alt={perk.name}
                        className="w-6 h-6 object-contain flex-shrink-0"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm truncate">{perk.name}</h4>
                      {perk.description && (
                        <p className="text-xs text-gray-400 truncate">{perk.description}</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-purple-400">{perk.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>

          {/* Mobile Content */}
          <div className="block md:hidden p-4">
            <div 
              key={activeSlot} 
              className="space-y-4 animate-in fade-in duration-300"
            >
              {/* Results List for Mobile */}
              <div className="space-y-3">
                {resultsByTier[activeSlot]?.map((perk, index) => (
                  <div
                    key={perk.id}
                    className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg"
                  >
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: perk.color }} />
                    
                    {perk.main_icon_url && (
                      <img 
                        src={perk.main_icon_url} 
                        alt={perk.name}
                        className="w-8 h-8 object-contain flex-shrink-0"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-base">{perk.name}</h4>
                      {perk.description && (
                        <p className="text-sm text-gray-400 leading-relaxed mt-1">{perk.description}</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-bold text-blue-400">{perk.percentage}%</div>
                      <div className="text-xs text-gray-500">{perk.vote_count} votes</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Chart */}
              {activeSlotData?.data && activeSlotData.data.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4 mt-4">
                  <h4 className="text-white font-medium text-sm mb-3 text-center">
                    Slot {activeSlot + 1} Distribution
                  </h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activeSlotData.data}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={30}
                          fill="#8884d8"
                          dataKey="votes"
                          stroke="none"
                          strokeWidth={0}
                        >
                          {activeSlotData.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}