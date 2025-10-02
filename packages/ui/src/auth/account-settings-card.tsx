"use client"

import * as React from "react"
import { useState, useContext } from "react"
import clsx from "clsx"
import { 
  EditIcon, 
  SaveIcon, 
  XIcon, 
  Loader2,
  UserIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  LinkIcon,
  BuildingIcon
} from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { Button } from "../components/button"
import { Input } from "../components/input"
import { Card } from "../components/card"
import { FormRow, FieldErrorText } from "../primitives/form"
import { UserAvatar } from "./user-avatar"
import type { FetchError } from "../types"

export interface AccountSettingsCardProps {
  /** User data */
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string | null
    bio?: string | null
    website?: string | null
    location?: string | null
    company?: string | null
    jobTitle?: string | null
    phone?: string | null
    [key: string]: any
  }
  /** Card title */
  title?: string
  /** Card description */
  description?: string
  /** Fields to show/edit */
  fields?: Array<{
    key: string
    label: string
    type?: 'text' | 'email' | 'url' | 'tel' | 'textarea'
    placeholder?: string
    required?: boolean
    disabled?: boolean
    icon?: React.ComponentType<{ className?: string }>
  }>
  /** API endpoint for updates */
  updateEndpoint?: string
  /** Whether the card is initially in edit mode */
  initialEditMode?: boolean
  /** Custom CSS classes */
  className?: string
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
    field?: string
    actions?: string
    button?: string
    error?: string
  }
}

export function AccountSettingsCard({
  user,
  title,
  description,
  fields,
  updateEndpoint = "/api/account/update",
  initialEditMode = false,
  className,
  onSuccess,
  onError,
  classNames,
}: AccountSettingsCardProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization, toast } = context || {}

  const [isEditing, setIsEditing] = useState(initialEditMode)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>(user || {})
  const [error, setError] = useState<string | null>(null)

  // Default fields for profile settings
  const defaultFields = [
    {
      key: "name",
      label: localization?.FULL_NAME || "Full name",
      type: "text" as const,
      placeholder: localization?.ENTER_FULL_NAME || "Enter your full name",
      icon: UserIcon,
    },
    {
      key: "email",
      label: localization?.EMAIL || "Email",
      type: "email" as const,
      placeholder: localization?.ENTER_EMAIL || "Enter your email",
      icon: MailIcon,
    },
    {
      key: "username",
      label: localization?.USERNAME || "Username",
      type: "text" as const,
      placeholder: localization?.ENTER_USERNAME || "Enter your username",
      icon: UserIcon,
    },
    {
      key: "bio",
      label: localization?.BIO || "Bio",
      type: "textarea" as const,
      placeholder: localization?.ENTER_BIO || "Tell us about yourself",
    },
    {
      key: "website",
      label: localization?.WEBSITE || "Website",
      type: "url" as const,
      placeholder: localization?.ENTER_WEBSITE || "https://example.com",
      icon: LinkIcon,
    },
    {
      key: "location",
      label: localization?.LOCATION || "Location",
      type: "text" as const,
      placeholder: localization?.ENTER_LOCATION || "City, Country",
      icon: MapPinIcon,
    },
    {
      key: "company",
      label: localization?.COMPANY || "Company",
      type: "text" as const,
      placeholder: localization?.ENTER_COMPANY || "Company name",
      icon: BuildingIcon,
    },
    {
      key: "jobTitle",
      label: localization?.JOB_TITLE || "Job title",
      type: "text" as const,
      placeholder: localization?.ENTER_JOB_TITLE || "Your job title",
    },
    {
      key: "phone",
      label: localization?.PHONE || "Phone",
      type: "tel" as const,
      placeholder: localization?.ENTER_PHONE || "+1 (555) 123-4567",
      icon: PhoneIcon,
    },
  ]

  const fieldsToShow = fields || defaultFields.filter(field => 
    user && user[field.key] !== undefined
  )

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(updateEndpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Failed to update profile"
        throw new Error(errorMessage)
      }

      setIsEditing(false)

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: localization?.PROFILE_UPDATED || "Profile updated successfully!",
        })
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update profile"
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

  const handleCancel = () => {
    setFormData(user || {})
    setError(null)
    setIsEditing(false)
  }

  const cardTitle = title || localization?.PROFILE_SETTINGS || "Profile Settings"
  const cardDescription = description || localization?.PROFILE_SETTINGS_DESCRIPTION || "Update your personal information and profile details."

  return (
    <Card className={clsx("p-6", classNames?.card, className)}>
      {/* Header */}
      <div className={clsx(
        "flex items-start justify-between mb-6",
        classNames?.header
      )}>
        <div className="space-y-1">
          <h3 className={clsx("text-lg font-semibold", classNames?.title)}>
            {cardTitle}
          </h3>
          {cardDescription && (
            <p className={clsx("text-sm text-muted-foreground", classNames?.description)}>
              {cardDescription}
            </p>
          )}
        </div>
        
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className={classNames?.button}
          >
            <EditIcon className="h-4 w-4 mr-2" />
            {localization?.EDIT || "Edit"}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className={clsx("space-y-4", classNames?.content)}>
        {/* Avatar (if showing profile fields) */}
        {fieldsToShow.some(field => field.key === 'name' || field.key === 'email') && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <UserAvatar user={formData} size="lg" />
            <div>
              <p className="font-medium">
                {formData.name || formData.username || formData.email || localization?.UNNAMED_USER || "Unnamed User"}
              </p>
              {formData.email && formData.email !== formData.name && (
                <p className="text-sm text-muted-foreground">{formData.email}</p>
              )}
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="grid gap-4">
          {fieldsToShow.map((field) => {
            const Icon = field.icon
            const value = formData[field.key] || ""

            if (!isEditing) {
              // Display mode
              if (!value) return null

              return (
                <div key={field.key} className={clsx("flex items-center gap-3", classNames?.field)}>
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {field.type === 'url' && value ? (
                        <a 
                          href={value.startsWith('http') ? value : `https://${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {value}
                        </a>
                      ) : (
                        value
                      )}
                    </p>
                  </div>
                </div>
              )
            }

            // Edit mode
            return (
              <FormRow
                key={field.key}
                label={field.label}
                htmlFor={field.key}
                className={classNames?.field}
              >
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.key}
                    name={field.key}
                    value={value}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={field.disabled || isLoading}
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                ) : (
                  <Input
                    id={field.key}
                    name={field.key}
                    type={field.type || 'text'}
                    value={value}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    disabled={field.disabled || isLoading}
                  />
                )}
              </FormRow>
            )
          })}
        </div>

        {/* Error message */}
        {error && (
          <FieldErrorText error={error} className={classNames?.error} />
        )}

        {/* Actions */}
        {isEditing && (
          <div className={clsx("flex gap-2 pt-4", classNames?.actions)}>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className={classNames?.button}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <SaveIcon className="h-4 w-4 mr-2" />
              {localization?.SAVE || "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className={classNames?.button}
            >
              <XIcon className="h-4 w-4 mr-2" />
              {localization?.CANCEL || "Cancel"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
