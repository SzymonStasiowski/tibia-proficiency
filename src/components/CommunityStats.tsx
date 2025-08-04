import { CommunityStats as StatsType } from '@/lib/mockData'
import { formatNumber } from '@/lib/utils'

interface CommunityStatsProps {
  stats: StatsType
}

export default function CommunityStats({ stats }: CommunityStatsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        📊 Community Stats
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold text-lg">
              {formatNumber(stats.totalVotesToday)}
            </span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              votes cast today
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-semibold">Most voted:</span>
            <span className="text-gray-700 dark:text-gray-300">
              {stats.mostVotedWeapon}
            </span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <span className="text-purple-500 font-semibold block mb-1">Newest weapons:</span>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {stats.recentWeapons.join(", ")}
            </div>
          </div>
          
          <div>
            <span className="text-orange-500 font-semibold block mb-1">🔥 Trending debate:</span>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              "{stats.trendingDebate}"
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 