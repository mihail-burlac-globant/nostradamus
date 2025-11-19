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
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

// Helper to apply theme to document
const applyTheme = (theme: Theme) => {
  const root = document.documentElement

  if (theme === 'system') {
    const systemTheme = getSystemTheme()
    if (systemTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  } else if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',

  setTheme: (theme: Theme) => {
    set({ theme })
    localStorage.setItem(STORAGE_KEY, theme)
    applyTheme(theme)
  },

  initializeTheme: () => {
    // Load theme from localStorage or default to system
    const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null
    const initialTheme = savedTheme || 'system'

    set({ theme: initialTheme })
    applyTheme(initialTheme)

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
