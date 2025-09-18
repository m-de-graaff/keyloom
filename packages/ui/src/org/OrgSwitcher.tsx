"use client"
import * as React from 'react'
import { Select } from '../components/select'

export type Org = { id: string; name: string }

export function OrgSwitcher({ orgs, activeOrgId, onChange }: { orgs: Org[]; activeOrgId?: string; onChange?: (orgId: string) => void }) {
  const [value, setValue] = React.useState(activeOrgId ?? orgs[0]?.id ?? '')
  React.useEffect(() => { if (activeOrgId) setValue(activeOrgId) }, [activeOrgId])
  return (
    <Select value={value} onChange={(e) => { setValue(e.target.value); onChange?.(e.target.value) }} aria-label="Organization switcher">
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </Select>
  )
}

