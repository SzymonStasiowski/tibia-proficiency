'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getPublicUrl } from '@/lib/images'

type ImbuementRow = {
  id: string
  name: string
  tier: number | null
  allowed_slots: string[]
  icon_url: string | null
  icon_media_id: string | null
  source_url: string | null
  media?: { id: string; storage_path: string } | null
}

const slotOptions = ['all','weapon','helmet','armor','offhand','boots','backpack'] as const

export default function AdminImbuementsClient() {
  const [search, setSearch] = useState('')
  const [slot, setSlot] = useState<(typeof slotOptions)[number]>('all')
  const [tier, setTier] = useState<'all' | '1' | '2' | '3'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-imbuements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('imbuements')
        .select('id,name,tier,allowed_slots,icon_url,icon_media_id,source_url, media:icon_media_id (id, storage_path)')
        .order('name', { ascending: true })
      if (error) throw error
      return (data || []) as ImbuementRow[]
    }
  })

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (data || []).filter((r) => {
      if (tier !== 'all' && String(r.tier || '') !== tier) return false
      if (slot !== 'all' && !(r.allowed_slots || []).includes(slot)) return false
      if (!term) return true
      return r.name.toLowerCase().includes(term)
    })
  }, [data, search, slot, tier])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Imbuements Admin</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Browse scraped imbuements, filter by tier and slot, and verify icons. Icons are shared across tiers per imbuement family.</p>

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <Input placeholder="Search name" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <NativeSelect className="w-28" value={tier} onChange={(e) => setTier(e.target.value as any)}>
            {['all','1','2','3'].map((t) => (
              <option key={t} value={t}>tier: {t}</option>
            ))}
          </NativeSelect>
          <NativeSelect className="w-40" value={slot} onChange={(e) => setSlot(e.target.value as any)}>
            {slotOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </NativeSelect>
          <span className="text-sm text-gray-600 dark:text-gray-400">{filtered.length} / {(data||[]).length} shown</span>
        </div>

        <Separator className="my-4" />

        {isLoading ? (
          <p className="text-gray-600">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((r) => (
              <Card key={r.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 relative shrink-0 bg-gray-100 dark:bg-gray-800 rounded">
                      {r.media?.storage_path ? (
                        <Image src={getPublicUrl(r.media.storage_path)} alt={r.name} fill sizes="48px" className="object-contain" />
                      ) : r.icon_url ? (
                        <Image src={r.icon_url} alt={r.name} fill sizes="48px" className="object-contain" unoptimized />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">{r.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">tier {(r.tier ?? '—')}</div>
                      <div className="text-[11px] text-gray-500 truncate">slots: {(r.allowed_slots || []).join(', ')}</div>
                    </div>
                  </div>
                  {r.source_url ? (
                    <div className="mt-2 text-[11px] text-gray-500 truncate">Source: <a href={r.source_url} target="_blank" rel="noreferrer" className="underline">Imbuing</a></div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


