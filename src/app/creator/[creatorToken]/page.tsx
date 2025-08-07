import { notFound } from 'next/navigation'
import CreatorVotingClient from '@/components/CreatorVotingClient'
import { isValidCreatorToken } from '@/lib/utils'

interface CreatorVotingPageProps {
  params: Promise<{ creatorToken: string }>
}

export default async function CreatorVotingPage({ params }: CreatorVotingPageProps) {
  const { creatorToken } = await params
  
  // Validate token format
  if (!isValidCreatorToken(creatorToken)) {
    notFound()
  }

  return (
    <CreatorVotingClient creatorToken={creatorToken} />
  )
}

// Don't generate static params for creator pages (they're private and dynamic)
export const dynamic = 'force-dynamic'