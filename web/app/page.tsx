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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
              Find Your Perfect
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Rental Home
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Roof consolidates rental listings from Facebook Marketplace with AI-powered analysis to help you discover your ideal home.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/listings" 
                className="inline-flex items-center justify-center bg-blue-600 text-white rounded-xl px-8 py-4 text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
              >
                Browse Listings
                <svg className="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
              <a 
                href="/ingest" 
                className="inline-flex items-center justify-center border-2 border-blue-600 text-blue-600 rounded-xl px-8 py-4 text-lg font-semibold hover:bg-blue-600 hover:text-white transition-colors"
              >
                Add Listings
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Roof?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our platform uses advanced AI to analyze and enhance rental listings, giving you comprehensive information to make informed decisions.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Enhanced Descriptions</h3>
            <p className="text-gray-600">
              Our AI analyzes raw listing data to provide comprehensive, detailed descriptions of each property.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Consolidated Listings</h3>
            <p className="text-gray-600">
              All Facebook Marketplace rental listings in one place, with enhanced search and filtering capabilities.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Direct Contact</h3>
            <p className="text-gray-600">
              Click through to original listings to contact property owners directly through Facebook Marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* Chrome Extension CTA */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Have a Listing to Add?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Use our Chrome extension to easily import listings from Facebook Marketplace. Our AI will analyze and enhance the listing information automatically.
          </p>
          <a 
            href="/ingest" 
            className="inline-flex items-center justify-center bg-white text-blue-600 rounded-xl px-8 py-4 text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Learn More About Our Extension
          </a>
        </div>
      </div>

      {/* System Status */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">System Status</h3>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {health.status === 'ok' ? 'All systems operational' : 'Service experiencing issues'}
            </span>
          </div>
          <details className="text-sm text-gray-600">
            <summary className="cursor-pointer hover:text-gray-900">View technical details</summary>
            <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(health, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </main>
  )
}


