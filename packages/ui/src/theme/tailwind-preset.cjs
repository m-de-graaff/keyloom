const plugin = require('tailwindcss/plugin')

module.exports = {
  darkMode: ['class'],
  content: [],
  theme: {
    extend: {
      colors: {
        background: 'var(--kl-bg)',
        foreground: 'var(--kl-fg)',
        muted: 'var(--kl-muted)',
        'muted-foreground': 'var(--kl-muted-fg)',
        primary: {
          DEFAULT: 'var(--kl-primary)',
          foreground: 'var(--kl-primary-fg)'
        },
        success: 'var(--kl-success)',
        warning: 'var(--kl-warning)',
        danger: 'var(--kl-danger)'
      },
      borderRadius: {
        DEFAULT: 'var(--kl-radius, 1rem)',
        xl: 'calc(var(--kl-radius, 1rem))',
        lg: 'calc(var(--kl-radius, 1rem) - 2px)',
        md: 'calc(var(--kl-radius, 1rem) - 4px)'
      },
      boxShadow: {
        xs: 'var(--kl-shadow-xs)',
        sm: 'var(--kl-shadow-sm)',
        md: 'var(--kl-shadow-md)',
        lg: 'var(--kl-shadow-lg)',
        xl: 'var(--kl-shadow-xl)'
      },
      fontFamily: {
        sans: ['var(--kl-font, ui-sans-serif)', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [
    plugin(function({ addBase }) {
      addBase({
        ':root': { '--kl-font': 'ui-sans-serif' }
      })
    })
  ]
}

