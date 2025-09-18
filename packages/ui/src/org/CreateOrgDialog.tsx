"use client"
import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/dialog'
import { Input } from '../components/input'
import { Button } from '../components/button'
import { FieldErrorText, FormRow } from '../primitives/form'

export function CreateOrgDialog({ endpoint = '/api/orgs', onCreated, children }: { endpoint?: string; onCreated?: (res: any) => void; children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, slug: slug || undefined }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to create organization')
      onCreated?.(json); setOpen(false); setName(''); setSlug('')
    } catch (err: any) { setError(err.message || 'Failed to create organization') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? <Button>Create organization</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <FormRow label="Name" htmlFor="org-name"><Input id="org-name" value={name} onChange={e=>setName(e.target.value)} required /></FormRow>
          <FormRow label="Slug (optional)" htmlFor="org-slug"><Input id="org-slug" value={slug} onChange={e=>setSlug(e.target.value)} /></FormRow>
          {error && <FieldErrorText error={error} />}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

