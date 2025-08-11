import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicUrl } from '@/lib/images'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return new Response('Server misconfigured', { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: media, error } = await admin
    .from('media')
    .select('id, storage_path')
    .eq('id', id)
    .single()

  if (error || !media) {
    return new Response('Not found', { status: 404 })
  }

  const publicUrl = getPublicUrl(media.storage_path)
  // Permanent redirect to the CDN-backed public URL for this content-addressed file
  const res = NextResponse.redirect(publicUrl, 308)
  res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return res
}



