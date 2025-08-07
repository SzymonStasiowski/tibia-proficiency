'use client'

import BuildCard from './BuildCard'
import type { PopularBuild } from '@/hooks/useBuilds'
import { useBuildPerks } from '@/hooks/useBuilds'

interface MostVotedBuildsProps {
  builds: PopularBuild[]
}

export default function MostVotedBuilds({ builds }: MostVotedBuildsProps) {
  // Extract build IDs for fetching perks
  const buildIds = builds.map(build => build.id)
  
  // Fetch perks for all builds
  const { data: buildPerksMap = {}, isLoading: perksLoading } = useBuildPerks(buildIds)

  if (!builds || builds.length === 0) {
    return (
      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">
            🏆 <span className="text-yellow-500">Most Voted Builds</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Top community builds across all weapons
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-8 shadow-lg text-center max-w-4xl mx-auto">
          <p className="text-gray-600 dark:text-gray-400">No builds available yet. Be the first to create a build!</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          🏆 <span className="text-yellow-500">Most Voted Builds</span>
        </h2>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300">
          Top community builds across all weapons
        </p>
      </div>
      
      {perksLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading build details...</p>
        </div>
      ) : (
        <div className="grid gap-4 max-w-6xl mx-auto">
          {builds.map((build, index) => (
            <BuildCard
              key={build.id}
              build={build}
              perks={buildPerksMap[build.id] || []}
              showRank={index + 1}
              hideVoting={true}
            />
          ))}
        </div>
      )}

      {builds.length >= 10 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing top {builds.length} most voted builds
          </p>
        </div>
      )}
    </div>
  )
}