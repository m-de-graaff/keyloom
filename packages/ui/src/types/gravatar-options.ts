/**
 * Gravatar integration configuration options.
 * These types define how Gravatar avatars should be integrated and displayed.
 */

/**
 * Gravatar image rating levels
 * @see https://docs.gravatar.com/general/images/#rating
 */
export type GravatarRating = 'g' | 'pg' | 'r' | 'x'

/**
 * Gravatar default image options
 * @see https://docs.gravatar.com/general/images/#default-image
 */
export type GravatarDefault = 
  | '404'          // Return 404 if no image found
  | 'mp'           // Mystery person (default)
  | 'identicon'    // Geometric pattern based on email hash
  | 'monsterid'    // Generated monster with different colors, faces, etc
  | 'wavatar'      // Generated faces with differing features and backgrounds
  | 'retro'        // 8-bit arcade-style pixelated faces
  | 'robohash'     // Generated robot with different colors, faces, etc
  | 'blank'        // Transparent PNG image
  | string         // Custom URL to default image

/**
 * Gravatar image format options
 */
export type GravatarFormat = 'jpg' | 'png' | 'gif' | 'webp'

/**
 * Gravatar URL generation options
 */
export interface GravatarUrlOptions {
  /** Image size in pixels (1-2048) @default 200 */
  size?: number
  
  /** Default image to use if no Gravatar exists @default 'mp' */
  default?: GravatarDefault
  
  /** Force default image even if Gravatar exists @default false */
  forceDefault?: boolean
  
  /** Maximum rating level allowed @default 'g' */
  rating?: GravatarRating
  
  /** Image format @default 'jpg' */
  format?: GravatarFormat
  
  /** Use secure HTTPS URLs @default true */
  secure?: boolean
}

/**
 * Gravatar integration input options (what developers configure)
 */
export interface GravatarOptions {
  /** Whether Gravatar integration is enabled @default true */
  enabled?: boolean
  
  /** Default URL generation options */
  defaultOptions?: GravatarUrlOptions
  
  /** Cache configuration */
  cache?: {
    /** Whether to cache Gravatar URLs @default true */
    enabled?: boolean
    
    /** Cache duration in seconds @default 3600 (1 hour) */
    duration?: number
    
    /** Maximum cache size (number of entries) @default 1000 */
    maxSize?: number
  }
  
  /** Fallback configuration */
  fallback?: {
    /** Whether to show fallback avatars @default true */
    enabled?: boolean
    
    /** Custom fallback image URL */
    imageUrl?: string
    
    /** Fallback background color (hex) @default '#f3f4f6' */
    backgroundColor?: string
    
    /** Fallback text color (hex) @default '#6b7280' */
    textColor?: string
    
    /** Whether to show user initials as fallback @default true */
    showInitials?: boolean
    
    /** Font family for initials @default 'system-ui, sans-serif' */
    fontFamily?: string
  }
  
  /** Privacy configuration */
  privacy?: {
    /** Whether to hash email addresses before sending to Gravatar @default true */
    hashEmails?: boolean
    
    /** Whether to use secure URLs only @default true */
    secureOnly?: boolean
    
    /** Whether to respect user's privacy preferences @default true */
    respectPrivacy?: boolean
  }
  
  /** Performance configuration */
  performance?: {
    /** Whether to preload Gravatar images @default false */
    preload?: boolean
    
    /** Whether to use lazy loading @default true */
    lazyLoad?: boolean
    
    /** Image loading strategy */
    loading?: 'eager' | 'lazy'
    
    /** Whether to use responsive images @default false */
    responsive?: boolean
    
    /** Available sizes for responsive images */
    responsiveSizes?: number[]
  }
  
  /** Accessibility configuration */
  accessibility?: {
    /** Default alt text for Gravatar images @default 'User avatar' */
    defaultAltText?: string
    
    /** Whether to include user name in alt text @default true */
    includeNameInAlt?: boolean
    
    /** Whether to add ARIA labels @default true */
    addAriaLabels?: boolean
  }
  
  /** Custom styling */
  styling?: {
    /** Default CSS classes to apply */
    className?: string
    
    /** Border radius (CSS value) @default '50%' */
    borderRadius?: string
    
    /** Border width (CSS value) @default '0' */
    borderWidth?: string
    
    /** Border color (CSS value) @default 'transparent' */
    borderColor?: string
    
    /** Box shadow (CSS value) */
    boxShadow?: string
    
    /** Custom CSS properties */
    customStyles?: Record<string, string>
  }
}

/**
 * Resolved Gravatar context (after processing options with defaults)
 */
export interface GravatarContext {
  /** Whether Gravatar integration is enabled */
  enabled: boolean
  
  /** Resolved default URL generation options */
  defaultOptions: Required<GravatarUrlOptions>
  
  /** Resolved cache configuration */
  cache: {
    enabled: boolean
    duration: number
    maxSize: number
  }
  
  /** Resolved fallback configuration */
  fallback: {
    enabled: boolean
    imageUrl?: string
    backgroundColor: string
    textColor: string
    showInitials: boolean
    fontFamily: string
  }
  
  /** Resolved privacy configuration */
  privacy: {
    hashEmails: boolean
    secureOnly: boolean
    respectPrivacy: boolean
  }
  
  /** Resolved performance configuration */
  performance: {
    preload: boolean
    lazyLoad: boolean
    loading: 'eager' | 'lazy'
    responsive: boolean
    responsiveSizes: number[]
  }
  
  /** Resolved accessibility configuration */
  accessibility: {
    defaultAltText: string
    includeNameInAlt: boolean
    addAriaLabels: boolean
  }
  
  /** Resolved styling configuration */
  styling: {
    className: string
    borderRadius: string
    borderWidth: string
    borderColor: string
    boxShadow?: string
    customStyles: Record<string, string>
  }
}

/**
 * Gravatar image information
 */
export interface GravatarImageInfo {
  /** Generated Gravatar URL */
  url: string
  
  /** Image size in pixels */
  size: number
  
  /** Whether this is a default image (no Gravatar found) */
  isDefault: boolean
  
  /** Email hash used for Gravatar lookup */
  hash: string
  
  /** Alt text for the image */
  altText: string
  
  /** Additional HTML attributes */
  attributes: Record<string, string>
}
