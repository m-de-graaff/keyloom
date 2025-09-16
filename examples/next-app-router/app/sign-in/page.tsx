'use client';

import { useState } from 'react';

function getCsrf() {
  const part = document.cookie.split('; ').find(x => x.startsWith('__keyloom_csrf='));
  return part?.split('=')[1] ?? '';
}

export default function SignIn() {
  const [email, setEmail] = useState('dev@example.com');
  const [password, setPassword] = useState('password');
  const [msg, setMsg] = useState('');

  async function ensureCsrf() { 
    await fetch('/api/auth/csrf', { cache: 'no-store' }); 
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault(); 
    await ensureCsrf();
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 
        'content-type': 'application/json', 
        'x-keyloom-csrf': getCsrf() 
      },
      body: JSON.stringify({ email, password })
    });
    const result = await r.json();
    setMsg(JSON.stringify(result));
    if (r.ok) {
      setMsg('Registration successful! You can now login.');
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault(); 
    await ensureCsrf();
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 
        'content-type': 'application/json', 
        'x-keyloom-csrf': getCsrf() 
      },
      body: JSON.stringify({ email, password })
    });
    const result = await r.json();
    if (r.ok) {
      setMsg('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } else {
      setMsg(JSON.stringify(result));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Keyloom
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={onLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onRegister}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white border-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Register
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign In
            </button>
          </div>

          {msg && (
            <div className="mt-4 p-3 bg-gray-100 border rounded-md">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{msg}</pre>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
