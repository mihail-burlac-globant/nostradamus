import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useProjectStore } from '../../stores/projectStore'
import { useThemeStore } from '../../stores/themeStore'
import { exportProjectToCSV } from '../../utils/csvExporter'

const Header = () => {
  const { projectData, clearProjectData } = useProjectStore()
  const { theme, setTheme } = useThemeStore()
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

  const handleThemeToggle = () => {
    // Cycle through: light -> dark -> system -> light
    console.log('🎨 Theme toggle clicked. Current theme:', theme)

    if (theme === 'light') {
      console.log('→ Switching to dark theme')
      setTheme('dark')
    } else if (theme === 'dark') {
      console.log('→ Switching to system theme')
      setTheme('system')
    } else {
      console.log('→ Switching to light theme')
      setTheme('light')
    }
  }

  const getThemeIcon = () => {
    if (theme === 'light') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    } else if (theme === 'dark') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )
    } else {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }
  }

  const getThemeLabel = () => {
    if (theme === 'light') return 'Light'
    if (theme === 'dark') return 'Dark'
    return 'System'
  }

  const handleExportCSV = () => {
    if (projectData) {
      exportProjectToCSV(projectData)
    }
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
      isActive
        ? 'text-salmon-600 dark:text-salmon-400 bg-salmon-50 dark:bg-salmon-900/20'
        : 'text-navy-700 dark:text-navy-300 hover:text-salmon-600 dark:hover:text-salmon-400 hover:bg-salmon-50 dark:hover:bg-salmon-900/20'
    }`

  return (
    <header className="bg-white dark:bg-navy-900 border-b border-navy-100 dark:border-navy-700 backdrop-blur-sm">
      <div className="container-wide">
        <div className="flex items-center justify-between py-4">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <img
              src={isDarkMode ? '/logo-dark.svg' : '/logo-light.svg'}
              alt="Nostradamus"
              className="w-12 h-12 transition-transform hover:scale-105"
            />
            <div>
              <h1 className="text-2xl font-serif font-bold text-navy-900 dark:text-white tracking-tight">
                Nostradamus
              </h1>
              <p className="text-sm text-navy-500 dark:text-navy-400 font-light">
                Project Intelligence & Visualization
              </p>
            </div>
          </div>

          {/* Navigation & Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center gap-2">
              <NavLink to="/charts" className={navLinkClass}>
                Charts
              </NavLink>
              <NavLink to="/projects" className={navLinkClass}>
                Projects
              </NavLink>
              <NavLink to="/tasks" className={navLinkClass}>
                Tasks
              </NavLink>
              <NavLink to="/progress" className={navLinkClass}>
                Progress
              </NavLink>
              <NavLink to="/resources" className={navLinkClass}>
                Resources
              </NavLink>
              <NavLink to="/configurations" className={navLinkClass}>
                Configurations
              </NavLink>
            </nav>

            {/* Theme Selector - Always Visible */}
            <button
              onClick={handleThemeToggle}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                         text-navy-700 dark:text-navy-300
                         bg-navy-50 dark:bg-navy-800
                         hover:text-salmon-600 dark:hover:text-salmon-400
                         hover:bg-salmon-50 dark:hover:bg-salmon-900/30
                         border border-navy-200 dark:border-navy-700"
              title={`Current theme: ${getThemeLabel()}. Click to cycle through themes.`}
            >
              {getThemeIcon()}
              <span className="hidden sm:inline">{getThemeLabel()}</span>
            </button>
          </div>

          {/* Project Info & Actions */}
          {projectData && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-navy-900 dark:text-white">
                  {projectData.name}
                </p>
                <p className="text-xs text-navy-500 dark:text-navy-400">
                  {projectData.tasks.length} tasks tracked
                </p>
              </div>

              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                         text-salmon-700 dark:text-salmon-400
                         bg-salmon-50 dark:bg-salmon-900/20
                         border border-salmon-200 dark:border-salmon-800 rounded-lg
                         hover:bg-salmon-100 dark:hover:bg-salmon-900/30
                         hover:border-salmon-300 dark:hover:border-salmon-700
                         transition-all duration-200"
                title="Export project data as CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              {/* New Project Button */}
              <button
                onClick={clearProjectData}
                className="px-5 py-2.5 text-sm font-medium text-navy-700 dark:text-navy-300
                         hover:text-salmon-600 dark:hover:text-salmon-500
                         border border-navy-200 dark:border-navy-700 rounded-lg
                         hover:border-salmon-300 dark:hover:border-salmon-700
                         transition-all duration-200"
                title="Start a new project"
              >
                New Project
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
