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
export function useWeapons(weaponType?: string, initialData?: Weapon[]) {
  return useQuery({
    queryKey: weaponKeys.list(weaponType || 'all'),
    queryFn: async (): Promise<Weapon[]> => {
      let query = supabase.from('weapons').select('*')
      
      if (weaponType && weaponType !== 'all') {
        query = query.eq('weapon_type', weaponType)
      }
      
      const { data, error } = await query.order('name')
      
      if (error) throw error
      
      return data || []
    },
    initialData: initialData,
  })
}

// Get all weapons for search functionality
export function useAllWeapons() {
  return useQuery({
    queryKey: weaponKeys.lists(),
    queryFn: async (): Promise<Weapon[]> => {
      const { data, error } = await supabase
        .from('weapons')
        .select('*')
        .order('name')
      
      if (error) throw error
      
      return data || []
    },
  })
}

export function useWeapon(id: string) {
  return useQuery({
    queryKey: weaponKeys.detail(id),
    queryFn: async (): Promise<WeaponWithPerks | null> => {
      // Get weapon with its perks
      const { data: weapon, error: weaponError } = await supabase
        .from('weapons')
        .select(`
          *,
          perks (*)
        `)
        .eq('id', id)
        .single()
      
      if (weaponError) {
        if (weaponError.code === 'PGRST116') return null // Not found
        throw weaponError
      }
      
      return weapon as WeaponWithPerks
    },
    enabled: !!id,
  })
}

export function useWeaponByName(name: string, initialData?: WeaponWithPerks | null) {
  return useQuery({
    queryKey: [...weaponKeys.details(), 'by-name', name],
    queryFn: async (): Promise<WeaponWithPerks | null> => {
      // Get weapon with its perks by name
      const { data: weapon, error: weaponError } = await supabase
        .from('weapons')
        .select(`
          *,
          perks (*)
        `)
        .ilike('name', name)
        .single()
      
      if (weaponError) {
        if (weaponError.code === 'PGRST116') return null // Not found
        throw weaponError
      }
      
      return weapon as WeaponWithPerks
    },
    enabled: !!name,
    initialData: initialData,
  })
}

export function useWeaponCategories(initialData?: any[]) {
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
    initialData: initialData,
  })
}

export function useWeaponsByCategory(categoryId: string, initialData?: Weapon[]) {
  // Convert category ID back to weapon type
  const weaponType = categoryId === 'all' ? undefined : 
    categoryId.replace(/-/g, ' ')
  
  return useWeapons(weaponType, initialData)
}