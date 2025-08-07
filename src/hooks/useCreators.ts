import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Tables, TablesInsert } from '@/lib/database.types'

// Types
export type Creator = Tables<'creators'>
export type CreatorInsert = TablesInsert<'creators'>
export type CreatorStats = {
  id: string
  creator_slug: string
  channel_name: string
  avatar_url: string | null
  channel_url: string | null
  platform: 'twitch' | 'youtube' | 'kick' | null
  weapons_voted: number
  total_votes: number
  last_vote_at: string | null
}

// Query keys
export const creatorKeys = {
  all: ['creators'] as const,
  bySlug: (slug: string) => [...creatorKeys.all, 'slug', slug] as const,
  byToken: (token: string) => [...creatorKeys.all, 'token', token] as const,
  stats: () => [...creatorKeys.all, 'stats'] as const,
}

// Get creator by slug (public profile)
export function useCreatorBySlug(slug: string) {
  return useQuery({
    queryKey: creatorKeys.bySlug(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('creator_slug', slug)
        .eq('is_active', true)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!slug,
  })
}

// Get creator by token (for private voting)
export function useCreatorByToken(token: string) {
  return useQuery({
    queryKey: creatorKeys.byToken(token),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('creator_token', token)
        .eq('is_active', true)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!token,
  })
}

// Get creator statistics
export function useCreatorStats(creatorSlug?: string) {
  return useQuery({
    queryKey: creatorSlug ? [...creatorKeys.stats(), creatorSlug] : creatorKeys.stats(),
    queryFn: async () => {
      let query = supabase.from('creator_stats').select('*')
      
      if (creatorSlug) {
        query = query.eq('creator_slug', creatorSlug).single()
        const { data, error } = await query
        if (error) throw error
        return data
      } else {
        const { data, error } = await query
        if (error) throw error
        return data
      }
    },
  })
}

// Get creator votes for a specific weapon
export function useCreatorVotesForWeapon(weaponId: string, creatorId?: string) {
  return useQuery({
    queryKey: ['creator-votes', weaponId, creatorId],
    queryFn: async () => {
      let query = supabase
        .from('votes')
        .select(`
          *,
          creators!inner(
            creator_slug,
            channel_name,
            avatar_url,
            platform
          )
        `)
        .eq('weapon_id', weaponId)
        .not('creator_id', 'is', null)
      
      if (creatorId) {
        query = query.eq('creator_id', creatorId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data
    },
    enabled: !!weaponId,
  })
}

// Submit creator vote (modified from existing useSubmitVote)
export function useSubmitCreatorVote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (voteData: {
      weapon_id: string
      selected_perks: string[]
      creator_token: string
    }) => {
      // First, get the creator by token
      const { data: creator, error: creatorError } = await supabase
        .from('creators')
        .select('id')
        .eq('creator_token', voteData.creator_token)
        .eq('is_active', true)
        .single()
      
      if (creatorError) throw new Error('Invalid creator token')
      
      // Check if creator already voted for this weapon
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('weapon_id', voteData.weapon_id)
        .eq('creator_id', creator.id)
        .single()
      
      if (existingVote) {
        // Update existing vote
        const { data, error } = await supabase
          .from('votes')
          .update({
            selected_perks: voteData.selected_perks,
          })
          .eq('id', existingVote.id)
          .select()
          .single()
        
        if (error) throw error
        return data
      } else {
        // Create new vote with creator session format
        const creatorSession = `creator_${creator.id}_${Date.now()}`
        
        const { data, error } = await supabase
          .from('votes')
          .insert({
            weapon_id: voteData.weapon_id,
            user_session: creatorSession,
            selected_perks: voteData.selected_perks,
            creator_id: creator.id,
          })
          .select()
          .single()
        
        if (error) throw error
        return data
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['votes', variables.weapon_id] })
      queryClient.invalidateQueries({ queryKey: ['creator-votes', variables.weapon_id] })
      queryClient.invalidateQueries({ queryKey: creatorKeys.stats() })
    },
  })
}