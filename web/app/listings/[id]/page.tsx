'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Map from '@/components/Map'

type ListingImage = { id: number; url: string; width?: number | null; height?: number | null }
type Listing = {
  id: number
  title: string
  description?: string | null
  price_cents: number
  bedrooms?: number | null
  bathrooms?: number | null
  furnished?: boolean | null
  pets_allowed?: boolean | null
  latitude?: number | null
  longitude?: number | null
  images?: ListingImage[]
  raw_address?: string | null
  attributes?: Record<string, any> | null
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiBase}/api/listings/${id}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Failed to load (${res.status})`)
        const json = await res.json()
        setData(json)
      } catch (e: any) {
        setError(e?.message || 'Failed to load')
      }
    }
    load()
  }, [apiBase, id])

  const markers = useMemo(() => {
    if (data?.latitude && data?.longitude) {
      return [{ id: data.id, title: data.title, lat: data.latitude, lng: data.longitude }]
    }
    return []
  }, [data])

  if (error) {
    return <div className="max-w-5xl mx-auto p-6">Error: {error}</div>
  }
  if (!data) {
    return <div className="max-w-5xl mx-auto p-6">Loading…</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {data.images && data.images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {data.images.slice(0, 6).map(img => (
              <img key={img.id} src={img.url} alt="" className="w-full h-40 object-cover rounded" />
            ))}
          </div>
        ) : (
          <div className="h-60 bg-gray-100 rounded" />
        )}
        <div className="rounded border bg-white p-4">
          <h1 className="text-xl font-semibold mb-2">{data.title}</h1>
          <div className="text-gray-700 mb-4">${(data.price_cents/100).toLocaleString(undefined, {maximumFractionDigits:0})} CAD</div>
          <div className="prose max-w-none text-sm text-gray-800 whitespace-pre-wrap">{data.description || 'No description provided.'}</div>
          <div className="mt-3 text-sm">
            <span className="text-gray-500">Original listing:</span>{' '}
            <a className="text-blue-600 underline" href={data.source_id} target="_blank" rel="noreferrer">Open</a>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded border bg-white p-4">
          <div className="font-medium mb-3">Details</div>
          <div className="text-sm text-gray-700">
            <div>{data.bedrooms ?? 'N/A'} bedrooms · {data.bathrooms ?? 'N/A'} bathrooms</div>
            <div>Furnished: {data.furnished ? 'Yes' : 'No'}</div>
            <div>Pets allowed: {data.pets_allowed ? 'Yes' : 'No'}</div>
            {data.raw_address && <div className="mt-1">Address: {data.raw_address}</div>}
            {data.attributes && (
              <div className="mt-2 space-y-1">
                {Object.entries(data.attributes).map(([k,v]) => (
                  <div key={k}><span className="text-gray-500">{k}:</span> {String(v)}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="font-medium mb-3">Map</div>
          <div className="h-64">
            <Map markers={markers} />
          </div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="font-medium mb-3">Full description</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{data.description || 'No description provided.'}</div>
        </div>
      </div>
    </div>
  )
}


