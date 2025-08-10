'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import dynamic from 'next/dynamic'

type Listing = {
  id: number
  title: string
  price_cents: number
  bedrooms?: number | null
  bathrooms?: number | null
  furnished?: boolean | null
  latitude?: number | null
  longitude?: number | null
}

const fetcher = (url: string) => fetch(url).then(r => r.json())
const Map = dynamic(() => import('@/components/Map'), { ssr: false })

export default function ListingsPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const [minPrice, setMinPrice] = useState<number | undefined>()
  const [maxPrice, setMaxPrice] = useState<number | undefined>()
  const [bedrooms, setBedrooms] = useState<number | undefined>()

  const qs = new URLSearchParams()
  if (minPrice !== undefined && minPrice >= 0) qs.set('min_price', String(minPrice))
  if (maxPrice !== undefined && maxPrice >= 0) qs.set('max_price', String(maxPrice))
  if (bedrooms !== undefined) qs.set('bedrooms', String(bedrooms))
  const url = `${apiBase}/api/listings?${qs.toString()}`

  const { data, isLoading } = useSWR<Listing[]>(url, fetcher)
  const listings = data ?? []

  const markers = useMemo(
    () => listings.filter(l => l.latitude && l.longitude).map(l => ({
      id: l.id,
      title: l.title,
      lat: l.latitude as number,
      lng: l.longitude as number,
    })),
    [listings]
  )

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="rounded border bg-white p-4">
          <div className="font-medium mb-3">Filters</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600">Min price (CAD)</label>
              <input className="mt-1 w-full border rounded px-2 py-1" min={0} type="number" value={minPrice ?? ''} onChange={e => setMinPrice(e.target.value ? Math.max(0, Number(e.target.value)) : undefined)} />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Max price (CAD)</label>
              <input className="mt-1 w-full border rounded px-2 py-1" min={0} type="number" value={maxPrice ?? ''} onChange={e => setMaxPrice(e.target.value ? Math.max(0, Number(e.target.value)) : undefined)} />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Bedrooms</label>
              <select className="mt-1 w-full border rounded px-2 py-1" value={bedrooms ?? ''} onChange={e => setBedrooms(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">Any</option>
                <option value="0">Studio</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4+</option>
              </select>
            </div>
          </div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="font-medium mb-3">Map</div>
          <div className="h-80">
            <Map markers={markers} />
          </div>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">{isLoading ? 'Loading…' : `${listings.length} results`}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map(l => (
            <Link href={`/listings/${l.id}`} key={l.id} className="rounded border bg-white p-4 hover:shadow-sm transition">
              <div className="font-medium mb-1 truncate">{l.title}</div>
              <div className="text-sm text-gray-700">${(l.price_cents/100).toLocaleString(undefined, {maximumFractionDigits:0})} CAD</div>
              <div className="text-xs text-gray-500">{l.bedrooms ?? 'N/A'} bd · {l.bathrooms ?? 'N/A'} ba</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}



