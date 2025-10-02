/**
 * Centralized utility functions for Keyloom UI components.
 *
 * This module provides a comprehensive set of utility functions for:
 * - Gravatar integration and avatar generation
 * - Client-side image processing and manipulation
 * - Route/path management with consistent naming
 * - Form validation with comprehensive error handling
 *
 * All utilities are designed with:
 * - Browser compatibility and fallback handling
 * - TypeScript strict mode support
 * - Comprehensive error handling
 * - Performance optimization
 * - Accessibility considerations
 *
 * @example
 * ```typescript
 * import {
 *   generateGravatarUrl,
 *   processImageFile,
 *   validateEmail,
 *   createViewPathsConfig
 * } from '@keyloom/ui/lib'
 *
 * // Generate Gravatar URL
 * const avatarUrl = generateGravatarUrl('user@example.com', { size: 200 })
 *
 * // Process uploaded image
 * const processed = await processImageFile(file, { width: 400, height: 400 })
 *
 * // Validate email
 * const emailResult = validateEmail('user@example.com')
 *
 * // Configure view paths
 * const paths = createViewPathsConfig({
 *   auth: { basePath: '/auth' },
 *   account: { basePath: '/profile' }
 * })
 * ```
 */

// Re-export all Gravatar utilities
export {
  hashEmail,
  generateGravatarUrl,
  generateGravatarInfo,
  checkGravatarExists,
  preloadGravatar,
} from './gravatar-utils'

// Re-export all image processing utilities
export type {
  ImageProcessingOptions,
  ResizeMode,
  CropOptions,
  ProcessedImage,
} from './image-utils'

export {
  loadImageFromFile,
  loadImageFromUrl,
  resizeImage,
  cropImage,
  convertToBase64,
  validateImageFile,
  getImageDimensions,
  processImageFile,
} from './image-utils'

// Re-export all view path utilities
export type {
  AuthViewPaths,
  AccountViewPaths,
  OrganizationViewPaths,
} from './view-paths'

export {
  DEFAULT_AUTH_PATHS,
  DEFAULT_ACCOUNT_PATHS,
  DEFAULT_ORGANIZATION_PATHS,
  DEFAULT_BASE_PATHS,
  createAuthViewPaths,
  createAccountViewPaths,
  createOrganizationViewPaths,
  createViewPathsConfig,
  buildViewPath,
  extractViewPath,
  isValidViewPath,
  toKebabCase,
  getAvailableViewPaths,
} from './view-paths'

// Re-export all validation utilities
export type {
  ValidationResult,
  EmailValidationOptions,
  PasswordRequirements,
} from './validation-utils'

export {
  validateEmail,
  validatePassword,
  validateUsername,
  validateField,
  validateFields,
  areAllValid,
  getFirstError,
  getAllErrors,
} from './validation-utils'

// Re-export existing utilities for backward compatibility
export { cn } from './utils'

/**
 * Utility function to safely access nested object properties.
 *
 * @param obj - Object to access
 * @param path - Dot-separated path to the property
 * @param defaultValue - Default value if property doesn't exist
 * @returns The property value or default value
 *
 * @example
 * ```typescript
 * const user = { profile: { name: 'John' } }
 * const name = get(user, 'profile.name', 'Unknown') // 'John'
 * const age = get(user, 'profile.age', 0) // 0
 * ```
 */
export function get<T = any>(obj: Record<string, any>, path: string, defaultValue?: T): T {
  try {
    const keys = path.split('.')
    let result = obj

    for (const key of keys) {
      if (result == null || typeof result !== 'object') {
        return defaultValue as T
      }
      result = result[key]
    }

    return result !== undefined ? (result as T) : (defaultValue as T)
  } catch {
    return defaultValue as T
  }
}

/**
 * Utility function to safely set nested object properties.
 *
 * @param obj - Object to modify
 * @param path - Dot-separated path to the property
 * @param value - Value to set
 * @returns The modified object
 *
 * @example
 * ```typescript
 * const user = {}
 * set(user, 'profile.name', 'John')
 * console.log(user) // { profile: { name: 'John' } }
 * ```
 */
export function set<T = any>(
  obj: Record<string, any>,
  path: string,
  value: T,
): Record<string, any> {
  try {
    const keys = path.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {}
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = value
    return obj
  } catch {
    return obj
  }
}

/**
 * Utility function to debounce function calls.
 *
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching for:', query)
 * }, 300)
 *
 * debouncedSearch('hello') // Will only execute after 300ms of no more calls
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Utility function to throttle function calls.
 *
 * @param func - Function to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled function
 *
 * @example
 * ```typescript
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll event')
 * }, 100)
 *
 * window.addEventListener('scroll', throttledScroll)
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func(...args)
    }
  }
}

/**
 * Utility function to format file sizes in human-readable format.
 *
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted file size string
 *
 * @example
 * ```typescript
 * console.log(formatFileSize(1024)) // '1 KB'
 * console.log(formatFileSize(1048576)) // '1 MB'
 * console.log(formatFileSize(1073741824, 2)) // '1.00 GB'
 * ```
 */
export function formatFileSize(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}

/**
 * Utility function to generate a random string.
 *
 * @param length - Length of the string
 * @param charset - Character set to use
 * @returns Random string
 *
 * @example
 * ```typescript
 * const id = randomString(8) // 'aB3xY9mN'
 * const numericId = randomString(6, '0123456789') // '847392'
 * ```
 */
export function randomString(
  length: number = 8,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return result
}

/**
 * Utility function to copy text to clipboard.
 *
 * @param text - Text to copy
 * @returns Promise that resolves when copy is complete
 *
 * @example
 * ```typescript
 * try {
 *   await copyToClipboard('Hello, world!')
 *   console.log('Text copied to clipboard')
 * } catch (error) {
 *   console.error('Failed to copy text:', error)
 * }
 * ```
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }
  } catch (error) {
    throw new Error(
      `Failed to copy to clipboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
