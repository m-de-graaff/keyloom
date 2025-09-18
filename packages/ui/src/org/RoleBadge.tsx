import * as React from 'react'
import { Badge } from '../components/badge'

export function RoleBadge({ role }: { role: string }) {
  const variant = role === 'owner' ? 'primary' : role === 'admin' ? 'warning' : 'default'
  return <Badge variant={variant as any}>{role}</Badge>
}

