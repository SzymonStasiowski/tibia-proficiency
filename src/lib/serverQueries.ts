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

export async function getCommunityStats() {
  try {
    // Get total votes count
    const { count: totalVotes } = await supabaseServer
      .from('votes')
      .select('*', { count: 'exact', head: true })
    
    // Get most voted weapon
    const { data: weaponVotes } = await supabaseServer
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
    
    // Get count of weapons
    const { count: newestWeapons } = await supabaseServer
      .from('weapons')
      .select('*', { count: 'exact', head: true })
    
    return {
      totalVotes: totalVotes || 0,
      mostVotedWeapon,
      newestWeapons: newestWeapons || 0,
      trendingDebate: 'What perks work best for your playstyle?',
    }
  } catch (error) {
    console.error('Error fetching community stats:', error)
    return {
      totalVotes: 0,
      mostVotedWeapon: null,
      newestWeapons: 0,
      trendingDebate: 'What perks work best for your playstyle?',
    }
  }
}

export async function getWeaponsByCategory(categoryId: string) {
  try {
    // Convert category ID back to weapon type
    const weaponType = categoryId === 'all' ? undefined : 
      categoryId.replace(/-/g, ' ')
    

    
    // Get weapons with their perks to calculate vote counts
    let query = supabaseServer.from('weapons').select(`
      *,
      perks (vote_count)
    `)
    
    if (weaponType && weaponType !== 'all') {
      query = query.ilike('weapon_type', weaponType)
    }
    
    const { data, error } = await query.order('name')
    
    if (error) throw error
    
    // Calculate total votes for each weapon and add it to the weapon object
    const weaponsWithVotes = (data || []).map(weapon => {
      const totalVotes = (weapon.perks as any[])?.reduce((sum, perk) => sum + (perk.vote_count || 0), 0) || 0
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