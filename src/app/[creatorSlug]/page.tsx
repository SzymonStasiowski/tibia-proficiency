import { notFound } from 'next/navigation'
import CreatorProfileClient from '@/components/CreatorProfileClient'
import { supabaseServer } from '@/lib/serverQueries'

interface CreatorProfilePageProps {
  params: Promise<{ creatorSlug: string }>
}

export default async function CreatorProfilePage({ params }: CreatorProfilePageProps) {
  const { creatorSlug } = await params
  
  try {
    // Fetch creator data on the server
    const { data: creator, error } = await supabaseServer
      .from('creators')
      .select('*')
      .eq('creator_slug', creatorSlug)
      .eq('is_active', true)
      .single()
    
    if (error || !creator) {
      notFound()
    }

    // Fetch creator's votes with weapon and perk details
    const { data: creatorVotes } = await supabaseServer
      .from('votes')
      .select(`
        *,
        weapons (
          id,
          name,
          image_url,
          weapon_type,
          vocation
        )
      `)
      .eq('creator_id', creator.id)
      .order('updated_at', { ascending: false })

    // Fetch creator stats
    const { data: creatorStats } = await supabaseServer
      .from('creator_stats')
      .select('*')
      .eq('creator_slug', creatorSlug)
      .single()

    // Transform the votes data to match the expected type
    const transformedCreatorVotes = (creatorVotes || []).map(vote => ({
      ...vote,
      selected_perks: Array.isArray(vote.selected_perks) 
        ? vote.selected_perks.filter((perk): perk is string => typeof perk === 'string')
        : []
    }))

    return (
      <CreatorProfileClient 
        creator={creator}
        creatorVotes={transformedCreatorVotes}
        creatorStats={creatorStats}
      />
    )
  } catch (error) {
    console.error('Error in CreatorProfilePage:', error)
    notFound()
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CreatorProfilePageProps) {
  const { creatorSlug } = await params
  
  const { data: creator } = await supabaseServer
    .from('creators')
    .select('channel_name, avatar_url, platform')
    .eq('creator_slug', creatorSlug)
    .eq('is_active', true)
    .single()

  if (!creator) {
    return {
      title: 'Creator Not Found - TibiaVote',
    }
  }

  return {
    title: `${creator.channel_name} - Creator Profile | TibiaVote`,
    description: `Check out ${creator.channel_name}'s weapon recommendations and builds for Tibia. See what perks this ${creator.platform} creator recommends for each weapon.`,
    openGraph: {
      title: `${creator.channel_name} - Creator Profile`,
      description: `${creator.channel_name}'s weapon recommendations on TibiaVote`,
      images: creator.avatar_url ? [creator.avatar_url] : [],
    },
  }
}

export const dynamic = 'force-dynamic'