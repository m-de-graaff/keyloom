"use client"

import * as React from "react"
import { useState, useContext } from "react"
import clsx from "clsx"
import { 
  KeyIcon, 
  PlusIcon, 
  CopyIcon, 
  EyeIcon,
  EyeOffIcon,
  MoreHorizontalIcon,
  CalendarIcon,
  TrashIcon,
  EditIcon,
  CheckIcon,
  Loader2,
  AlertTriangleIcon
} from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { Button } from "../components/button"
import { Input } from "../components/input"
import { Card } from "../components/card"
import { Badge } from "../components/badge"
import { FormRow, FieldErrorText } from "../primitives/form"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../components/dropdown-menu"
import type { FetchError } from "../types"

export interface ApiKey {
  id: string
  name: string
  key?: string
  prefix?: string
  lastUsed?: Date | string | null
  createdAt: Date | string
  expiresAt?: Date | string | null
  scopes?: string[]
  isActive: boolean
}

export interface ApiKeysCardProps {
  /** API keys data */
  apiKeys?: ApiKey[]
  /** Card title */
  title?: string
  /** Card description */
  description?: string
  /** Whether to show create button */
  showCreateButton?: boolean
  /** Maximum number of API keys to show initially */
  maxVisible?: number
  /** Custom CSS classes */
  className?: string
  /** API endpoints */
  endpoints?: {
    list?: string
    create?: string
    update?: string
    delete?: string
  }
  /** Custom create handler */
  onCreate?: (data: { name: string; scopes?: string[] }) => void
  /** Custom update handler */
  onUpdate?: (id: string, data: { name: string; scopes?: string[] }) => void
  /** Custom delete handler */
  onDelete?: (id: string) => void
  /** Custom success handler */
  onSuccess?: (result: any) => void
  /** Custom error handler */
  onError?: (error: FetchError) => void
  /** Custom CSS classes for different parts */
  classNames?: {
    card?: string
    header?: string
    title?: string
    description?: string
    content?: string
    keyItem?: string
    createForm?: string
    actions?: string
    button?: string
    error?: string
  }
}

export function ApiKeysCard({
  apiKeys = [],
  title,
  description,
  showCreateButton = true,
  maxVisible = 5,
  className,
  endpoints = {},
  onCreate,
  onUpdate,
  onDelete,
  onSuccess,
  onError,
  classNames,
}: ApiKeysCardProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization, toast } = context || {}

  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: "",
    scopes: [] as string[],
  })

  const handleCreateApiKey = async () => {
    setError(null)

    if (!createForm.name.trim()) {
      setError(localization?.API_KEY_NAME_REQUIRED || "API key name is required")
      return
    }

    setIsLoading(true)

    try {
      if (onCreate) {
        onCreate(createForm)
      } else {
        const response = await fetch(endpoints.create || "/api/api-keys", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createForm),
        })

        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          const errorMessage = result.error || result.message || "Failed to create API key"
          throw new Error(errorMessage)
        }

        // Show success toast
        if (toast) {
          toast({
            variant: "success",
            message: localization?.API_KEY_CREATED || "API key created successfully!",
          })
        }

        // Call custom success handler
        if (onSuccess) {
          onSuccess(result)
        }
      }

      // Reset form
      setCreateForm({ name: "", scopes: [] })
      setIsCreating(false)
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create API key"
      setError(errorMessage)

      // Show error toast
      if (toast) {
        toast({
          variant: "error",
          message: errorMessage,
        })
      }

      // Call custom error handler
      if (onError) {
        onError(err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteApiKey = async (id: string, name: string) => {
    if (!confirm(localization?.CONFIRM_DELETE_API_KEY?.replace('{name}', name) || `Are you sure you want to delete "${name}"?`)) {
      return
    }

    setIsLoading(true)

    try {
      if (onDelete) {
        onDelete(id)
      } else {
        const response = await fetch(endpoints.delete?.replace('{id}', id) || `/api/api-keys/${id}`, {
          method: "DELETE",
        })

        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          const errorMessage = result.error || result.message || "Failed to delete API key"
          throw new Error(errorMessage)
        }

        // Show success toast
        if (toast) {
          toast({
            variant: "success",
            message: localization?.API_KEY_DELETED || "API key deleted successfully",
          })
        }

        // Call custom success handler
        if (onSuccess) {
          onSuccess(result)
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to delete API key"

      // Show error toast
      if (toast) {
        toast({
          variant: "error",
          message: errorMessage,
        })
      }

      // Call custom error handler
      if (onError) {
        onError(err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyKey = async (key: string, id: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKey(id)
      
      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: localization?.API_KEY_COPIED || "API key copied to clipboard",
        })
      }

      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (err) {
      // Show error toast
      if (toast) {
        toast({
          variant: "error",
          message: localization?.COPY_FAILED || "Failed to copy to clipboard",
        })
      }
    }
  }

  const toggleKeyVisibility = (id: string) => {
    const newVisibleKeys = new Set(visibleKeys)
    if (newVisibleKeys.has(id)) {
      newVisibleKeys.delete(id)
    } else {
      newVisibleKeys.add(id)
    }
    setVisibleKeys(newVisibleKeys)
  }

  const formatKey = (key: string, prefix?: string) => {
    if (!key) return ""
    
    // If we have a prefix, show it with dots
    if (prefix) {
      return `${prefix}...${key.slice(-4)}`
    }
    
    // Otherwise show first 8 and last 4 characters
    if (key.length > 12) {
      return `${key.slice(0, 8)}...${key.slice(-4)}`
    }
    
    return key
  }

  const displayedKeys = showAll ? apiKeys : apiKeys.slice(0, maxVisible)
  const hasMore = apiKeys.length > maxVisible

  const cardTitle = title || localization?.API_KEYS || "API Keys"
  const cardDescription = description || localization?.API_KEYS_DESCRIPTION || "Manage your API keys for programmatic access."

  return (
    <Card className={clsx("p-6", classNames?.card, className)}>
      {/* Header */}
      <div className={clsx(
        "flex items-start justify-between mb-6",
        classNames?.header
      )}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <KeyIcon className="h-5 w-5 text-primary" />
            <h3 className={clsx("text-lg font-semibold", classNames?.title)}>
              {cardTitle}
            </h3>
          </div>
          {cardDescription && (
            <p className={clsx("text-sm text-muted-foreground", classNames?.description)}>
              {cardDescription}
            </p>
          )}
        </div>
        
        {showCreateButton && !isCreating && (
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            className={classNames?.button}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {localization?.CREATE_API_KEY || "Create API key"}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className={clsx("space-y-4", classNames?.content)}>
        {/* Create form */}
        {isCreating && (
          <div className={clsx(
            "p-4 border rounded-lg bg-muted/50 space-y-4",
            classNames?.createForm
          )}>
            <h4 className="font-medium">
              {localization?.CREATE_NEW_API_KEY || "Create new API key"}
            </h4>
            
            <FormRow
              label={localization?.API_KEY_NAME || "API key name"}
              htmlFor="api-key-name"
            >
              <Input
                id="api-key-name"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={localization?.ENTER_API_KEY_NAME || "Enter a descriptive name"}
                disabled={isLoading}
              />
            </FormRow>

            {error && <FieldErrorText error={error} className={classNames?.error} />}

            <div className={clsx("flex gap-2", classNames?.actions)}>
              <Button
                onClick={handleCreateApiKey}
                disabled={isLoading || !createForm.name.trim()}
                size="sm"
                className={classNames?.button}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {localization?.CREATE || "Create"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false)
                  setCreateForm({ name: "", scopes: [] })
                  setError(null)
                }}
                disabled={isLoading}
                size="sm"
                className={classNames?.button}
              >
                {localization?.CANCEL || "Cancel"}
              </Button>
            </div>
          </div>
        )}

        {/* API keys list */}
        {displayedKeys.length === 0 ? (
          <div className="text-center py-8">
            <KeyIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">
              {localization?.NO_API_KEYS || "No API keys"}
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              {localization?.NO_API_KEYS_DESCRIPTION || "You haven't created any API keys yet."}
            </p>
            {showCreateButton && !isCreating && (
              <Button
                onClick={() => setIsCreating(true)}
                size="sm"
                className={classNames?.button}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {localization?.CREATE_FIRST_API_KEY || "Create your first API key"}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedKeys.map((apiKey) => {
              const isVisible = visibleKeys.has(apiKey.id)
              const isCopied = copiedKey === apiKey.id
              const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()

              return (
                <div
                  key={apiKey.id}
                  className={clsx(
                    "flex items-center gap-3 p-3 border rounded-lg",
                    !apiKey.isActive && "opacity-60",
                    isExpired && "border-destructive/50 bg-destructive/5",
                    classNames?.keyItem
                  )}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{apiKey.name}</p>
                      {!apiKey.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          {localization?.INACTIVE || "Inactive"}
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangleIcon className="h-3 w-3 mr-1" />
                          {localization?.EXPIRED || "Expired"}
                        </Badge>
                      )}
                    </div>
                    
                    {apiKey.key && (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {isVisible ? apiKey.key : formatKey(apiKey.key, apiKey.prefix)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="h-6 w-6 p-0"
                        >
                          {isVisible ? <EyeOffIcon className="h-3 w-3" /> : <EyeIcon className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyKey(apiKey.key!, apiKey.id)}
                          className="h-6 w-6 p-0"
                        >
                          {isCopied ? <CheckIcon className="h-3 w-3 text-green-600" /> : <CopyIcon className="h-3 w-3" />}
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>
                          {localization?.CREATED || "Created"} {new Date(apiKey.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {apiKey.lastUsed && (
                        <span>
                          {localization?.LAST_USED || "Last used"} {new Date(apiKey.lastUsed).toLocaleDateString()}
                        </span>
                      )}
                      {apiKey.expiresAt && !isExpired && (
                        <span>
                          {localization?.EXPIRES || "Expires"} {new Date(apiKey.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDeleteApiKey(apiKey.id, apiKey.name)}
                        className="text-destructive"
                      >
                        <TrashIcon className="mr-2 h-4 w-4" />
                        {localization?.DELETE || "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}

            {/* Show more/less button */}
            {hasMore && (
              <Button
                variant="ghost"
                onClick={() => setShowAll(!showAll)}
                className="w-full"
              >
                {showAll 
                  ? localization?.SHOW_LESS || "Show less"
                  : localization?.SHOW_MORE?.replace('{count}', (apiKeys.length - maxVisible).toString()) || `Show ${apiKeys.length - maxVisible} more`
                }
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
