"use client"
import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../components/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/dropdown-menu'

export function UserButton({ user, onSignOut, signOutEndpoint = '/api/auth/logout' }: { user?: { name?: string | null; email?: string | null; image?: string | null }; onSignOut?: () => void; signOutEndpoint?: string }) {
  const initials = (user?.name || user?.email || '?').slice(0, 2).toUpperCase()

  async function signOut(e: React.MouseEvent) {
    e.preventDefault()
    try { await fetch(signOutEndpoint, { method: 'POST' }) } catch {}
    onSignOut?.()
    if (typeof window !== 'undefined') window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
          <Avatar>
            {user?.image ? <AvatarImage src={user.image} alt={user?.name || user?.email || 'User'} /> : <AvatarFallback>{initials}</AvatarFallback>}
          </Avatar>
          <span className="hidden sm:inline">{user?.name || user?.email || 'Account'}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <a href="/profile">Profile</a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

