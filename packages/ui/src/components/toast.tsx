"use client"
import * as React from 'react'

export type ToastItem = { id: string; title?: string; description?: string }

const Ctx = React.createContext<{
  items: ToastItem[]
  push: (t: Omit<ToastItem,'id'> & { id?: string }) => string
  remove: (id: string) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const push = React.useCallback((t: Omit<ToastItem,'id'> & { id?: string }) => {
    const id = t.id ?? Math.random().toString(36).slice(2)
    setItems((xs) => [...xs, { id, ...t }])
    setTimeout(() => setItems((xs) => xs.filter(i => i.id !== id)), 4000)
    return id
  }, [])
  const remove = React.useCallback((id: string) => setItems(xs => xs.filter(i => i.id !== id)), [])
  return <Ctx.Provider value={{ items, push, remove }}>
    {children}
    <div className="fixed bottom-4 right-4 z-[1500] space-y-2">
      {items.map(i => (
        <div key={i.id} className="rounded-md border bg-background p-3 shadow-md">
          {i.title && <div className="text-sm font-medium">{i.title}</div>}
          {i.description && <div className="text-sm text-muted-foreground">{i.description}</div>}
        </div>
      ))}
    </div>
  </Ctx.Provider>
}

export function useToast() {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

