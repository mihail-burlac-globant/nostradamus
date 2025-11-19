import { useState, useEffect } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Milestone } from '../types/entities.types'
import GanttChart from '../components/charts/GanttChart'
import BurndownChart from '../components/charts/BurndownChart'

type ChartType = 'gantt' | 'burndown'

const ChartsPage = () => {
  const {
    projects,
    tasks,
    milestones,
    isInitialized,
    initialize,
    loadProjects,
    loadTasks,
    loadMilestones,
    addMilestone,
    editMilestone,
    removeMilestone,
  } = useEntitiesStore()

  const [activeChart, setActiveChart] = useState<ChartType>('gantt')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [showDeleteMilestoneModal, setShowDeleteMilestoneModal] = useState(false)
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null)
  const [milestoneFormData, setMilestoneFormData] = useState({
    title: '',
    date: '',
  })

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

  useEffect(() => {
    // Load milestones when project changes
    if (selectedProjectId) {
      loadMilestones(selectedProjectId)
    }
  }, [selectedProjectId, loadMilestones])

  const activeProjects = projects.filter(p => p.status === 'Active')
  const selectedProject = activeProjects.find(p => p.id === selectedProjectId)
  const projectTasks = tasks.filter(t => t.projectId === selectedProjectId)
  const projectMilestones = milestones.filter(m => m.projectId === selectedProjectId)

  const handleCreateMilestone = () => {
    if (!milestoneFormData.title.trim() || !milestoneFormData.date || !selectedProjectId) return

    addMilestone({
      projectId: selectedProjectId,
      title: milestoneFormData.title,
      date: milestoneFormData.date,
    })

    setMilestoneFormData({ title: '', date: '' })
    setShowMilestoneModal(false)
    loadMilestones(selectedProjectId)
  }

  const handleEditMilestone = () => {
    if (!currentMilestone || !milestoneFormData.title.trim() || !milestoneFormData.date) return

    editMilestone(currentMilestone.id, {
      title: milestoneFormData.title,
      date: milestoneFormData.date,
    })

    setMilestoneFormData({ title: '', date: '' })
    setCurrentMilestone(null)
    setShowMilestoneModal(false)
    loadMilestones(selectedProjectId)
  }

  const handleDeleteMilestone = () => {
    if (!currentMilestone) return

    removeMilestone(currentMilestone.id)
    setCurrentMilestone(null)
    setShowDeleteMilestoneModal(false)
    loadMilestones(selectedProjectId)
  }

  const openCreateMilestoneModal = () => {
    setCurrentMilestone(null)
    setMilestoneFormData({ title: '', date: '' })
    setShowMilestoneModal(true)
  }

  const openEditMilestoneModal = (milestone: Milestone) => {
    setCurrentMilestone(milestone)
    setMilestoneFormData({
      title: milestone.title,
      date: milestone.date,
    })
    setShowMilestoneModal(true)
  }

  const openDeleteMilestoneModal = (milestone: Milestone) => {
    setCurrentMilestone(milestone)
    setShowDeleteMilestoneModal(true)
  }

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

                {/* Manage Milestones Button */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                    Milestones
                  </label>
                  <button
                    onClick={openCreateMilestoneModal}
                    disabled={!selectedProject}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-navy-300 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Milestone
                  </button>
                </div>
              </div>

              {/* Milestones List */}
              {selectedProject && projectMilestones.length > 0 && (
                <div className="mt-4 pt-4 border-t border-navy-200 dark:border-navy-700">
                  <h3 className="font-semibold text-navy-700 dark:text-navy-300 mb-3">Project Milestones:</h3>
                  <div className="flex flex-wrap gap-2">
                    {projectMilestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg"
                      >
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium text-purple-800 dark:text-purple-200">{milestone.title}</span>
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          {new Date(milestone.date).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => openEditMilestoneModal(milestone)}
                          className="ml-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                          title="Edit milestone"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteMilestoneModal(milestone)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete milestone"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                      milestones={projectMilestones}
                    />
                  ) : (
                    <BurndownChart
                      projectId={selectedProjectId}
                      projectTitle={selectedProject.title}
                      tasks={projectTasks}
                      milestones={projectMilestones}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Milestone Modal */}
        {showMilestoneModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-4">
                {currentMilestone ? 'Edit Milestone' : 'Create Milestone'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">Title *</label>
                  <input
                    type="text"
                    value={milestoneFormData.title}
                    onChange={(e) => setMilestoneFormData({ ...milestoneFormData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter milestone title"
                  />
                </div>
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">Date *</label>
                  <input
                    type="date"
                    value={milestoneFormData.date}
                    onChange={(e) => setMilestoneFormData({ ...milestoneFormData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={currentMilestone ? handleEditMilestone : handleCreateMilestone}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  {currentMilestone ? 'Save' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowMilestoneModal(false)
                    setCurrentMilestone(null)
                    setMilestoneFormData({ title: '', date: '' })
                  }}
                  className="flex-1 px-4 py-2 bg-navy-200 hover:bg-navy-300 dark:bg-navy-700 dark:hover:bg-navy-600 text-navy-800 dark:text-navy-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Milestone Modal */}
        {showDeleteMilestoneModal && currentMilestone && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-4">Delete Milestone</h2>
              <p className="text-navy-600 dark:text-navy-400 mb-6">
                Are you sure you want to delete "{currentMilestone.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteMilestone}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteMilestoneModal(false)
                    setCurrentMilestone(null)
                  }}
                  className="flex-1 px-4 py-2 bg-navy-200 hover:bg-navy-300 dark:bg-navy-700 dark:hover:bg-navy-600 text-navy-800 dark:text-navy-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChartsPage
