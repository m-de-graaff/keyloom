"use client"

import { CheckIcon, Loader2, XIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useContext } from "react"

import { authDataCache } from "../lib/auth-data-cache"
import { AuthUIContext } from "../lib/auth-ui-provider"
import { cn, getLocalizedError, getSearchParam } from "../lib/utils"
import type { FetchError } from "../types/fetch-error"
import { Button } from "../components/button"
import { Card } from "../components/card"
import { Skeleton } from "../components/skeleton"
import { OrganizationCellView } from "../org/OrganizationCellView"

export interface AcceptInvitationCardProps {
  className?: string | undefined
  classNames?: {
    base?: string | undefined
    header?: string | undefined
    title?: string | undefined
    description?: string | undefined
    content?: string | undefined
    button?: string | undefined
    outlineButton?: string | undefined
    primaryButton?: string | undefined
    skeleton?: string | undefined
  } | undefined
  localization?: Partial<Record<string, string>> | undefined
}

export function useAuthData<T>({
  queryFn,
  cacheKey,
  staleTime = 10_000,
}: {
  queryFn: () => Promise<{ data: T | null; error?: FetchError | null }>
  cacheKey?: string
  staleTime?: number
}) {
  const {
    hooks: { useSession },
    toast,
    localization,
  } = useContext(AuthUIContext)!
  const { data: sessionData, isPending: sessionPending } = useSession()

  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn

  const stableCacheKey = cacheKey || queryFn.toString()

  const cacheEntry = useSyncExternalStore(
    useCallback((callback) => authDataCache.subscribe(stableCacheKey, callback), [stableCacheKey]),
    useCallback(() => authDataCache.get<T>(stableCacheKey), [stableCacheKey]),
    useCallback(() => authDataCache.get<T>(stableCacheKey), [stableCacheKey]),
  )

  const initialized = useRef(false)
  const previousUserId = useRef<string | undefined>(undefined)
  const [error, setError] = useState<FetchError | null>(null)

  const refetch = useCallback(async () => {
    const existingRequest = authDataCache.getInFlightRequest<{ data: T | null; error?: FetchError | null }>(stableCacheKey)
    if (existingRequest) {
      try {
        const result = await existingRequest
        if (result.error) setError(result.error)
        else setError(null)
      } catch (err) {
        setError(err as FetchError)
      }
      return
    }

    if (cacheEntry?.data !== undefined) authDataCache.setRefetching(stableCacheKey, true)
    const fetchPromise = queryFnRef.current()
    authDataCache.setInFlightRequest(stableCacheKey, fetchPromise)

    try {
      const { data, error } = await fetchPromise
      if (error) {
        setError(error)
        toast({ variant: "error", message: getLocalizedError({ error, localization }) })
      } else {
        setError(null)
      }
      authDataCache.set(stableCacheKey, data)
    } catch (err) {
      const error = err as FetchError
      setError(error)
      toast({ variant: "error", message: getLocalizedError({ error, localization }) })
    } finally {
      authDataCache.setRefetching(stableCacheKey, false)
      authDataCache.removeInFlightRequest(stableCacheKey)
    }
  }, [stableCacheKey, toast, localization, cacheEntry])

  useEffect(() => {
    const currentUserId = sessionData?.user?.id

    if (!sessionData) {
      authDataCache.setRefetching(stableCacheKey, false)
      authDataCache.clear(stableCacheKey)
      initialized.current = false
      previousUserId.current = undefined
      return
    }

    const userIdChanged = previousUserId.current !== undefined && previousUserId.current !== currentUserId
    if (userIdChanged) authDataCache.clear(stableCacheKey)

    const hasCachedData = cacheEntry?.data !== undefined
    const isStale = !cacheEntry || Date.now() - cacheEntry.timestamp > staleTime

    if (!initialized.current || !hasCachedData || userIdChanged || (hasCachedData && isStale)) {
      if (!hasCachedData || isStale) {
        initialized.current = true
        refetch()
      }
    }

    previousUserId.current = (currentUserId ?? undefined) as string | undefined
  }, [sessionData, sessionData?.user?.id, stableCacheKey, refetch, cacheEntry, staleTime])

  const isPending = sessionPending || (cacheEntry?.data === undefined && !error)

  return {
    data: cacheEntry?.data ?? null,
    isPending,
    isRefetching: cacheEntry?.isRefetching ?? false,
    error,
    refetch,
  }
}

export function AcceptInvitationCard({ className, classNames, localization: localizationProp }: AcceptInvitationCardProps) {
  const { localization: contextLocalization, redirectTo, replace, toast } = useContext(AuthUIContext)!

  const localization = useMemo(() => ({ ...contextLocalization, ...localizationProp }) as Record<string, string>, [contextLocalization, localizationProp])

  const {
    hooks: { useSession },
  } = useContext(AuthUIContext)!
  const { data: sessionData } = useSession()
  const [invitationId, setInvitationId] = useState<string | null>(null)

  useEffect(() => {
    const invitationIdParam = getSearchParam("invitationId")

    if (!invitationIdParam) {
      toast({ variant: "error", message: localization.INVITATION_NOT_FOUND || "Invitation not found" })
      replace(redirectTo)
      return
    }

    setInvitationId(invitationIdParam)
  }, [localization.INVITATION_NOT_FOUND, toast, replace, redirectTo])

  if (!sessionData || !invitationId) {
    return <AcceptInvitationSkeleton className={className} classNames={classNames} />
  }

  return (
    <AcceptInvitationContent className={className} classNames={classNames} localization={localization} invitationId={invitationId} />
  )
}

function AcceptInvitationContent({ className, classNames, localization: localizationProp, invitationId }: AcceptInvitationCardProps & { invitationId: string }) {
  const {
    authClient,
    hooks: { useInvitation },
    localization: contextLocalization,
    organization,
    redirectTo,
    replace,
    toast,
  } = useContext(AuthUIContext)!

  const localization = useMemo(() => ({ ...contextLocalization, ...localizationProp }) as Record<string, string>, [contextLocalization, localizationProp])

  const [isRejecting, setIsRejecting] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const isProcessing = isRejecting || isAccepting

  const { data: invitation, isPending } = (useInvitation?.({ query: { id: invitationId } }) ?? { data: null, isPending: true }) as {
    data: null | {
      id: string
      organizationId: string
      organizationName?: string
      organizationSlug?: string
      organizationLogo?: string | null
      role: string
      status: "pending" | "accepted" | "rejected"
      expiresAt: string
    }
    isPending: boolean
  }

  const getRedirectTo = useCallback(() => getSearchParam("redirectTo") || redirectTo, [redirectTo])

  useEffect(() => {
    if (isPending || !invitationId) return

    if (!invitation) {
      toast({ variant: "error", message: localization.INVITATION_NOT_FOUND || "Invitation not found" })
      replace(redirectTo)
      return
    }

    const expired = new Date(invitation.expiresAt) < new Date()
    if (invitation.status !== "pending" || expired) {
      toast({
        variant: "error",
        message: expired ? localization.INVITATION_EXPIRED || "Invitation expired" : localization.INVITATION_NOT_FOUND || "Invitation not found",
      })
      replace(redirectTo)
    }
  }, [invitation, isPending, invitationId, localization, toast, replace, redirectTo])

  const acceptInvitation = async () => {
    setIsAccepting(true)
    try {
      await authClient.organization.acceptInvitation({ invitationId, fetchOptions: { throw: true } })
      toast({ variant: "success", message: localization.INVITATION_ACCEPTED || "Invitation accepted" })
      replace(getRedirectTo())
    } catch (error) {
      toast({ variant: "error", message: getLocalizedError({ error, localization }) })
      setIsAccepting(false)
    }
  }

  const rejectInvitation = async () => {
    setIsRejecting(true)
    try {
      await authClient.organization.rejectInvitation({ invitationId, fetchOptions: { throw: true } })
      toast({ variant: "success", message: localization.INVITATION_REJECTED || "Invitation rejected" })
      replace(redirectTo)
    } catch (error) {
      toast({ variant: "error", message: getLocalizedError({ error, localization }) })
      setIsRejecting(false)
    }
  }

  const builtInRoles = [
    { role: "owner", label: localization.OWNER || "Owner" },
    { role: "admin", label: localization.ADMIN || "Admin" },
    { role: "member", label: localization.MEMBER || "Member" },
  ]

  const roles = [...builtInRoles, ...(organization?.customRoles || [])]
  const roleLabel = roles.find((r) => r.role === invitation?.role)?.label || invitation?.role

  if (!invitation) return <AcceptInvitationSkeleton className={className} classNames={classNames} />

  return (
    <Card className={cn("w-full max-w-sm", className, classNames?.base)}>
      <div className={cn("justify-items-center text-center p-4", classNames?.header)}>
        <h2 className={cn("text-lg md:text-xl", classNames?.title)}>{localization.ACCEPT_INVITATION || "Accept invitation"}</h2>
        <p className={cn("text-xs md:text-sm", classNames?.description)}>
          {localization.ACCEPT_INVITATION_DESCRIPTION || "You have been invited to join this organization"}
        </p>
      </div>

      <div className={cn("flex flex-col gap-6 truncate p-4", classNames?.content)}>
        <Card className={cn("flex-row items-center p-4")}>
          <OrganizationCellView
            organization={{ id: invitation.organizationId, name: invitation.organizationName ?? null, slug: invitation.organizationSlug ?? null, logo: invitation.organizationLogo ?? null, createdAt: new Date() }}
            localization={localization}
          />
          <p className="ms-auto text-muted-foreground text-sm">{roleLabel}</p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className={cn(classNames?.button, classNames?.outlineButton)} onClick={rejectInvitation} disabled={isProcessing}>
            {isRejecting ? <Loader2 className="animate-spin" /> : <XIcon />} {localization.REJECT || "Reject"}
          </Button>
          <Button className={cn(classNames?.button, classNames?.primaryButton)} onClick={acceptInvitation} disabled={isProcessing}>
            {isAccepting ? <Loader2 className="animate-spin" /> : <CheckIcon />} {localization.ACCEPT || "Accept"}
          </Button>
        </div>
      </div>
    </Card>
  )
}

const AcceptInvitationSkeleton = ({ className, classNames }: AcceptInvitationCardProps) => {
  return (
    <Card className={cn("w-full max-w-sm", className, classNames?.base)}>
      <div className={cn("justify-items-center p-4", classNames?.header)}>
        <Skeleton className={cn("my-1 h-5 w-full max-w-32 md:h-5.5 md:w-40", classNames?.skeleton)} />
        <Skeleton className={cn("my-0.5 h-3 w-full max-w-56 md:h-3.5 md:w-64", classNames?.skeleton)} />
      </div>
      <div className={cn("flex flex-col gap-6 truncate p-4", classNames?.content)}>
        <Card className={cn("flex-row items-center p-4")}>
          <OrganizationCellView isPending />
          <Skeleton className="mt-0.5 ms-auto h-4 w-full max-w-14 shrink-2" />
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </Card>
  )
}

