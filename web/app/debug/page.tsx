'use client'

import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [apiUrl, setApiUrl] = useState<string>('')
  const [testResult, setTestResult] = useState<string>('Testing...')

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    setApiUrl(apiBase)
    
    async function testAPI() {
      try {
        console.log('Testing API at:', apiBase)
        const response = await fetch(`${apiBase}/api/listings`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        setTestResult(`✅ Success! Found ${data.length} listings`)
        console.log('API Response:', data)
        
      } catch (error: any) {
        setTestResult(`❌ Error: ${error.message}`)
        console.error('API Error:', error)
      }
    }
    
    testAPI()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Debug Information</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2">
            <p><strong>NEXT_PUBLIC_API_URL:</strong> {apiUrl}</p>
            <p><strong>Node Environment:</strong> {process.env.NODE_ENV}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">API Connection Test</h2>
          <p className="text-lg">{testResult}</p>
        </div>
      </div>
    </div>
  )
}
