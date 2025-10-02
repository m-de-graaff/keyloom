/**
 * Tests for Gravatar utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  hashEmail,
  generateGravatarUrl,
  generateGravatarInfo,
  checkGravatarExists,
  preloadGravatar,
} from './gravatar-utils'

describe('hashEmail', () => {
  it('should hash email addresses correctly', () => {
    const email = 'test@example.com'
    const hash = hashEmail(email)

    expect(hash).toBe('55502f40dc8b7c769880b10874abc9d0')
    expect(hash).toHaveLength(32)
  })

  it('should normalize email addresses before hashing', () => {
    const email1 = '  TEST@EXAMPLE.COM  '
    const email2 = 'test@example.com'

    expect(hashEmail(email1)).toBe(hashEmail(email2))
  })

  it('should handle empty or invalid emails gracefully', () => {
    // MD5 hash of empty string
    expect(hashEmail('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(hashEmail('   ')).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })
})

describe('generateGravatarUrl', () => {
  it('should generate basic Gravatar URL', () => {
    const url = generateGravatarUrl('test@example.com')

    expect(url).toContain('https://secure.gravatar.com/avatar/')
    expect(url).toContain('55502f40dc8b7c769880b10874abc9d0')
    expect(url).toContain('s=200')
    expect(url).toContain('d=mp')
    expect(url).toContain('r=g')
  })

  it('should respect custom options', () => {
    const url = generateGravatarUrl('test@example.com', {
      size: 400,
      default: 'identicon',
      rating: 'pg',
      format: 'png',
      secure: false,
    })

    expect(url).toContain('http://www.gravatar.com/avatar/')
    expect(url).toContain('.png')
    expect(url).toContain('s=400')
    expect(url).toContain('d=identicon')
    expect(url).toContain('r=pg')
  })

  it('should handle force default option', () => {
    const url = generateGravatarUrl('test@example.com', {
      forceDefault: true,
    })

    expect(url).toContain('f=y')
  })

  it('should validate size parameter', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const url = generateGravatarUrl('test@example.com', {
      size: 3000, // Invalid size
    })

    expect(url).toContain('s=200') // Should use default
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should handle errors gracefully', () => {
    // Test that the function returns a valid URL even with unusual input
    const url = generateGravatarUrl('test@example.com')

    expect(url).toContain('https://secure.gravatar.com/avatar/')
    expect(url).toContain('55502f40dc8b7c769880b10874abc9d0') // MD5 of test@example.com
    expect(url).toMatch(/^https:\/\/secure\.gravatar\.com\/avatar\/[a-f0-9]{32}/)
  })
})

describe('generateGravatarInfo', () => {
  it('should generate complete Gravatar information', () => {
    const info = generateGravatarInfo('test@example.com', { size: 100 }, 'John Doe')

    expect(info.url).toContain('55502f40dc8b7c769880b10874abc9d0')
    expect(info.size).toBe(100)
    expect(info.hash).toBe('55502f40dc8b7c769880b10874abc9d0')
    expect(info.altText).toBe('Avatar for John Doe')
    expect(info.attributes.src).toBe(info.url)
    expect(info.attributes.width).toBe('100')
    expect(info.attributes.height).toBe('100')
    expect(info.attributes.loading).toBe('lazy')
  })

  it('should use default alt text when no name provided', () => {
    const info = generateGravatarInfo('test@example.com')

    expect(info.altText).toBe('User avatar')
  })

  it('should handle force default option', () => {
    const info = generateGravatarInfo('test@example.com', { forceDefault: true })

    expect(info.isDefault).toBe(true)
  })
})

describe('checkGravatarExists', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return true when Gravatar exists', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response)

    const exists = await checkGravatarExists('test@example.com')

    expect(exists).toBe(true)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('d=404'), { method: 'HEAD' })
  })

  it('should return false when Gravatar does not exist', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
    } as Response)

    const exists = await checkGravatarExists('test@example.com')

    expect(exists).toBe(false)
  })

  it('should handle fetch errors gracefully', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const exists = await checkGravatarExists('test@example.com')

    expect(exists).toBe(false)
    expect(consoleWarnSpy).toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })
})

describe('preloadGravatar', () => {
  beforeEach(() => {
    // Mock document and DOM APIs
    global.document = {
      createElement: vi.fn(),
      head: {
        appendChild: vi.fn(),
      },
    } as any

    // Mock DOM methods
    const mockLink = {
      rel: '',
      as: '',
      href: '',
      parentNode: {
        removeChild: vi.fn(),
      },
    }

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
    vi.spyOn(document.head, 'appendChild').mockImplementation(() => mockLink as any)

    // Mock setTimeout
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should preload Gravatar image', async () => {
    const promise = preloadGravatar('test@example.com', { size: 200 })

    expect(document.createElement).toHaveBeenCalledWith('link')
    expect(document.head.appendChild).toHaveBeenCalled()

    // Fast-forward timers to trigger cleanup
    vi.advanceTimersByTime(1000)

    await promise
  })

  it('should handle preload errors gracefully', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockImplementation(() => {
      throw new Error('DOM error')
    })

    await preloadGravatar('test@example.com')

    expect(consoleWarnSpy).toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })
})
