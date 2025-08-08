import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Tables, TablesInsert } from '@/lib/database.types'

// Types for builds
export type Build = Tables<'builds'>
export type BuildInsert = TablesInsert<'builds'>
export type BuildVote = Tables<'build_votes'>
export type PopularBuild = Tables<'popular_builds'>

// Common situation tags for builds (simplified to 3 core tags)
export const SITUATION_TAGS = {
  SOLO: 'solo',
  TEAM: 'team', 
  BOSSES: 'bosses'
} as const

export type SituationTag = typeof SITUATION_TAGS[keyof typeof SITUATION_TAGS]

// Query keys for React Query caching
export const buildKeys = {
  all: ['builds'] as const,
  byWeapon: (weaponId: string) => [...buildKeys.all, 'weapon', weaponId] as const,
  byId: (buildId: string) => [...buildKeys.all, 'id', buildId] as const,
  popular: (limit?: number) => [...buildKeys.all, 'popular', limit] as const,
  bySituation: (tags: string[]) => [...buildKeys.all, 'situation', tags] as const,
  userVotes: (userSession: string) => [...buildKeys.all, 'votes', userSession] as const,
  votes: (buildId: string) => [...buildKeys.all, 'votes', 'build', buildId] as const,
}

// ============================================================================
// FETCH HOOKS
// ============================================================================

/**
 * Get all builds for a specific weapon
 */
export function useWeaponBuilds(weaponId: string, initialData?: Build[]) {
  return useQuery({
    queryKey: buildKeys.byWeapon(weaponId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .eq('weapon_id', weaponId)
        .order('vote_count', { ascending: false })
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!weaponId,
    initialData,
  })
}

/**
 * Get a specific build by ID
 */
export function useBuild(buildId: string) {
  return useQuery({
    queryKey: buildKeys.byId(buildId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .eq('id', buildId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!buildId,
  })
}

/**
 * Get popular builds across all weapons
 */
export function usePopularBuilds(limit: number = 10, initialData?: PopularBuild[]) {
  return useQuery({
    queryKey: buildKeys.popular(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('popular_builds')
        .select('*')
        .order('total_votes', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      const builds = (data || []) as PopularBuild[]

      // Enrich with weapon media by querying weapons table
      const weaponIds = Array.from(new Set(builds.map(b => b.weapon_id)))
      if (weaponIds.length === 0) return builds
      const { data: weapons } = await supabase
        .from('weapons')
        .select('id, image_url, image_media_id, media:media(*)')
        .in('id', weaponIds)
      const idToMedia: Record<string, any> = {}
      ;(weapons || []).forEach(w => { idToMedia[w.id] = (w as any).media || null })

      return builds.map(b => ({ ...b, media: idToMedia[b.weapon_id] || null })) as any
    },
    initialData,
  })
}

/**
 * Get builds filtered by situation tags
 */
export function useBuildsBySituation(tags: string[], weaponId?: string) {
  return useQuery({
    queryKey: buildKeys.bySituation(tags),
    queryFn: async () => {
      let query = supabase
        .from('builds')
        .select('*')
        .overlaps('situation_tags', tags)
        .order('vote_count', { ascending: false })
      
      if (weaponId) {
        query = query.eq('weapon_id', weaponId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    },
    enabled: tags.length > 0,
  })
}

/**
 * Get perks for specific builds
 */
export function useBuildPerks(buildIds: string[]) {
  return useQuery({
    queryKey: [...buildKeys.all, 'perks', buildIds.sort()],
    queryFn: async () => {
      if (buildIds.length === 0) return {}
      
      // Get all unique perk IDs from all builds
      const { data: builds, error: buildsError } = await supabase
        .from('builds')
        .select('id, selected_perks')
        .in('id', buildIds)
      
      if (buildsError) throw buildsError
      
      // Extract all unique perk IDs
      const allPerkIds = new Set<string>()
      const buildPerkMap: Record<string, string[]> = {}
      
      builds?.forEach(build => {
        const perkIds = Array.isArray(build.selected_perks) 
          ? build.selected_perks.filter((id): id is string => typeof id === 'string')
          : []
        
        buildPerkMap[build.id] = perkIds
        perkIds.forEach(id => allPerkIds.add(id))
      })
      
      // Fetch all unique perks
      const { data: perks, error: perksError } = await supabase
        .from('perks')
        .select('*, main_media:media!perks_main_media_id_fkey(*), type_media:media!perks_type_media_id_fkey(*)')
        .in('id', Array.from(allPerkIds))
      
      if (perksError) throw perksError
      
      // Create lookup map for perks
      const perkLookup: Record<string, (Tables<'perks'> & { main_media?: any; type_media?: any })> = {}
      ;(perks || []).forEach((perk) => {
        perkLookup[perk.id] = perk as any
      })
      
      // Return perks organized by build ID
      const result: Record<string, (Tables<'perks'> & { main_media?: any; type_media?: any })[]> = {}
      Object.entries(buildPerkMap).forEach(([buildId, perkIds]) => {
        result[buildId] = perkIds.map(id => perkLookup[id]).filter(Boolean)
      })
      
      return result
    },
    enabled: buildIds.length > 0,
  })
}

/**
 * Get user's build votes to check what they've voted for
 */
export function useUserBuildVotes(userSession: string) {
  return useQuery({
    queryKey: buildKeys.userVotes(userSession),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('build_votes')
        .select('build_id')
        .eq('user_session', userSession)
      
      if (error) throw error
      return data?.map(vote => vote.build_id) || []
    },
    enabled: !!userSession,
  })
}

/**
 * Get votes for a specific build
 */
export function useBuildVotes(buildId: string) {
  return useQuery({
    queryKey: buildKeys.votes(buildId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('build_votes')
        .select('*')
        .eq('build_id', buildId)
      
      if (error) throw error
      return data || []
    },
    enabled: !!buildId,
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new build
 */
export function useCreateBuild() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (buildData: {
      weapon_id: string
      name: string
      description?: string
      situation_tags?: string[]
      selected_perks: string[]
      user_session?: string
      creator_id?: string
    }) => {
      // Validate that either user_session or creator_id is provided
      if (!buildData.user_session && !buildData.creator_id) {
        throw new Error('Either user_session or creator_id must be provided')
      }

      const { data, error } = await supabase
        .from('builds')
        .insert({
          weapon_id: buildData.weapon_id,
          name: buildData.name.trim(),
          description: buildData.description?.trim() || null,
          situation_tags: buildData.situation_tags || null,
          selected_perks: buildData.selected_perks,
          user_session: buildData.user_session || null,
          creator_id: buildData.creator_id || null,
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: buildKeys.byWeapon(data.weapon_id) })
      queryClient.invalidateQueries({ queryKey: buildKeys.popular() })
      if (data.situation_tags) {
        queryClient.invalidateQueries({ queryKey: buildKeys.bySituation(data.situation_tags) })
      }
    },
  })
}

/**
 * Vote for a build
 */
export function useVoteForBuild() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (voteData: {
      build_id: string
      user_session?: string
      creator_id?: string
    }) => {
      // Validate that either user_session or creator_id is provided
      if (!voteData.user_session && !voteData.creator_id) {
        throw new Error('Either user_session or creator_id must be provided')
      }

      // Check if user already voted for this build
      const { data: existingVote } = await supabase
        .from('build_votes')
        .select('id')
        .eq('build_id', voteData.build_id)
        .eq('user_session', voteData.user_session || '')
        .maybeSingle()
      
      if (existingVote) {
        throw new Error('You have already voted for this build')
      }

      const { data, error } = await supabase
        .from('build_votes')
        .insert({
          build_id: voteData.build_id,
          user_session: voteData.user_session || '',
          creator_id: voteData.creator_id || null,
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: async (_data, variables) => {
      // Get the build to know which weapon to invalidate
      const { data: build } = await supabase
        .from('builds')
        .select('weapon_id')
        .eq('id', variables.build_id)
        .single()
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: buildKeys.votes(variables.build_id) })
      queryClient.invalidateQueries({ queryKey: buildKeys.popular() })
      if (build) {
        queryClient.invalidateQueries({ queryKey: buildKeys.byWeapon(build.weapon_id) })
      }
      if (variables.user_session) {
        queryClient.invalidateQueries({ queryKey: buildKeys.userVotes(variables.user_session) })
      }
    },
  })
}

/**
 * Remove vote from a build
 */
export function useRemoveVoteFromBuild() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (voteData: {
      build_id: string
      user_session?: string
      creator_id?: string
    }) => {
      let query = supabase
        .from('build_votes')
        .delete()
        .eq('build_id', voteData.build_id)

      if (voteData.user_session) {
        query = query.eq('user_session', voteData.user_session)
      } else if (voteData.creator_id) {
        query = query.eq('creator_id', voteData.creator_id)
      } else {
        throw new Error('Either user_session or creator_id must be provided')
      }

      const { error } = await query
      
      if (error) throw error
      return { success: true }
    },
    onSuccess: async (_result, variables) => {
      // Get the build to know which weapon to invalidate
      const { data: build } = await supabase
        .from('builds')
        .select('weapon_id')
        .eq('id', variables.build_id)
        .single()
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: buildKeys.votes(variables.build_id) })
      queryClient.invalidateQueries({ queryKey: buildKeys.popular() })
      if (build) {
        queryClient.invalidateQueries({ queryKey: buildKeys.byWeapon(build.weapon_id) })
      }
      if (variables.user_session) {
        queryClient.invalidateQueries({ queryKey: buildKeys.userVotes(variables.user_session) })
      }
    },
  })
}

/**
 * Update an existing build (only by creator)
 */
export function useUpdateBuild() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (updateData: {
      build_id: string
      name?: string
      description?: string
      situation_tags?: string[]
      user_session?: string
      creator_id?: string
    }) => {
      const updatePayload: any = {}
      
      if (updateData.name) {
        updatePayload.name = updateData.name.trim()
      }
      if (updateData.description !== undefined) {
        updatePayload.description = updateData.description?.trim() || null
      }
      if (updateData.situation_tags !== undefined) {
        updatePayload.situation_tags = updateData.situation_tags
      }

      let query = supabase
        .from('builds')
        .update(updatePayload)
        .eq('id', updateData.build_id)

      // Only allow updates by the original creator
      if (updateData.user_session) {
        query = query.eq('user_session', updateData.user_session)
      } else if (updateData.creator_id) {
        query = query.eq('creator_id', updateData.creator_id)
      } else {
        throw new Error('Either user_session or creator_id must be provided')
      }

      const { data, error } = await query.select().single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: buildKeys.byId(data.id) })
      queryClient.invalidateQueries({ queryKey: buildKeys.byWeapon(data.weapon_id) })
      queryClient.invalidateQueries({ queryKey: buildKeys.popular() })
    },
  })
}

/**
 * Delete a build (only by creator)
 */
export function useDeleteBuild() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (deleteData: {
      build_id: string
      user_session?: string
      creator_id?: string
    }) => {
      let query = supabase
        .from('builds')
        .delete()
        .eq('id', deleteData.build_id)

      // Only allow deletion by the original creator
      if (deleteData.user_session) {
        query = query.eq('user_session', deleteData.user_session)
      } else if (deleteData.creator_id) {
        query = query.eq('creator_id', deleteData.creator_id)
      } else {
        throw new Error('Either user_session or creator_id must be provided')
      }

      const { error } = await query
      
      if (error) throw error
      return { success: true }
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: buildKeys.all })
    },
  })
}