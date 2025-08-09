export default async function Home() {
  async function getHealth() {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://api:8000'
      const res = await fetch(`${apiBase}/health`, { cache: 'no-store' })
      return res.json()
    } catch {
      return { status: 'error' }
    }
  }

  const health = await getHealth()

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Find rentals near campus</h1>
          <p className="text-gray-600 mb-6 max-w-xl">Search thousands of listings with filters for price, bedrooms, distance, furnished, pets, and more.</p>
          <a href="/listings" className="inline-block bg-gray-900 text-white rounded px-4 py-2 text-sm">Start browsing</a>
        </div>
      </div>
      <div className="rounded border bg-white p-4">
        <div className="font-medium">Stack health</div>
        <pre className="text-sm mt-2">{JSON.stringify(health, null, 2)}</pre>
      </div>
    </main>
  )
}


