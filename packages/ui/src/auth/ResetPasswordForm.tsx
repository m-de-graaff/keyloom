"use client"
import * as React from 'react'
import { Input } from '../components/input'
import { Button } from '../components/button'
import { FieldErrorText, FormRow } from '../primitives/form'

export function ResetPasswordForm({
  requestEndpoint = '/api/auth/reset/request',
  confirmEndpoint = '/api/auth/reset/confirm',
  onRequested,
  onConfirmed,
}: {
  requestEndpoint?: string
  confirmEndpoint?: string
  onRequested?: (res: any) => void
  onConfirmed?: (res: any) => void
}) {
  const [stage, setStage] = React.useState<'request' | 'confirm'>('request')
  const [email, setEmail] = React.useState('')
  const [token, setToken] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function request(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const res = await fetch(requestEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to request reset')
      onRequested?.(json); setStage('confirm')
    } catch (err: any) { setError(err.message || 'Failed to request reset') }
    finally { setLoading(false) }
  }

  async function confirmReset(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await fetch(confirmEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, token, password }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to reset password')
      onConfirmed?.(json)
    } catch (err: any) { setError(err.message || 'Failed to reset password') }
    finally { setLoading(false) }
  }

  if (stage === 'request') return (
    <form className="grid gap-4" onSubmit={request}>
      <FormRow label="Email" htmlFor="email"><Input id="email" name="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></FormRow>
      {error && <FieldErrorText error={error} />}
      <Button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</Button>
    </form>
  )

  return (
    <form className="grid gap-4" onSubmit={confirmReset}>
      <FormRow label="Email" htmlFor="email"><Input id="email" name="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></FormRow>
      <FormRow label="Token" htmlFor="token"><Input id="token" name="token" required value={token} onChange={e=>setToken(e.target.value)} /></FormRow>
      <FormRow label="New password" htmlFor="password"><Input id="password" name="password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} /></FormRow>
      <FormRow label="Confirm password" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} /></FormRow>
      {error && <FieldErrorText error={error} />}
      <Button type="submit" disabled={loading}>{loading ? 'Resetting…' : 'Reset password'}</Button>
    </form>
  )
}

