/**
 * Theme and styling configuration options.
 * These types define how the UI components should be styled and themed.
 */

/**
 * Available color schemes
 */
export type ColorScheme = 'light' | 'dark' | 'auto'

/**
 * Available component sizes
 */
export type ComponentSize = 'sm' | 'md' | 'lg'

/**
 * Available border radius options
 */
export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

/**
 * Color palette configuration
 */
export interface ColorPalette {
  /** Primary brand color */
  primary: string
  /** Secondary brand color */
  secondary?: string
  /** Accent color for highlights */
  accent?: string
  /** Success state color */
  success?: string
  /** Warning state color */
  warning?: string
  /** Error state color */
  error?: string
  /** Info state color */
  info?: string
  /** Neutral/gray colors */
  neutral?: {
    50?: string
    100?: string
    200?: string
    300?: string
    400?: string
    500?: string
    600?: string
    700?: string
    800?: string
    900?: string
    950?: string
  }
}

/**
 * Typography configuration
 */
export interface TypographyConfig {
  /** Font family for body text */
  fontFamily?: string
  /** Font family for headings */
  headingFontFamily?: string
  /** Font family for monospace text */
  monoFontFamily?: string
  /** Base font size */
  fontSize?: string
  /** Line height multiplier */
  lineHeight?: number
  /** Font weight for normal text */
  fontWeight?: number
  /** Font weight for bold text */
  boldFontWeight?: number
}

/**
 * Spacing configuration
 */
export interface SpacingConfig {
  /** Base spacing unit (in rem) */
  baseUnit?: number
  /** Spacing scale multipliers */
  scale?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
    '3xl'?: number
  }
}

/**
 * Component styling configuration
 */
export interface ComponentStyling {
  /** Button styling */
  button?: {
    /** Default button size */
    defaultSize?: ComponentSize
    /** Border radius */
    borderRadius?: BorderRadius
    /** Font weight */
    fontWeight?: number
    /** Padding scale */
    padding?: Record<ComponentSize, string>
  }

  /** Input styling */
  input?: {
    /** Default input size */
    defaultSize?: ComponentSize
    /** Border radius */
    borderRadius?: BorderRadius
    /** Border width */
    borderWidth?: string
    /** Focus ring width */
    focusRingWidth?: string
    /** Padding scale */
    padding?: Record<ComponentSize, string>
  }

  /** Card styling */
  card?: {
    /** Border radius */
    borderRadius?: BorderRadius
    /** Border width */
    borderWidth?: string
    /** Shadow level */
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
    /** Padding */
    padding?: string
  }

  /** Modal styling */
  modal?: {
    /** Border radius */
    borderRadius?: BorderRadius
    /** Backdrop blur */
    backdropBlur?: string
    /** Maximum width */
    maxWidth?: string
    /** Padding */
    padding?: string
  }
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  /** Whether animations are enabled */
  enabled?: boolean
  /** Animation duration scale */
  duration?: {
    fast?: string
    normal?: string
    slow?: string
  }
  /** Animation easing functions */
  easing?: {
    linear?: string
    easeIn?: string
    easeOut?: string
    easeInOut?: string
  }
  /** Transition properties */
  transitions?: {
    colors?: string
    opacity?: string
    transform?: string
    all?: string
  }
}

/**
 * Theme input options (what developers configure)
 */
export interface ThemeOptions {
  /** Color scheme preference @default 'auto' */
  colorScheme?: ColorScheme

  /** Whether to respect user's system preference @default true */
  respectSystemPreference?: boolean

  /** Color palette configuration */
  colors?: ColorPalette

  /** Typography configuration */
  typography?: TypographyConfig

  /** Spacing configuration */
  spacing?: SpacingConfig

  /** Component styling configuration */
  components?: ComponentStyling

  /** Animation configuration */
  animations?: AnimationConfig

  /** Custom CSS variables */
  cssVariables?: Record<string, string>

  /** Custom CSS classes */
  customClasses?: {
    /** Global container class */
    container?: string
    /** Form wrapper class */
    form?: string
    /** Button wrapper class */
    button?: string
    /** Input wrapper class */
    input?: string
    /** Card wrapper class */
    card?: string
    /** Modal wrapper class */
    modal?: string
  }

  /** Theme switching configuration */
  switching?: {
    /** Whether theme switching is enabled @default true */
    enabled?: boolean
    /** Storage key for theme preference @default 'keyloom-theme' */
    storageKey?: string
    /** Whether to show theme toggle @default true */
    showToggle?: boolean
    /** Theme toggle position */
    togglePosition?: 'header' | 'footer' | 'sidebar' | 'floating'
  }

  /** Responsive design configuration */
  responsive?: {
    /** Breakpoints for responsive design */
    breakpoints?: {
      sm?: string
      md?: string
      lg?: string
      xl?: string
      '2xl'?: string
    }
    /** Whether to use responsive typography @default true */
    responsiveTypography?: boolean
    /** Whether to use responsive spacing @default true */
    responsiveSpacing?: boolean
  }

  /** Accessibility configuration */
  accessibility?: {
    /** Whether to respect reduced motion preference @default true */
    respectReducedMotion?: boolean
    /** Whether to use high contrast mode @default false */
    highContrast?: boolean
    /** Focus ring configuration */
    focusRing?: {
      /** Focus ring color */
      color?: string
      /** Focus ring width */
      width?: string
      /** Focus ring style */
      style?: 'solid' | 'dashed' | 'dotted'
    }
  }
}

/**
 * Resolved theme context (after processing options with defaults)
 */
export interface ThemeContext {
  /** Resolved color scheme */
  colorScheme: ColorScheme

  /** Whether to respect system preference */
  respectSystemPreference: boolean

  /** Resolved color palette with all defaults */
  colors: Required<ColorPalette> & {
    neutral: Required<NonNullable<ColorPalette['neutral']>>
  }

  /** Resolved typography configuration */
  typography: Required<TypographyConfig>

  /** Resolved spacing configuration */
  spacing: Required<SpacingConfig> & {
    scale: Required<NonNullable<SpacingConfig['scale']>>
  }

  /** Resolved component styling */
  components: {
    button: Required<NonNullable<ComponentStyling['button']>> & {
      padding: Required<NonNullable<ComponentStyling['button']>['padding']>
    }
    input: Required<NonNullable<ComponentStyling['input']>> & {
      padding: Required<NonNullable<ComponentStyling['input']>['padding']>
    }
    card: Required<NonNullable<ComponentStyling['card']>>
    modal: Required<NonNullable<ComponentStyling['modal']>>
  }

  /** Resolved animation configuration */
  animations: Required<AnimationConfig> & {
    duration: Required<NonNullable<AnimationConfig['duration']>>
    easing: Required<NonNullable<AnimationConfig['easing']>>
    transitions: Required<NonNullable<AnimationConfig['transitions']>>
  }

  /** Resolved CSS variables */
  cssVariables: Record<string, string>

  /** Resolved custom classes */
  customClasses: Required<NonNullable<ThemeOptions['customClasses']>>

  /** Resolved theme switching configuration */
  switching: {
    enabled: boolean
    storageKey: string
    showToggle: boolean
    togglePosition: 'header' | 'footer' | 'sidebar' | 'floating'
  }

  /** Resolved responsive configuration */
  responsive: {
    breakpoints: Required<NonNullable<ThemeOptions['responsive']>['breakpoints']>
    responsiveTypography: boolean
    responsiveSpacing: boolean
  }

  /** Resolved accessibility configuration */
  accessibility: {
    respectReducedMotion: boolean
    highContrast: boolean
    focusRing: Required<NonNullable<ThemeOptions['accessibility']>['focusRing']>
  }
}
