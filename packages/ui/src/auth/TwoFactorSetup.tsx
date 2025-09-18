"use client"
import * as React from 'react'
import { Input } from '../components/input'
import { Button } from '../components/button'
import { FieldErrorText, FormRow } from '../primitives/form'
import { InputOTP } from '../primitives/input-otp'

export function TwoFactorSetup({
  setupEndpoint = '/api/auth/2fa/setup',
  verifyEndpoint = '/api/auth/2fa/verify',
  onEnabled,
}: {
  setupEndpoint?: string
  verifyEndpoint?: string
  onEnabled?: (res: any) => void
}) {
  const [secret, setSecret] = React.useState<string | null>(null)
  const [qr, setQr] = React.useState<string | null>(null)
  const [code, setCode] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(setupEndpoint, { method: 'POST' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to initialize 2FA')
        if (!mounted) return
        setSecret(json.secret ?? null)
        setQr(json.qrDataUrl ?? null)
      } catch (e: any) {
        if (!mounted) return
        setError(e.message || 'Failed to initialize 2FA')
      }
    })()
    return () => { mounted = false }
  }, [setupEndpoint])

  async function confirm(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const res = await fetch(verifyEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Invalid code')
      onEnabled?.(json)
    } catch (err: any) { setError(err.message || 'Invalid code') }
    finally { setLoading(false) }
  }

  return (
    <form className="grid gap-4" onSubmit={confirm}>
      {qr && <img src={qr} alt="TOTP QR Code" className="mx-auto h-40 w-40" />}
      {secret && <p className="text-xs text-muted-foreground break-all">Secret: {secret}</p>}
      <FormRow label="Enter code" htmlFor="otp">
        <InputOTP length={6} value={code} onChange={setCode} />
        <Input id="otp" type="hidden" value={code} readOnly />
      </FormRow>
      {error && <FieldErrorText error={error} />}
      <Button type="submit" disabled={loading || code.length < 6}>{loading ? 'Verifying…' : 'Enable 2FA'}</Button>
    </form>
  )
}

