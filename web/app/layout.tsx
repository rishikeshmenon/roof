import './styles.css'
import 'leaflet/dist/leaflet.css'
import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="font-semibold text-lg">Roof</div>
            <nav className="text-sm text-gray-600 space-x-4">
              <a href="/" className="hover:text-gray-900">Home</a>
              <a href="/listings" className="hover:text-gray-900">Browse</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}


