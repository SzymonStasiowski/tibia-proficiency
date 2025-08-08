import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Server-side Supabase client (can use service role key if needed)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseServer = createClient<Database>(supabaseUrl, supabaseKey)

// Server-side data fetching functions
export async function getWeaponCategories() {
  try {
    const { data, error } = await supabaseServer
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
    const categories = Object.entries(categoryCounts).map(([type, count]) => ({
      id: type.toLowerCase().replace(/ /g, '-'),
      name: type,
      weaponCount: count,
    }))
    

    return categories
  } catch (error) {
    console.error('Error fetching weapon categories:', error)
    return []
  }
}

// Removed getCommunityStats as it had no usage; reintroduce if needed.

export async function getWeaponsByCategory(categoryId: string) {
  try {
    // Convert category ID back to weapon type
    const weaponType = categoryId === 'all' ? undefined : 
      categoryId.replace(/-/g, ' ')
    

    
    // Get weapons with their vote counts from the votes table
    let query = supabaseServer.from('weapons').select(`
      *,
      votes (id)
    `)
    
    if (weaponType && weaponType !== 'all') {
      query = query.ilike('weapon_type', weaponType)
    }
    
    const { data, error } = await query.order('name')
    
    if (error) throw error
    
    // Calculate total votes for each weapon from the votes table
    const weaponsWithVotes = (data || []).map(weapon => {
      const totalVotes = (weapon.votes as any[])?.length || 0
      return {
        ...weapon,
        totalVotes
      }
    })
    

    return weaponsWithVotes
  } catch (error) {
    console.error('Error fetching weapons by category:', error)
    return []
  }
}

export async function getWeaponByName(name: string) {
  try {
    const { data: weapon, error } = await supabaseServer
      .from('weapons')
      .select(`
        *,
        perks (*)
      `)
      .ilike('name', name)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    
    return weapon
  } catch (error) {
    console.error('Error fetching weapon by name:', error)
    return null
  }
}

export async function getWeaponPerks(weaponId: string) {
  try {
    const { data, error } = await supabaseServer
      .from('perks')
      .select('*')
      .eq('weapon_id', weaponId)
      .order('tier_level')
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('Error fetching weapon perks:', error)
    return []
  }
}

export async function getAllWeapons() {
  try {
    const { data, error } = await supabaseServer
      .from('weapons')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('Error fetching all weapons:', error)
    return []
  }
}

export async function getHotWeapons(limit: number = 10) {
  try {
    // Get all weapons with their vote counts from the votes table
    const { data, error } = await supabaseServer
      .from('weapons')
      .select(`
        *,
        votes (id)
      `)
      .order('name')
    
    if (error) throw error
    
    // Calculate total votes for each weapon and sort by vote count
    const weaponsWithVotes = (data || []).map(weapon => {
      const totalVotes = (weapon.votes as any[])?.length || 0
      return {
        ...weapon,
        totalVotes
      }
    })
    
    // Sort by vote count (descending) and take the top N
    const hotWeapons = weaponsWithVotes
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, limit)
    
    return hotWeapons
  } catch (error) {
    console.error('Error fetching hot weapons:', error)
    return []
  }
}

export async function getPopularBuilds(limit: number = 10) {
  try {
    const { data, error } = await supabaseServer
      .from('popular_builds')
      .select('*')
      .order('total_votes', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching popular builds:', error)
    return []
  }
}