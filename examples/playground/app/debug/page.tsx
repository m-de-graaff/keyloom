'use client'

import { useEffect, useState } from 'react'

type SessionData = { session?: any; user?: any; [k: string]: unknown } | { error: string } | null

export default function DebugPage() {
  const [data, setData] = useState<SessionData>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetchSession = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' })
      const result = await response.json()
      setData(result)
      setLastFetch(new Date())
    } catch (e) {
      setData({ error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      await fetchSession() // Refresh session data
    } catch (e) {
      console.error('Logout failed:', e)
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'monospace' }}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <h1>Keyloom Debug</h1>
        <button
          type="button"
          onClick={fetchSession}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        {data && 'session' in data && data.session && (
          <button
            type="button"
            onClick={logout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        )}
      </div>

      {lastFetch && (
        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          Last updated: {lastFetch.toLocaleTimeString()}
        </p>
      )}

      <div
        style={{
          backgroundColor: '#f5f5f5',
          padding: 16,
          borderRadius: 4,
          border: '1px solid #ddd',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Session Data:</h2>
        <pre
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>Quick Actions:</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            href="/api/auth/csrf"
            style={{
              padding: '8px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            Get CSRF Token
          </a>
          <a
            href="/"
            style={{
              padding: '8px 12px',
              backgroundColor: '#6b7280',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            Home
          </a>
        </div>
      </div>
    </div>
  )
}
