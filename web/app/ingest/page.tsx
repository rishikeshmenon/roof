'use client'

import { useState } from 'react'

export default function IngestPage() {
  const [url, setUrl] = useState('')
  const [rawHtml, setRawHtml] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`${apiBase}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: url, raw_html: rawHtml }),
      })
      const json = await res.json()
      setResult(json)
    } catch (err) {
      setResult({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Ingest a listing</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700">Source URL</label>
          <input className="mt-1 w-full border rounded px-3 py-2" placeholder="https://www.facebook.com/marketplace/item/..." value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Raw HTML (optional)</label>
          <textarea className="mt-1 w-full border rounded px-3 py-2 h-40" placeholder="Paste page source or snippet (optional)" value={rawHtml} onChange={e => setRawHtml(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="bg-gray-900 text-white rounded px-4 py-2 text-sm disabled:opacity-50">{loading ? 'Saving…' : 'Save'}</button>
      </form>

      {result && (
        <div className="rounded border bg-white p-4">
          <div className="font-medium mb-2">Result</div>
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          {result?.created_listing_id && (
            <a href={`/listings/${result.created_listing_id}`} className="inline-block mt-3 text-sm text-blue-600 underline">View listing</a>
          )}
        </div>
      )}
    </div>
  )
}


