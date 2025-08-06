import { useQuery } from '@tanstack/react-query'
import { supabase, Tables } from '@/lib/supabase'

export type Perk = Tables<'perks'>

// Query Keys
export const perkKeys = {
  all: ['perks'] as const,
  lists: () => [...perkKeys.all, 'list'] as const,
  list: (filters: string) => [...perkKeys.lists(), { filters }] as const,
  byWeapon: (weaponId: string) => [...perkKeys.all, 'weapon', weaponId] as const,
}

// Get perks for a specific weapon
export function useWeaponPerks(weaponId: string, initialData?: Perk[]) {
  return useQuery({
    queryKey: perkKeys.byWeapon(weaponId),
    queryFn: async (): Promise<Perk[]> => {
      const { data, error } = await supabase
        .from('perks')
        .select('*')
        .eq('weapon_id', weaponId)
        .order('tier_level')
      
      if (error) throw error
      
      return data || []
    },
    enabled: !!weaponId,
    initialData: initialData,
  })
}

// Get all perks (for admin/debug purposes)
export function useAllPerks() {
  return useQuery({
    queryKey: perkKeys.lists(),
    queryFn: async (): Promise<Perk[]> => {
      const { data, error } = await supabase
        .from('perks')
        .select('*')
        .order('name')
      
      if (error) throw error
      
      return data || []
    },
  })
}

// Get perks grouped by tier level for a weapon
export function useWeaponPerksByTier(weaponId: string) {
  return useQuery({
    queryKey: [...perkKeys.byWeapon(weaponId), 'by-tier'],
    queryFn: async (): Promise<Record<number, Perk[]>> => {
      const { data, error } = await supabase
        .from('perks')
        .select('*')
        .eq('weapon_id', weaponId)
        .order('tier_level')
      
      if (error) throw error
      
      // Group perks by tier level
      const perksByTier = (data || []).reduce((acc, perk) => {
        const tier = perk.tier_level
        if (!acc[tier]) {
          acc[tier] = []
        }
        acc[tier].push(perk)
        return acc
      }, {} as Record<number, Perk[]>)
      
      return perksByTier
    },
    enabled: !!weaponId,
  })
}