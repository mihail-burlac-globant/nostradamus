import { useProjectStore } from '../../stores/projectStore'
import { exportProjectToCSV } from '../../utils/csvExporter'

const Header = () => {
  const { projectData, clearProjectData } = useProjectStore()

  const handleExportCSV = () => {
    if (projectData) {
      exportProjectToCSV(projectData)
    }
  }

  return (
    <header className="bg-white dark:bg-navy-900 border-b border-navy-100 dark:border-navy-700 backdrop-blur-sm">
      <div className="container-wide">
        <div className="flex items-center justify-between py-4">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <img
              src="/logo.svg"
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
