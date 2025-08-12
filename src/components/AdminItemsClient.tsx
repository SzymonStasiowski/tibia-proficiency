'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { getPublicUrl } from '@/lib/images'
import { NativeSelect } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type ItemRow = {
  id: string
  name: string
  category: string
  slot: string
  armor: number | null
  attributes: string | null
  resistances: string | null
  imbu_slots: number | null
  level_req: number | null
  vocation_reqs: string[] | null
  icon_media_id: string | null
  icon_url: string | null
  media?: { id: string; storage_path: string } | null
}

const categories = [
  'helmet','armor','legs','boots','shield','spellbook','quiver','amulet','ring'
]

export default function ItemsAdminClient() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | 'all'>('all')
  const [slot, setSlot] = useState<string | 'all'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id,name,category,slot,armor,attributes,resistances,imbu_slots,level_req,vocation_reqs,icon_media_id,icon_url, media:icon_media_id (id, storage_path)')
        .order('name', { ascending: true })
      if (error) throw error
      return (data || []) as ItemRow[]
    }
  })

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (data || []).filter((r) => {
      if (category !== 'all' && r.category !== category) return false
      if (slot !== 'all' && r.slot !== slot) return false
      if (!term) return true
      return (
        r.name.toLowerCase().includes(term) ||
        (r.attributes || '').toLowerCase().includes(term) ||
        (r.resistances || '').toLowerCase().includes(term)
      )
    })
  }, [data, search, category, slot])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Items Admin</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Browse scraped equipment and verify fields. Use the filters and search to spot anomalies.</p>

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <Input placeholder="Search name/attributes/resists" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <NativeSelect className="w-44" value={category} onChange={(e) => setCategory(e.target.value as any)}>
            <option value="all">All categories</option>
            {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
          </NativeSelect>
          <NativeSelect className="w-44" value={slot} onChange={(e) => setSlot(e.target.value as any)}>
            {['all','helmet','armor','legs','boots','offhand','amulet','ring'].map((s) => (
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
                      <div className="text-xs text-gray-600 dark:text-gray-400">{r.category} • {r.slot} • lvl {r.level_req ?? '—'}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-gray-50 dark:bg-gray-800 p-2"><span className="font-medium">Armor:</span> {r.armor ?? '—'}</div>
                    <div className="rounded bg-gray-50 dark:bg-gray-800 p-2"><span className="font-medium">Imbu slots:</span> {r.imbu_slots ?? '—'}</div>
                    <div className="col-span-2 rounded bg-gray-50 dark:bg-gray-800 p-2"><span className="font-medium">Attrs:</span> {r.attributes || '—'}</div>
                    <div className="col-span-2 rounded bg-gray-50 dark:bg-gray-800 p-2"><span className="font-medium">Resists:</span> {r.resistances || '—'}</div>
                    <div className="col-span-2 rounded bg-gray-50 dark:bg-gray-800 p-2"><span className="font-medium">Vocations:</span> {(r.vocation_reqs || []).join(', ') || '—'}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


