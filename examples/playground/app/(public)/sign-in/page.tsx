'use client'
import { useState } from 'react'

export default function SignIn() {
  const [email, setEmail] = useState('keyloom@test.local')
  const [password, setPassword] = useState('password')
  const [msg, setMsg] = useState('')

  async function csrf() {
    await fetch('/api/auth/csrf', { cache: 'no-store' })
  }

  async function register(ev: React.MouseEvent<HTMLButtonElement>) {
    ev.preventDefault()
    await csrf()
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-keyloom-csrf': getCsrfFromCookie(),
      },
      body: JSON.stringify({ email, password }),
    })
    setMsg(JSON.stringify(await r.json()))
  }
  async function login(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    await csrf()
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-keyloom-csrf': getCsrfFromCookie(),
      },
      body: JSON.stringify({ email, password }),
    })
    setMsg(JSON.stringify(await r.json()))
  }

  function getCsrfFromCookie() {
    const x = document.cookie.split('; ').find((x) => x.startsWith('__keyloom_csrf='))
    return x?.split('=')[1] ?? ''
  }

  return (
    <form className="p-6 space-y-3" onSubmit={login}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
      />
      <div className="space-x-2">
        <button type="button" onClick={register}>
          Register
        </button>
        <button type="submit">Login</button>
      </div>
      <div className="pt-4">
        <a className="underline" href="/api/auth/oauth/dev/start?callbackUrl=/dashboard">Continue with Dev Provider</a>
      </div>
      <pre>{msg}</pre>
    </form>
  )
}
