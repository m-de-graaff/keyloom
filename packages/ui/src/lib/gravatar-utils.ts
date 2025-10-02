/**
 * Gravatar utility functions for generating avatar URLs and handling Gravatar integration.
 * Uses @noble/hashes for MD5 hashing of email addresses (required by Gravatar).
 */

import { md5 } from '@noble/hashes/legacy'
import { bytesToHex } from '@noble/hashes/utils'
import type {
  GravatarUrlOptions,
  GravatarImageInfo,
  GravatarDefault,
  GravatarRating,
  GravatarFormat,
} from '../types/gravatar-options'

/**
 * Default Gravatar URL generation options
 */
const DEFAULT_GRAVATAR_OPTIONS: Required<GravatarUrlOptions> = {
  size: 200,
  default: 'mp',
  forceDefault: false,
  rating: 'g',
  format: 'jpg',
  secure: true,
}

/**
 * Generates a SHA-256 hash of an email address for Gravatar lookup.
 * Email is normalized (trimmed and lowercased) before hashing.
 *
 * @param email - The email address to hash
 * @returns The SHA-256 hash as a hexadecimal string
 *
 * @example
 * ```typescript
 * const hash = hashEmail('user@example.com')
 * console.log(hash) // "b58996c504c5638798eb6b511e6f49af5d7b1f92"
 * ```
 */
export function hashEmail(email: string): string {
  try {
    // Normalize email: trim whitespace and convert to lowercase
    const normalizedEmail = email.trim().toLowerCase()

    // Generate MD5 hash (required by Gravatar)
    const hashBytes = md5(normalizedEmail)

    // Convert to hexadecimal string
    return bytesToHex(hashBytes)
  } catch (error) {
    // Fallback to a default hash if email processing fails
    console.warn('Failed to hash email for Gravatar:', error)
    return '00000000000000000000000000000000'
  }
}

/**
 * Validates Gravatar URL options and applies defaults.
 *
 * @param options - Partial Gravatar options to validate
 * @returns Validated options with defaults applied
 */
function validateGravatarOptions(
  options: Partial<GravatarUrlOptions> = {},
): Required<GravatarUrlOptions> {
  const validated = { ...DEFAULT_GRAVATAR_OPTIONS, ...options }

  // Validate size (1-2048 pixels)
  if (validated.size < 1 || validated.size > 2048) {
    console.warn(
      `Invalid Gravatar size: ${validated.size}. Using default: ${DEFAULT_GRAVATAR_OPTIONS.size}`,
    )
    validated.size = DEFAULT_GRAVATAR_OPTIONS.size
  }

  // Validate rating
  const validRatings: GravatarRating[] = ['g', 'pg', 'r', 'x']
  if (!validRatings.includes(validated.rating)) {
    console.warn(
      `Invalid Gravatar rating: ${validated.rating}. Using default: ${DEFAULT_GRAVATAR_OPTIONS.rating}`,
    )
    validated.rating = DEFAULT_GRAVATAR_OPTIONS.rating
  }

  // Validate format
  const validFormats: GravatarFormat[] = ['jpg', 'png', 'gif', 'webp']
  if (!validFormats.includes(validated.format)) {
    console.warn(
      `Invalid Gravatar format: ${validated.format}. Using default: ${DEFAULT_GRAVATAR_OPTIONS.format}`,
    )
    validated.format = DEFAULT_GRAVATAR_OPTIONS.format
  }

  return validated
}

/**
 * Generates a Gravatar URL for the given email address.
 *
 * @param email - The email address to generate a Gravatar URL for
 * @param options - Optional Gravatar configuration options
 * @returns The complete Gravatar URL
 *
 * @example
 * ```typescript
 * // Basic usage
 * const url = generateGravatarUrl('user@example.com')
 *
 * // With custom options
 * const customUrl = generateGravatarUrl('user@example.com', {
 *   size: 400,
 *   default: 'identicon',
 *   rating: 'pg'
 * })
 * ```
 */
export function generateGravatarUrl(
  email: string,
  options: Partial<GravatarUrlOptions> = {},
): string {
  try {
    const validatedOptions = validateGravatarOptions(options)
    const emailHash = hashEmail(email)

    // Choose base URL based on secure preference
    const baseUrl = validatedOptions.secure
      ? 'https://secure.gravatar.com/avatar'
      : 'http://www.gravatar.com/avatar'

    // Build query parameters
    const params = new URLSearchParams()
    params.set('s', validatedOptions.size.toString())
    params.set('d', validatedOptions.default)
    params.set('r', validatedOptions.rating)

    if (validatedOptions.forceDefault) {
      params.set('f', 'y')
    }

    // Add format extension if not jpg (default)
    const formatExtension = validatedOptions.format === 'jpg' ? '' : `.${validatedOptions.format}`

    return `${baseUrl}/${emailHash}${formatExtension}?${params.toString()}`
  } catch (error) {
    console.error('Failed to generate Gravatar URL:', error)
    // Return a fallback URL
    return generateFallbackGravatarUrl(options)
  }
}

/**
 * Generates a fallback Gravatar URL when the main generation fails.
 *
 * @param options - Optional Gravatar configuration options
 * @returns A fallback Gravatar URL
 */
function generateFallbackGravatarUrl(options: Partial<GravatarUrlOptions> = {}): string {
  const validatedOptions = validateGravatarOptions(options)
  const baseUrl = validatedOptions.secure
    ? 'https://secure.gravatar.com/avatar'
    : 'http://www.gravatar.com/avatar'

  const params = new URLSearchParams()
  params.set('s', validatedOptions.size.toString())
  params.set('d', validatedOptions.default)
  params.set('f', 'y') // Force default image

  return `${baseUrl}/00000000000000000000000000000000?${params.toString()}`
}

/**
 * Generates comprehensive Gravatar image information including URL and metadata.
 *
 * @param email - The email address to generate Gravatar info for
 * @param options - Optional Gravatar configuration options
 * @param userName - Optional user name for alt text generation
 * @returns Complete Gravatar image information
 *
 * @example
 * ```typescript
 * const info = generateGravatarInfo('user@example.com', { size: 100 }, 'John Doe')
 * console.log(info.url) // Gravatar URL
 * console.log(info.altText) // "Avatar for John Doe"
 * console.log(info.attributes) // HTML attributes object
 * ```
 */
export function generateGravatarInfo(
  email: string,
  options: Partial<GravatarUrlOptions> = {},
  userName?: string,
): GravatarImageInfo {
  const validatedOptions = validateGravatarOptions(options)
  const url = generateGravatarUrl(email, validatedOptions)
  const hash = hashEmail(email)

  // Generate alt text
  const altText = userName ? `Avatar for ${userName}` : 'User avatar'

  // Generate HTML attributes
  const attributes: Record<string, string> = {
    src: url,
    alt: altText,
    width: validatedOptions.size.toString(),
    height: validatedOptions.size.toString(),
    loading: 'lazy',
    decoding: 'async',
  }

  return {
    url,
    size: validatedOptions.size,
    isDefault: validatedOptions.forceDefault,
    hash,
    altText,
    attributes,
  }
}

/**
 * Checks if a Gravatar exists for the given email address.
 * Makes a HEAD request to check if the image exists (returns 404 if not).
 *
 * @param email - The email address to check
 * @returns Promise that resolves to true if Gravatar exists, false otherwise
 *
 * @example
 * ```typescript
 * const exists = await checkGravatarExists('user@example.com')
 * if (exists) {
 *   console.log('User has a Gravatar!')
 * } else {
 *   console.log('No Gravatar found, using fallback')
 * }
 * ```
 */
export async function checkGravatarExists(email: string): Promise<boolean> {
  try {
    const url = generateGravatarUrl(email, { default: '404' })
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch (error) {
    console.warn('Failed to check Gravatar existence:', error)
    return false
  }
}

/**
 * Preloads a Gravatar image to improve loading performance.
 *
 * @param email - The email address to preload Gravatar for
 * @param options - Optional Gravatar configuration options
 * @returns Promise that resolves when preloading is complete
 *
 * @example
 * ```typescript
 * // Preload user's Gravatar
 * await preloadGravatar('user@example.com', { size: 200 })
 * ```
 */
export async function preloadGravatar(
  email: string,
  options: Partial<GravatarUrlOptions> = {},
): Promise<void> {
  try {
    const url = generateGravatarUrl(email, options)

    // Create a link element for preloading
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = url

    // Add to document head
    document.head.appendChild(link)

    // Remove after a short delay to clean up
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link)
      }
    }, 1000)
  } catch (error) {
    console.warn('Failed to preload Gravatar:', error)
  }
}
