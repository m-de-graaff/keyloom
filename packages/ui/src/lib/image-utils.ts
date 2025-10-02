/**
 * Client-side image processing utilities for resizing, cropping, and format conversion.
 * Provides browser-compatible image manipulation functions with fallback handling.
 */

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  /** Target width in pixels */
  width?: number
  /** Target height in pixels */
  height?: number
  /** Image quality (0-1) for lossy formats */
  quality?: number
  /** Output format */
  format?: 'jpeg' | 'png' | 'webp'
  /** Whether to maintain aspect ratio */
  maintainAspectRatio?: boolean
  /** Background color for transparent images when converting to JPEG */
  backgroundColor?: string
}

/**
 * Image resize mode
 */
export type ResizeMode = 'contain' | 'cover' | 'fill' | 'scale-down'

/**
 * Image crop options
 */
export interface CropOptions {
  /** X coordinate of crop area */
  x: number
  /** Y coordinate of crop area */
  y: number
  /** Width of crop area */
  width: number
  /** Height of crop area */
  height: number
}

/**
 * Image processing result
 */
export interface ProcessedImage {
  /** Processed image as data URL */
  dataUrl: string
  /** Processed image as Blob */
  blob: Blob
  /** Original image dimensions */
  originalDimensions: { width: number; height: number }
  /** Processed image dimensions */
  processedDimensions: { width: number; height: number }
  /** File size in bytes */
  size: number
  /** MIME type */
  mimeType: string
}

/**
 * Default image processing options
 */
const DEFAULT_PROCESSING_OPTIONS: Required<ImageProcessingOptions> = {
  width: 200,
  height: 200,
  quality: 0.85,
  format: 'jpeg',
  maintainAspectRatio: true,
  backgroundColor: '#ffffff',
}

/**
 * Loads an image from a File or Blob object.
 *
 * @param file - The image file to load
 * @returns Promise that resolves to an HTMLImageElement
 *
 * @example
 * ```typescript
 * const file = event.target.files[0]
 * const image = await loadImageFromFile(file)
 * console.log(`Image dimensions: ${image.width}x${image.height}`)
 * ```
 */
export function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      const image = new Image()
      const url = URL.createObjectURL(file)

      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve(image)
      }

      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }

      image.src = url
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Loads an image from a data URL or regular URL.
 *
 * @param url - The image URL to load
 * @returns Promise that resolves to an HTMLImageElement
 *
 * @example
 * ```typescript
 * const image = await loadImageFromUrl('data:image/jpeg;base64,...')
 * console.log(`Image loaded: ${image.width}x${image.height}`)
 * ```
 */
export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      const image = new Image()

      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Failed to load image from URL'))

      // Handle cross-origin images
      if (!url.startsWith('data:')) {
        image.crossOrigin = 'anonymous'
      }

      image.src = url
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Calculates dimensions for resizing while maintaining aspect ratio.
 *
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param targetWidth - Target width
 * @param targetHeight - Target height
 * @param mode - Resize mode
 * @returns Calculated dimensions
 */
function calculateResizeDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight: number,
  mode: ResizeMode = 'contain',
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight
  const targetAspectRatio = targetWidth / targetHeight

  switch (mode) {
    case 'fill':
      return { width: targetWidth, height: targetHeight }

    case 'contain':
      if (aspectRatio > targetAspectRatio) {
        return { width: targetWidth, height: targetWidth / aspectRatio }
      } else {
        return { width: targetHeight * aspectRatio, height: targetHeight }
      }

    case 'cover':
      if (aspectRatio > targetAspectRatio) {
        return { width: targetHeight * aspectRatio, height: targetHeight }
      } else {
        return { width: targetWidth, height: targetWidth / aspectRatio }
      }

    case 'scale-down': {
      const containDimensions = calculateResizeDimensions(
        originalWidth,
        originalHeight,
        targetWidth,
        targetHeight,
        'contain',
      )
      return {
        width: Math.min(containDimensions.width, originalWidth),
        height: Math.min(containDimensions.height, originalHeight),
      }
    }

    default:
      return { width: targetWidth, height: targetHeight }
  }
}

/**
 * Resizes an image using canvas.
 *
 * @param image - The image to resize
 * @param options - Processing options
 * @param mode - Resize mode
 * @returns Promise that resolves to processed image data
 *
 * @example
 * ```typescript
 * const file = event.target.files[0]
 * const image = await loadImageFromFile(file)
 * const resized = await resizeImage(image, { width: 300, height: 300 })
 * console.log(`Resized to: ${resized.processedDimensions.width}x${resized.processedDimensions.height}`)
 * ```
 */
export async function resizeImage(
  image: HTMLImageElement,
  options: Partial<ImageProcessingOptions> = {},
  mode: ResizeMode = 'contain',
): Promise<ProcessedImage> {
  try {
    const opts = { ...DEFAULT_PROCESSING_OPTIONS, ...options }

    // Calculate target dimensions
    const targetDimensions = opts.maintainAspectRatio
      ? calculateResizeDimensions(image.width, image.height, opts.width, opts.height, mode)
      : { width: opts.width, height: opts.height }

    // Create canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    canvas.width = targetDimensions.width
    canvas.height = targetDimensions.height

    // Fill background for JPEG format
    if (opts.format === 'jpeg') {
      ctx.fillStyle = opts.backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // Draw resized image
    ctx.drawImage(image, 0, 0, targetDimensions.width, targetDimensions.height)

    // Convert to blob
    const mimeType = `image/${opts.format}`
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        },
        mimeType,
        opts.quality,
      )
    })

    // Generate data URL
    const dataUrl = canvas.toDataURL(mimeType, opts.quality)

    return {
      dataUrl,
      blob,
      originalDimensions: { width: image.width, height: image.height },
      processedDimensions: targetDimensions,
      size: blob.size,
      mimeType,
    }
  } catch (error) {
    throw new Error(
      `Failed to resize image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Crops an image to the specified area.
 *
 * @param image - The image to crop
 * @param cropOptions - Crop area specification
 * @param processingOptions - Additional processing options
 * @returns Promise that resolves to processed image data
 *
 * @example
 * ```typescript
 * const cropped = await cropImage(image, {
 *   x: 50, y: 50, width: 200, height: 200
 * })
 * ```
 */
export async function cropImage(
  image: HTMLImageElement,
  cropOptions: CropOptions,
  processingOptions: Partial<ImageProcessingOptions> = {},
): Promise<ProcessedImage> {
  try {
    const opts = { ...DEFAULT_PROCESSING_OPTIONS, ...processingOptions }

    // Validate crop area
    const { x, y, width, height } = cropOptions
    if (x < 0 || y < 0 || x + width > image.width || y + height > image.height) {
      throw new Error('Crop area exceeds image boundaries')
    }

    // Create canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    canvas.width = width
    canvas.height = height

    // Fill background for JPEG format
    if (opts.format === 'jpeg') {
      ctx.fillStyle = opts.backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // Draw cropped image
    ctx.drawImage(image, x, y, width, height, 0, 0, width, height)

    // Convert to blob
    const mimeType = `image/${opts.format}`
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        },
        mimeType,
        opts.quality,
      )
    })

    // Generate data URL
    const dataUrl = canvas.toDataURL(mimeType, opts.quality)

    return {
      dataUrl,
      blob,
      originalDimensions: { width: image.width, height: image.height },
      processedDimensions: { width, height },
      size: blob.size,
      mimeType,
    }
  } catch (error) {
    throw new Error(
      `Failed to crop image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Converts an image file to base64 data URL.
 *
 * @param file - The image file to convert
 * @returns Promise that resolves to base64 data URL
 *
 * @example
 * ```typescript
 * const file = event.target.files[0]
 * const base64 = await convertToBase64(file)
 * console.log(base64) // "data:image/jpeg;base64,..."
 * ```
 */
export function convertToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to convert file to base64'))
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsDataURL(file)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Validates image file type and size.
 *
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types
 * @param maxSize - Maximum file size in bytes
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```typescript
 * const validation = validateImageFile(file, ['image/jpeg', 'image/png'], 5 * 1024 * 1024)
 * if (!validation.valid) {
 *   console.error(validation.error)
 * }
 * ```
 */
export function validateImageFile(
  file: File,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: number = 5 * 1024 * 1024, // 5MB default
): { valid: boolean; error?: string } {
  try {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      }
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1)
      return {
        valid: false,
        error: `File too large. Maximum size: ${maxSizeMB}MB`,
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Gets image dimensions without loading the full image.
 *
 * @param file - The image file
 * @returns Promise that resolves to image dimensions
 *
 * @example
 * ```typescript
 * const dimensions = await getImageDimensions(file)
 * console.log(`Image is ${dimensions.width}x${dimensions.height}`)
 * ```
 */
export async function getImageDimensions(
  file: File | Blob,
): Promise<{ width: number; height: number }> {
  try {
    const image = await loadImageFromFile(file)
    return { width: image.width, height: image.height }
  } catch (error) {
    throw new Error(
      `Failed to get image dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Processes an image file with the specified options.
 * Combines loading, resizing, and format conversion in one function.
 *
 * @param file - The image file to process
 * @param options - Processing options
 * @param mode - Resize mode
 * @returns Promise that resolves to processed image data
 *
 * @example
 * ```typescript
 * const processed = await processImageFile(file, {
 *   width: 400,
 *   height: 400,
 *   format: 'webp',
 *   quality: 0.8
 * })
 * ```
 */
export async function processImageFile(
  file: File,
  options: Partial<ImageProcessingOptions> = {},
  mode: ResizeMode = 'contain',
): Promise<ProcessedImage> {
  try {
    // Validate file first
    const validation = validateImageFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Load and process image
    const image = await loadImageFromFile(file)
    return await resizeImage(image, options, mode)
  } catch (error) {
    throw new Error(
      `Failed to process image file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
