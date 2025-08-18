'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Map from '@/components/Map'

type ListingImage = { id: number; url: string; width?: number | null; height?: number | null }
type Listing = {
  id: number
  title: string
  description?: string | null
  ai_description?: string | null
  price_cents: number
  bedrooms?: number | null
  bathrooms?: number | null
  furnished?: boolean | null
  pets_allowed?: boolean | null
  availability?: string | null
  original_url?: string | null
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
  const apiBase = 'http://localhost:8000' // Fixed API URL

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{data.title}</h1>
          <div className="flex items-center gap-4 text-gray-600">
            <div className="text-3xl font-bold text-blue-600">
              ${(data.price_cents/100).toLocaleString(undefined, {maximumFractionDigits:0})} CAD
            </div>
            {data.raw_address && (
              <div className="flex items-center gap-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{data.raw_address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-8">
            {/* Image Gallery */}
            {data.images && data.images.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {data.images.slice(0, 6).map((img, index) => (
                    <div key={img.id} className={`relative overflow-hidden rounded-xl ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                      <img 
                        src={img.url} 
                        alt={`Property image ${index + 1}`} 
                        className={`w-full object-cover hover:scale-105 transition-transform duration-300 ${index === 0 ? 'h-80' : 'h-40'}`}
                        onError={(e) => {
                          console.log('Image load error:', img.url)
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-80 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  <p>No images available</p>
                </div>
              </div>
            )}

            {/* AI-Generated Description */}
            {data.ai_description && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">AI Analysis</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Enhanced</span>
                </div>
                <div className="prose max-w-none text-gray-700 leading-relaxed">
                  {data.ai_description.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-3">{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Original Description */}
            {data.description && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Original Description</h2>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">From Facebook</span>
                </div>
                <div className="prose max-w-none text-gray-700 leading-relaxed">
                  {data.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-3">{paragraph}</p>
                  ))}
                </div>
              </div>
            )}


          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Property Details</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Bedrooms</span>
                  <span className="font-semibold">{data.bedrooms ?? 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Bathrooms</span>
                  <span className="font-semibold">{data.bathrooms ?? 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Furnished</span>
                  <span className={`font-semibold ${data.furnished ? 'text-green-600' : data.furnished === false ? 'text-red-600' : 'text-gray-500'}`}>
                    {data.furnished === null ? 'N/A' : data.furnished ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Pets Allowed</span>
                  <span className={`font-semibold ${data.pets_allowed ? 'text-green-600' : data.pets_allowed === false ? 'text-red-600' : 'text-gray-500'}`}>
                    {data.pets_allowed === null ? 'N/A' : data.pets_allowed ? 'Yes' : 'No'}
                  </span>
                </div>
                {data.availability && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-gray-600 block text-sm">Availability</span>
                    <span className="font-semibold text-green-800">{data.availability}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact CTA */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-3">Interested?</h3>
              <p className="text-blue-100 mb-4">Contact the owner directly through the original listing</p>
              <a 
                href={data.original_url || data.source_id} 
                target="_blank" 
                rel="noreferrer"
                className="block w-full bg-white text-blue-600 font-semibold py-3 px-4 rounded-lg text-center hover:bg-blue-50 transition-colors"
              >
                View Original Listing
              </a>
            </div>

            {/* Map */}
            {markers.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Location</h3>
                <div className="h-64 rounded-lg overflow-hidden">
                  <Map markers={markers} />
                </div>
              </div>
            )}

            {/* Additional Attributes */}
            {data.attributes && Object.keys(data.attributes).length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Additional Features</h3>
                <div className="space-y-3">
                  {Object.entries(data.attributes).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-semibold">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


