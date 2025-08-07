import { formatNumber, weaponNameToSlug } from '@/lib/utils'
import Link from 'next/link'

interface CommunityStats {
  totalVotes: number
  mostVotedWeapon: {
    name: string
    votes: number
  } | null
  newestWeapons: number
  trendingDebate: string
}

interface CommunityStatsProps {
  stats: CommunityStats
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
              {formatNumber(stats.totalVotes)}
            </span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              total votes
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-semibold">Most voted:</span>
            {stats.mostVotedWeapon ? (
              <span className="text-gray-700 dark:text-gray-300">
                <Link 
                  href={`/weapon/${weaponNameToSlug(stats.mostVotedWeapon.name)}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline decoration-blue-600/30 hover:decoration-blue-600"
                >
                  {stats.mostVotedWeapon.name}
                </Link>
                <span className="text-xs text-gray-500 ml-1">
                  ({stats.mostVotedWeapon.votes} votes)
                </span>
              </span>
            ) : (
              <span className="text-gray-700 dark:text-gray-300">No votes yet</span>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <span className="text-purple-500 font-semibold block mb-1">Total weapons:</span>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {formatNumber(stats.newestWeapons)} weapons available
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