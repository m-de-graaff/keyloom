"use client"
import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/dialog'
import { Input } from '../components/input'
import { Button } from '../components/button'
import { Select } from '../components/select'
import { FieldErrorText, FormRow } from '../primitives/form'

export function InviteMemberDialog({ endpoint = '/api/orgs/:id/invites', orgId, roles = ['member','admin'], onInvited, children }: { endpoint?: string; orgId: string; roles?: string[]; onInvited?: (res: any) => void; children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState(roles[0] ?? 'member')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const url = (endpoint || '').replace(':id', encodeURIComponent(orgId))
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, role }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to invite')
      onInvited?.(json); setOpen(false); setEmail('')
    } catch (err: any) { setError(err.message || 'Failed to invite') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children ?? <Button>Invite</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite member</DialogTitle></DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <FormRow label="Email" htmlFor="inv-email"><Input id="inv-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></FormRow>
          <FormRow label="Role" htmlFor="inv-role">
            <Select id="inv-role" value={role} onChange={e=>setRole(e.target.value)}>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </FormRow>
          {error && <FieldErrorText error={error} />}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send invite'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

