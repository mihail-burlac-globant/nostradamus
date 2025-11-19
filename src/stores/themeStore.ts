import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  initializeTheme: () => void
}

const STORAGE_KEY = 'nostradamus_theme'

// Helper to get system preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

// Helper to apply theme to document
const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return

  const root = document.documentElement

  if (theme === 'system') {
    const systemTheme = getSystemTheme()
    if (systemTheme === 'dark') {
      root.classList.add('dark')
      console.log('✓ Applied dark theme (system preference)')
    } else {
      root.classList.remove('dark')
      console.log('✓ Applied light theme (system preference)')
    }
  } else if (theme === 'dark') {
    root.classList.add('dark')
    console.log('✓ Applied dark theme')
  } else {
    root.classList.remove('dark')
    console.log('✓ Applied light theme')
  }

  // Log current state for debugging
  console.log('Theme state:', {
    theme,
    hasDarkClass: root.classList.contains('dark'),
    htmlClasses: root.className
  })
}

// Initialize theme immediately on store creation
const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system'
  const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null
  return savedTheme || 'system'
}

// Apply theme immediately when the module loads
const initialTheme = getInitialTheme()
applyTheme(initialTheme)

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,

  setTheme: (theme: Theme) => {
    set({ theme })
    localStorage.setItem(STORAGE_KEY, theme)
    applyTheme(theme)
  },

  initializeTheme: () => {
    // Listen for system theme changes if using system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      const currentTheme = get().theme
      if (currentTheme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
  },
}))
