import * as React from 'react'

export function RoleGate({ allow, current, children, fallback = null }: { allow: string | string[]; current?: string | string[] | null; children: React.ReactNode; fallback?: React.ReactNode }) {
  const need = Array.isArray(allow) ? allow : [allow]
  const have = Array.isArray(current) ? current : current ? [current] : []
  const ok = need.some((r) => have.includes(r))
  return <>{ok ? children : fallback}</>
}

