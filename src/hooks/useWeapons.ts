import { useQuery } from '@tanstack/react-query'
import { supabase, Tables } from '@/lib/supabase'

// Types based on our database schema
export type Weapon = Tables<'weapons'>
export type Perk = Tables<'perks'>

// Extended types for UI components
export interface WeaponWithPerks extends Weapon {
  perks: Perk[]
}

// Query Keys
export const weaponKeys = {
  all: ['weapons'] as const,
  lists: () => [...weaponKeys.all, 'list'] as const,
  list: (filters: string) => [...weaponKeys.lists(), { filters }] as const,
  details: () => [...weaponKeys.all, 'detail'] as const,
  detail: (id: string) => [...weaponKeys.details(), id] as const,
  categories: () => [...weaponKeys.all, 'categories'] as const,
}

// Hooks
type MediaJoin = { media?: { id: string; storage_path: string } | null }

export function useWeapons(weaponType?: string, initialData?: (Weapon & MediaJoin)[]) {
  return useQuery({
    queryKey: weaponKeys.list(weaponType || 'all'),
    queryFn: async (): Promise<(Weapon & MediaJoin)[]> => {
      let query = supabase.from('weapons').select(`*, media:media(*)`)
      
      if (weaponType && weaponType !== 'all') {
        query = query.eq('weapon_type', weaponType)
      }
      
      const { data, error } = await query.order('name')
      
      if (error) throw error
      
      return (data as (Weapon & MediaJoin)[]) || []
    },
    initialData,
  })
}

// Get all weapons for search functionality
export function useAllWeapons() {
  return useQuery({
    queryKey: weaponKeys.lists(),
    queryFn: async (): Promise<(Weapon & MediaJoin)[]> => {
      const { data, error } = await supabase
        .from('weapons')
        .select(`*, media:media(*)`)
        .order('name')
      
      if (error) throw error
      
      return (data as (Weapon & MediaJoin)[]) || []
    },
  })
}

export function useWeapon(id: string) {
  return useQuery({
    queryKey: weaponKeys.detail(id),
    queryFn: async (): Promise<(WeaponWithPerks & MediaJoin) | null> => {
      // Get weapon with its perks
      const { data: weapon, error: weaponError } = await supabase
        .from('weapons')
        .select(`
          *,
          media:media(*),
          perks (*, main_media:media!perks_main_media_id_fkey(*), type_media:media!perks_type_media_id_fkey(*))
        `)
        .eq('id', id)
        .single()
      
      if (weaponError) {
        if (weaponError.code === 'PGRST116') return null // Not found
        throw weaponError
      }
      
      return weapon as unknown as WeaponWithPerks & MediaJoin
    },
    enabled: !!id,
  })
}

export function useWeaponByName(name: string, initialData?: WeaponWithPerks | null) {
  return useQuery({
    queryKey: [...weaponKeys.details(), 'by-name', name],
    queryFn: async (): Promise<(WeaponWithPerks & MediaJoin) | null> => {
      // Get weapon with its perks by name
      const { data: weapon, error: weaponError } = await supabase
        .from('weapons')
        .select(`
          *,
          media:media(*),
          perks (*, main_media:media!perks_main_media_id_fkey(*), type_media:media!perks_type_media_id_fkey(*))
        `)
        .ilike('name', name)
        .single()
      
      if (weaponError) {
        if (weaponError.code === 'PGRST116') return null // Not found
        throw weaponError
      }
      
      return weapon as unknown as WeaponWithPerks & MediaJoin
    },
    enabled: !!name,
    initialData: initialData,
  })
}

export function useWeaponCategories(initialData?: { id: string; name: string; weaponCount: number }[]) {
  return useQuery({
    queryKey: weaponKeys.categories(),
    queryFn: async () => {
      // Get weapon types and count weapons in each category
      const { data, error } = await supabase
        .from('weapons')
        .select('weapon_type')
      
      if (error) throw error
      
      // Group weapons by type and count them
      const categoryCounts = data.reduce((acc, weapon) => {
        const type = weapon.weapon_type || 'Unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      // Return actual weapon types from database
      return Object.entries(categoryCounts).map(([type, count]) => ({
        id: type.toLowerCase().replace(/ /g, '-'),
        name: type,
        weaponCount: count,
      }))
    },
    initialData,
  })
}

export function useWeaponsByCategory(categoryId: string, initialData?: Weapon[]) {
  // Convert category ID back to weapon type
  const weaponType = categoryId === 'all' ? undefined : 
    categoryId.replace(/-/g, ' ')
  
  return useQuery({
    queryKey: weaponKeys.list(weaponType || 'all'),
    queryFn: async (): Promise<((Weapon & MediaJoin) & { votes: { id: string }[]; totalVotes: number })[]> => {
      let query = supabase.from('weapons').select(`
        *,
        votes (id),
        media:media(*)
      `)
      
      if (weaponType && weaponType !== 'all') {
        query = query.ilike('weapon_type', weaponType)
      }
      
      const { data, error } = await query.order('name')
      
      if (error) throw error
      
      // Calculate total votes for each weapon from the votes table
      const weaponsWithVotes = (data || []).map((weapon) => {
        const votesArray = (weapon.votes as { id: string }[]) || []
        const totalVotes = votesArray.length
        return { ...(weapon as Weapon & MediaJoin), votes: votesArray, totalVotes }
      })
      
      return weaponsWithVotes
    },
    initialData,
  })
}

export function useHotWeapons(limit: number = 10, initialData?: Weapon[]) {
  return useQuery({
    queryKey: [...weaponKeys.all, 'hot', limit],
    queryFn: async (): Promise<((Weapon & MediaJoin) & { votes: { id: string }[]; totalVotes: number })[]> => {
      // Get all weapons with their vote counts from the votes table
      const { data, error } = await supabase
        .from('weapons')
        .select(`
          *,
          votes (id),
          media:media(*)
        `)
        .order('name')
      
      if (error) throw error
      
      // Calculate total votes for each weapon and sort by vote count
      const weaponsWithVotes = (data || []).map((weapon) => {
        const votesArray = (weapon.votes as { id: string }[]) || []
        const totalVotes = votesArray.length
        return { ...(weapon as Weapon & MediaJoin), votes: votesArray, totalVotes }
      })
      
      // Sort by vote count (descending) and take the top N
      const hotWeapons = weaponsWithVotes
        .sort((a, b) => b.totalVotes - a.totalVotes)
        .slice(0, limit)
      
      return hotWeapons
    },
    initialData,
  })
}