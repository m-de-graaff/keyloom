import { clsx } from "clsx"

export function cn(...args: any[]) {
  return clsx(...args)
}

export function getSearchParam(name: string): string | null {
  if (typeof window === "undefined") return null
  const url = new URL(window.location.href)
  return url.searchParams.get(name)
}

export function getLocalizedError({ error, localization }: { error: any; localization: Record<string, string> }) {
  const message = (error?.message as string) || String(error) || "Unknown error"
  // Best-effort mapping: if the message matches a known key, use it.
  if (localization[message]) return localization[message]
  return message
}

