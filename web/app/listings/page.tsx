'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import dynamic from 'next/dynamic'

type ListingImage = { id: number; url: string; width?: number | null; height?: number | null }
type Listing = {
  id: number
  title: string
  price_cents: number
  bedrooms?: number | null
  bathrooms?: number | null
  furnished?: boolean | null
  latitude?: number | null
  longitude?: number | null
  images?: ListingImage[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json())
const Map = dynamic(() => import('@/components/Map'), { ssr: false })

export default function ListingsPage() {
  const apiBase = 'http://localhost:8000' // Fixed API URL
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Roof - Rental Listings</h1>
          <p className="text-gray-600">Discover your perfect rental home from Facebook Marketplace</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Filters</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Range (CAD)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Min"
                        min={0} 
                        type="number" 
                        value={minPrice ?? ''} 
                        onChange={e => setMinPrice(e.target.value ? Math.max(0, Number(e.target.value)) : undefined)} 
                      />
                    </div>
                    <div>
                      <input 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Max"
                        min={0} 
                        type="number" 
                        value={maxPrice ?? ''} 
                        onChange={e => setMaxPrice(e.target.value ? Math.max(0, Number(e.target.value)) : undefined)} 
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    value={bedrooms ?? ''} 
                    onChange={e => setBedrooms(e.target.value ? Number(e.target.value) : undefined)}
                  >
                    <option value="">Any</option>
                    <option value="0">Studio</option>
                    <option value="1">1 Bedroom</option>
                    <option value="2">2 Bedrooms</option>
                    <option value="3">3 Bedrooms</option>
                    <option value="4">4+ Bedrooms</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Map View</h3>
              <div className="h-80 rounded-lg overflow-hidden">
                <Map markers={markers} />
              </div>
            </div>
          </div>

          {/* Listings */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div className="text-lg font-semibold text-gray-900">
                {isLoading ? 'Loading…' : `${listings.length} listing${listings.length !== 1 ? 's' : ''} found`}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map(l => (
                <Link href={`/listings/${l.id}`} key={l.id} className="group">
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                    {/* Image or Placeholder */}
                    <div className="relative">
                      {l.images && l.images.length > 0 ? (
                        <img 
                          src={l.images[0].url} 
                          alt={l.title}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`h-48 bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center ${l.images && l.images.length > 0 ? 'hidden' : ''}`}>
                        <div className="text-center text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm">No image</p>
                        </div>
                      </div>
                      <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        ${(l.price_cents/100).toLocaleString(undefined, {maximumFractionDigits:0})}
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {l.title}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                          </svg>
                          <span>{l.bedrooms ?? 'N/A'} bd</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8 5a1 1 0 011-1h2a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H7a1 1 0 110-2h3V5z" clipRule="evenodd" />
                          </svg>
                          <span>{l.bathrooms ?? 'N/A'} ba</span>
                        </div>
                        {l.furnished !== null && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                            </svg>
                            <span>{l.furnished ? 'Furnished' : 'Unfurnished'}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">CAD Monthly</span>
                        <span className="text-blue-600 font-semibold text-sm group-hover:text-blue-700">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {listings.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings found</h3>
                <p className="text-gray-600">Try adjusting your filters or check back later for new listings.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



