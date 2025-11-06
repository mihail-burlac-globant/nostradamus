import { useProjectStore } from '../../stores/projectStore'

const Header = () => {
  const { projectData, clearProjectData } = useProjectStore()

  return (
    <header className="bg-white dark:bg-slate-800 shadow-md border-b border-slate-200 dark:border-slate-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Nostradamus
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Project Management & Projection Tools
              </p>
            </div>
          </div>

          {projectData && (
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {projectData.name}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {projectData.tasks.length} tasks
                </p>
              </div>
              <button
                onClick={clearProjectData}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Upload New File
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
