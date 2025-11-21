import { useState, useEffect } from 'react'

const Footer = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check initial dark mode state
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setIsDarkMode(isDark)
    }

    checkDarkMode()

    // Watch for changes in dark mode
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <footer className="bg-white dark:bg-navy-900 border-t border-navy-100 dark:border-navy-700 mt-auto">
      <div className="container-wide">
        <div className="py-8 flex flex-col items-center gap-4">
          {/* Nostradamus Logo */}
          <div className="flex items-center gap-3">
            <img
              src={isDarkMode ? '/logo-dark.svg' : '/logo-light.svg'}
              alt="Nostradamus"
              className="w-10 h-10 transition-opacity duration-200"
            />
            <span className="text-lg font-serif font-semibold text-navy-900 dark:text-white">
              Nostradamus
            </span>
          </div>

          {/* Copyright and Version */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm text-navy-600 dark:text-navy-400">
              &copy; {new Date().getFullYear()} Mihail Burlac - all rights reserved.
            </p>
            <p className="text-xs text-navy-500 dark:text-navy-500 font-mono">
              v{__APP_VERSION__}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
