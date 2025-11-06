import { useProjectStore } from '../../stores/projectStore'

const Header = () => {
  const { projectData, clearProjectData } = useProjectStore()

  return (
    <header className="bg-white dark:bg-navy-900 border-b border-navy-100 dark:border-navy-700 backdrop-blur-sm">
      <div className="container-wide">
        <div className="flex items-center justify-between py-6">
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
            <div className="flex items-center gap-6">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-navy-900 dark:text-white">
                  {projectData.name}
                </p>
                <p className="text-xs text-navy-500 dark:text-navy-400">
                  {projectData.tasks.length} tasks tracked
                </p>
              </div>
              <button
                onClick={clearProjectData}
                className="px-5 py-2.5 text-sm font-medium text-navy-700 dark:text-navy-300
                         hover:text-salmon-600 dark:hover:text-salmon-500
                         border border-navy-200 dark:border-navy-700 rounded-lg
                         hover:border-salmon-300 dark:hover:border-salmon-700
                         transition-all duration-200"
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
