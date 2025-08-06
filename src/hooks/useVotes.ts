import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Types for votes
export interface Vote {
  id?: string
  weapon_id: string
  user_session: string
  selected_perks: string[] // Array of perk IDs
  created_at?: string
}

export interface VoteSubmission {
  weapon_id: string
  selected_perks: string[]
}

export interface CommunityStats {
  totalVotes: number
  mostVotedWeapon: {
    name: string
    votes: number
  } | null
  newestWeapons: number
  trendingDebate: string
}

// Query Keys
export const voteKeys = {
  all: ['votes'] as const,
  lists: () => [...voteKeys.all, 'list'] as const,
  byWeapon: (weaponId: string) => [...voteKeys.all, 'weapon', weaponId] as const,
  stats: () => [...voteKeys.all, 'stats'] as const,
  userVotes: (userSession: string) => [...voteKeys.all, 'user', userSession] as const,
}

// Get votes for a specific weapon
export function useWeaponVotes(weaponId: string) {
  return useQuery({
    queryKey: voteKeys.byWeapon(weaponId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('weapon_id', weaponId)
      
      if (error) throw error
      
      return data || []
    },
    enabled: !!weaponId,
  })
}

// Get user's votes (to prevent duplicate voting)
export function useUserVotes(userSession: string) {
  return useQuery({
    queryKey: voteKeys.userVotes(userSession),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('user_session', userSession)
      
      if (error) throw error
      
      return data || []
    },
    enabled: !!userSession,
  })
}

// Check if user has voted for a specific weapon
export function useUserWeaponVote(weaponId: string, userSession: string) {
  return useQuery({
    queryKey: [...voteKeys.byWeapon(weaponId), 'user', userSession],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('weapon_id', weaponId)
        .eq('user_session', userSession)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      
      return data
    },
    enabled: !!weaponId && !!userSession,
  })
}

// Submit a vote
export function useSubmitVote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (voteData: VoteSubmission & { userSession: string }) => {
      // Check if user already voted for this weapon
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('weapon_id', voteData.weapon_id)
        .eq('user_session', voteData.userSession)
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
        // Create new vote
        const { data, error } = await supabase
          .from('votes')
          .insert({
            weapon_id: voteData.weapon_id,
            user_session: voteData.userSession,
            selected_perks: voteData.selected_perks,
          })
          .select()
          .single()
        
        if (error) throw error
        return data
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: voteKeys.byWeapon(variables.weapon_id) })
      queryClient.invalidateQueries({ queryKey: voteKeys.userVotes(variables.userSession) })
      queryClient.invalidateQueries({ queryKey: voteKeys.stats() })
    },
  })
}

// Get community statistics
export function useCommunityStats() {
  return useQuery({
    queryKey: voteKeys.stats(),
    queryFn: async (): Promise<CommunityStats> => {
      // Get total votes count
      const { count: totalVotes } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
      
      // Get most voted weapon
      const { data: weaponVotes } = await supabase
        .from('votes')
        .select(`
          weapon_id,
          weapons!inner(name)
        `)
      
      // Count votes per weapon
      const weaponVoteCounts = (weaponVotes || []).reduce((acc, vote) => {
        const weaponId = vote.weapon_id
        const weaponName = (vote.weapons as any)?.name || 'Unknown'
        
        if (!acc[weaponId]) {
          acc[weaponId] = { name: weaponName, count: 0 }
        }
        acc[weaponId].count++
        return acc
      }, {} as Record<string, { name: string; count: number }>)
      
      // Find most voted weapon
      const mostVotedWeapon = Object.values(weaponVoteCounts).reduce(
        (max, current) => (current.count > (max?.votes || 0) ? { name: current.name, votes: current.count } : max),
        null as { name: string; votes: number } | null
      )
      
      // Get count of weapons (as "newest weapons")
      const { count: newestWeapons } = await supabase
        .from('weapons')
        .select('*', { count: 'exact', head: true })
      
      return {
        totalVotes: totalVotes || 0,
        mostVotedWeapon,
        newestWeapons: newestWeapons || 0,
        trendingDebate: 'What perks work best for your playstyle?', // Static for now
      }
    },
  })
}

// Generate or get user session ID
export function getUserSession(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = localStorage.getItem('user_session')
  if (!sessionId) {
    sessionId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
    localStorage.setItem('user_session', sessionId)
  }
  return sessionId
}