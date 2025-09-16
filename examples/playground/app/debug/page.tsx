'use client'

import { useEffect, useState } from 'react'

type SessionData = { id?: string; [k: string]: unknown } | { error: string } | null

export default function DebugPage() {
  const [data, setData] = useState<SessionData>(null)
  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setData({ error: String(e) }))
  }, [])
  return <pre style={{ padding: 16 }}>{JSON.stringify(data, null, 2)}</pre>
}
