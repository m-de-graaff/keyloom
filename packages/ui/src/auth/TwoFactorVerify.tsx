"use client"
import * as React from 'react'
import { Button } from '../components/button'
import { FieldErrorText, FormRow } from '../primitives/form'
import { InputOTP } from '../primitives/input-otp'

export function TwoFactorVerify({ endpoint = '/api/auth/2fa/verify', onVerified }: { endpoint?: string; onVerified?: (res: any) => void }) {
  const [code, setCode] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Invalid code')
      onVerified?.(json)
    } catch (err: any) { setError(err.message || 'Invalid code') }
    finally { setLoading(false) }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormRow label="Authentication code">
        <InputOTP length={6} value={code} onChange={setCode} />
      </FormRow>
      {error && <FieldErrorText error={error} />}
      <Button type="submit" disabled={loading || code.length < 6}>{loading ? 'Verifying…' : 'Verify'}</Button>
    </form>
  )
}

