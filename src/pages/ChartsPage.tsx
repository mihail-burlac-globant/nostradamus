import { useState, useEffect } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import GanttChart from '../components/charts/GanttChart'
import BurndownChart from '../components/charts/BurndownChart'

type ChartType = 'gantt' | 'burndown'

const ChartsPage = () => {
  const {
    projects,
    tasks,
    isInitialized,
    initialize,
    loadProjects,
    loadTasks,
  } = useEntitiesStore()

  const [activeChart, setActiveChart] = useState<ChartType>('gantt')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    } else {
      loadProjects('Active')
      loadTasks()
    }
  }, [isInitialized, initialize, loadProjects, loadTasks])

  useEffect(() => {
    // Auto-select first active project if none selected
    if (!selectedProjectId && projects.length > 0) {
      const activeProjects = projects.filter(p => p.status === 'Active')
      if (activeProjects.length > 0) {
        setSelectedProjectId(activeProjects[0].id)
      }
    }
  }, [projects, selectedProjectId])

  const activeProjects = projects.filter(p => p.status === 'Active')
  const selectedProject = activeProjects.find(p => p.id === selectedProjectId)
  const projectTasks = tasks.filter(t => t.projectId === selectedProjectId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-salmon-50 dark:from-navy-900 dark:to-salmon-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-navy-800 dark:text-navy-100">
            Project Charts & Analytics
          </h1>
        </div>

        {activeProjects.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="mb-6">
                <svg className="w-24 h-24 mx-auto text-navy-300 dark:text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-3">
                No Active Projects
              </h2>
              <p className="text-navy-600 dark:text-navy-400 mb-6">
                Create your first project to start visualizing tasks and tracking progress with charts.
              </p>
              <a
                href="/projects"
                className="inline-block px-6 py-3 bg-salmon-600 hover:bg-salmon-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Go to Projects
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Merged Project Selection and Chart Controls */}
            <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
              <div className="flex items-end gap-6">
                {/* Project Selector - Left Side */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                    Select Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  >
                    {activeProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chart Type Selector - Right Side */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                    Chart Type
                  </label>
                  <div className="inline-flex bg-navy-50 dark:bg-navy-900 rounded-xl p-1.5 gap-1">
                    <button
                      onClick={() => setActiveChart('gantt')}
                      disabled={!selectedProject || projectTasks.length === 0}
                      className={`
                        px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                        flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                        ${
                          activeChart === 'gantt'
                            ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-500 shadow-soft'
                            : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                        }
                      `}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                        />
                      </svg>
                      <span>Gantt</span>
                    </button>

                    <button
                      onClick={() => setActiveChart('burndown')}
                      disabled={!selectedProject || projectTasks.length === 0}
                      className={`
                        px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                        flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                        ${
                          activeChart === 'burndown'
                            ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-500 shadow-soft'
                            : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                        }
                      `}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                        />
                      </svg>
                      <span>Burndown</span>
                    </button>
                  </div>
                </div>
              </div>

              {selectedProject && projectTasks.length === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                    This project has no tasks yet. Add tasks to see them visualized in charts.
                  </p>
                </div>
              )}
            </div>

            {/* Charts */}
            {selectedProject && projectTasks.length > 0 && (
              <div className="space-y-4">

                <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
                  {activeChart === 'gantt' ? (
                    <GanttChart
                      projectId={selectedProjectId}
                      projectTitle={selectedProject.title}
                      tasks={projectTasks}
                    />
                  ) : (
                    <BurndownChart
                      projectId={selectedProjectId}
                      projectTitle={selectedProject.title}
                      tasks={projectTasks}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChartsPage
