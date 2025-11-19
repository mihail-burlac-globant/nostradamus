import { useEffect, useState } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Task, Resource, TaskStatus, Milestone } from '../types/entities.types'
import { getIconById } from '../utils/resourceIcons'

interface TaskWithResources extends Task {
  resources: (Resource & { estimatedDays: number; focusFactor: number })[]
}

const TasksPage = () => {
  const {
    tasks,
    projects,
    milestones,
    loadTasks,
    loadProjects,
    loadMilestones,
    addTask,
    editTask,
    removeTask,
    addMilestone,
    editMilestone,
    removeMilestone,
    getProjectResources,
    assignResourceToTask,
    removeResourceFromTask,
    getTaskResources,
    addTaskDependency,
    removeTaskDependency,
    getTaskDependencies,
    canTaskBeStarted,
    initialize,
    isInitialized,
  } = useEntitiesStore()

  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>(() => {
    const saved = localStorage.getItem('nostradamus_tasks_project_filter')
    return saved || 'all'
  })
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>(() => {
    const saved = localStorage.getItem('nostradamus_tasks_view_mode')
    return (saved as 'detailed' | 'compact') || 'detailed'
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [showDependenciesModal, setShowDependenciesModal] = useState(false)
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [showDeleteMilestoneModal, setShowDeleteMilestoneModal] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null)
  const [tasksWithResources, setTasksWithResources] = useState<TaskWithResources[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    status: 'Todo' as TaskStatus,
    progress: 0,
    color: '#6366f1',
    startDate: '',
    endDate: '',
    dependencies: [] as string[],
  })
  const [resourceFormData, setResourceFormData] = useState({
    resourceId: '',
    estimatedDays: 1,
    focusFactor: 80,
  })
  const [milestoneFormData, setMilestoneFormData] = useState({
    title: '',
    date: '',
    icon: 'flag',
    color: '#9333ea',
  })
  const [activeTab, setActiveTab] = useState<'tasks' | 'milestones'>(() => {
    const saved = localStorage.getItem('nostradamus_tasks_active_tab')
    return (saved as 'tasks' | 'milestones') || 'tasks'
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
    // Load resources for each task
    const tasksWithResourcesData: TaskWithResources[] = tasks.map((task) => ({
      ...task,
      resources: getTaskResources(task.id),
    }))
    setTasksWithResources(tasksWithResourcesData)
  }, [tasks, getTaskResources])

  useEffect(() => {
    // Save filter selection to localStorage
    localStorage.setItem('nostradamus_tasks_project_filter', selectedProjectFilter)
  }, [selectedProjectFilter])

  useEffect(() => {
    // Save view mode to localStorage
    localStorage.setItem('nostradamus_tasks_view_mode', viewMode)
  }, [viewMode])

  useEffect(() => {
    // Save active tab to localStorage
    localStorage.setItem('nostradamus_tasks_active_tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    // Load milestones when project filter changes
    if (isInitialized && selectedProjectFilter !== 'all') {
      loadMilestones(selectedProjectFilter)
    }
  }, [isInitialized, selectedProjectFilter, loadMilestones])

  const activeProjects = projects.filter((p) => p.status === 'Active')

  const filteredTasks =
    selectedProjectFilter === 'all'
      ? tasksWithResources
      : tasksWithResources.filter((t) => t.projectId === selectedProjectFilter)

  const filteredMilestones =
    selectedProjectFilter === 'all'
      ? []
      : milestones.filter((m) => m.projectId === selectedProjectFilter)

  const groupedTasks = filteredTasks.reduce(
    (acc, task) => {
      if (!acc[task.projectId]) {
        acc[task.projectId] = []
      }
      acc[task.projectId].push(task)
      return acc
    },
    {} as Record<string, TaskWithResources[]>
  )

  const handleCreateTask = () => {
    if (!formData.title.trim() || !formData.projectId) return

    const newTask = addTask(formData)

    // Add dependencies if any were selected
    if (formData.dependencies.length > 0 && newTask) {
      formData.dependencies.forEach((depId) => {
        try {
          addTaskDependency(newTask.id, depId)
        } catch (error) {
          console.error('Failed to add dependency:', error)
        }
      })
      loadTasks() // Reload to show dependencies
    }

    // Save the last selected project for future use
    localStorage.setItem('nostradamus_tasks_last_project', formData.projectId)
    setFormData({ title: '', description: '', projectId: '', status: 'Todo', progress: 0, color: '#6366f1', startDate: '', endDate: '', dependencies: [] })
    setShowCreateModal(false)
  }

  const handleEditTask = () => {
    if (!currentTask || !formData.title.trim()) return

    editTask(currentTask.id, formData)
    setFormData({ title: '', description: '', projectId: '', status: 'Todo', progress: 0, color: '#6366f1', startDate: '', endDate: '', dependencies: [] })
    setCurrentTask(null)
    setShowEditModal(false)
  }

  const handleDeleteTask = () => {
    if (!currentTask) return

    removeTask(currentTask.id)
    setCurrentTask(null)
    setShowDeleteModal(false)
  }

  const handleAddResource = () => {
    if (!currentTask || !resourceFormData.resourceId) return

    assignResourceToTask(
      currentTask.id,
      resourceFormData.resourceId,
      resourceFormData.estimatedDays,
      resourceFormData.focusFactor
    )
    loadTasks()
    setResourceFormData({ resourceId: '', estimatedDays: 1, focusFactor: 80 })
    setShowResourceModal(false)
  }

  const handleRemoveResource = (taskId: string, resourceId: string) => {
    removeResourceFromTask(taskId, resourceId)
    loadTasks()
  }

  const handleCreateMilestone = () => {
    if (!milestoneFormData.title.trim() || !milestoneFormData.date || selectedProjectFilter === 'all') return

    addMilestone({
      projectId: selectedProjectFilter,
      title: milestoneFormData.title,
      date: milestoneFormData.date,
      icon: milestoneFormData.icon,
      color: milestoneFormData.color,
    })
    setMilestoneFormData({ title: '', date: '', icon: 'flag', color: '#9333ea' })
    setShowMilestoneModal(false)
  }

  const handleEditMilestone = () => {
    if (!currentMilestone || !milestoneFormData.title.trim() || !milestoneFormData.date) return

    editMilestone(currentMilestone.id, {
      title: milestoneFormData.title,
      date: milestoneFormData.date,
      icon: milestoneFormData.icon,
      color: milestoneFormData.color,
    })
    setMilestoneFormData({ title: '', date: '', icon: 'flag', color: '#9333ea' })
    setCurrentMilestone(null)
    setShowMilestoneModal(false)
  }

  const handleDeleteMilestone = () => {
    if (!currentMilestone) return

    removeMilestone(currentMilestone.id)
    setCurrentMilestone(null)
    setShowDeleteMilestoneModal(false)
  }

  const openEditMilestoneModal = (milestone: Milestone) => {
    setCurrentMilestone(milestone)
    setMilestoneFormData({
      title: milestone.title,
      date: milestone.date,
      icon: milestone.icon,
      color: milestone.color,
    })
    setShowMilestoneModal(true)
  }

  const openDeleteMilestoneModal = (milestone: Milestone) => {
    setCurrentMilestone(milestone)
    setShowDeleteMilestoneModal(true)
  }

  const openEditModal = (task: Task) => {
    setCurrentTask(task)
    setFormData({
      title: task.title,
      description: task.description,
      projectId: task.projectId,
      status: task.status,
      progress: task.progress,
      color: task.color || '#6366f1',
      startDate: task.startDate || '',
      endDate: task.endDate || '',
      dependencies: [], // Edit mode doesn't modify dependencies
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (task: Task) => {
    setCurrentTask(task)
    setShowDeleteModal(true)
  }

  const openResourceModal = (task: Task) => {
    setCurrentTask(task)
    setResourceFormData({ resourceId: '', estimatedDays: 1, focusFactor: 80 })
    setShowResourceModal(true)
  }

  const openDependenciesModal = (task: Task) => {
    setCurrentTask(task)
    setShowDependenciesModal(true)
  }

  const handleAddDependency = (dependsOnTaskId: string) => {
    if (!currentTask || !dependsOnTaskId) return
    try {
      addTaskDependency(currentTask.id, dependsOnTaskId)
      loadTasks()
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const handleRemoveDependency = (dependsOnTaskId: string) => {
    if (!currentTask) return
    removeTaskDependency(currentTask.id, dependsOnTaskId)
    loadTasks()
  }

  const getProjectName = (projectId: string) => {
    const project = activeProjects.find((p) => p.id === projectId)
    return project?.title || 'Unknown Project'
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Todo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'Done':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const calculateTotalEstimate = (resources: (Resource & { estimatedDays: number; focusFactor: number })[]) => {
    return resources.reduce((total, resource) => {
      // Adjusted estimate = estimatedDays * (focusFactor / 100)
      const adjustedEstimate = resource.estimatedDays * (resource.focusFactor / 100)
      return total + adjustedEstimate
    }, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-salmon-50 dark:from-gray-950 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-navy-800 dark:text-navy-100">Tasks & Milestones</h1>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="inline-flex bg-navy-50 dark:bg-navy-900 rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`
                px-6 py-2.5 rounded-md font-medium text-sm transition-all duration-200
                ${
                  activeTab === 'tasks'
                    ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-500 shadow-sm'
                    : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                }
              `}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('milestones')}
              className={`
                px-6 py-2.5 rounded-md font-medium text-sm transition-all duration-200
                ${
                  activeTab === 'milestones'
                    ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-500 shadow-sm'
                    : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                }
              `}
            >
              Milestones
            </button>
          </div>
        </div>

        {/* Tasks Tab Content */}
        {activeTab === 'tasks' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100">Tasks</h2>
              <button
                onClick={() => {
                  // Pre-select project based on filter, or use last selected, or first active project
                  const defaultProjectId = selectedProjectFilter !== 'all'
                    ? selectedProjectFilter
                    : localStorage.getItem('nostradamus_tasks_last_project') || (activeProjects[0]?.id || '')
                  setFormData({ title: '', description: '', projectId: defaultProjectId, status: 'Todo', progress: 0, color: '#6366f1', startDate: '', endDate: '', dependencies: [] })
                  setShowCreateModal(true)
                }}
                className="px-6 py-3 bg-salmon-600 hover:bg-salmon-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                + Add Task
              </button>
            </div>

            {/* Filters */}
        <div className="mb-6 flex gap-6 items-center flex-wrap">
          <div className="flex gap-4 items-center">
            <label className="text-navy-700 dark:text-navy-300 font-medium">Filter by Project:</label>
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-800 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
            >
              <option value="all">All Projects</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 items-center">
            <label className="text-navy-700 dark:text-navy-300 font-medium">View:</label>
            <div className="inline-flex bg-navy-50 dark:bg-navy-900 rounded-lg p-1 gap-1">
              <button
                onClick={() => setViewMode('detailed')}
                className={`
                  px-4 py-2 rounded-md font-medium text-sm transition-all duration-200
                  ${
                    viewMode === 'detailed'
                      ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-500 shadow-sm'
                      : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                  }
                `}
              >
                Detailed
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`
                  px-4 py-2 rounded-md font-medium text-sm transition-all duration-200
                  ${
                    viewMode === 'compact'
                      ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-500 shadow-sm'
                      : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                  }
                `}
              >
                Compact
              </button>
            </div>
          </div>
        </div>

            {/* Tasks grouped by project */}
        <div className="space-y-8">
          {Object.entries(groupedTasks).length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-navy-800 rounded-lg shadow-md">
              <p className="text-navy-500 dark:text-navy-400">No tasks found. Create your first task!</p>
            </div>
          ) : (
            Object.entries(groupedTasks).map(([projectId, projectTasks]) => (
              <div key={projectId} className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-4">
                  {getProjectName(projectId)}
                </h2>
                <div className="space-y-4">
                  {projectTasks.map((task) => {
                    const totalEstimate = calculateTotalEstimate(task.resources)
                    const dependencies = getTaskDependencies(task.id)
                    const canStart = canTaskBeStarted(task.id)
                    return (
                      <div
                        key={task.id}
                        className="border-l-4 border border-navy-200 dark:border-navy-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                        style={{ borderLeftColor: task.color || '#6366f1' }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: task.color || '#6366f1' }}
                                title="Task color"
                              />
                              <h3 className="text-xl font-semibold text-navy-800 dark:text-navy-100">
                                {task.title}
                              </h3>
                              {!canStart && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-xs rounded-full">
                                  Blocked
                                </span>
                              )}
                            </div>
                            <p className="text-navy-600 dark:text-navy-400 mb-2">{task.description}</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => openResourceModal(task)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                            >
                              Resources
                            </button>
                            <button
                              onClick={() => openDependenciesModal(task)}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                            >
                              Dependencies
                            </button>
                            <button
                              onClick={() => openEditModal(task)}
                              className="px-3 py-1 bg-salmon-600 hover:bg-salmon-700 text-white rounded text-sm transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openDeleteModal(task)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Dependencies */}
                        {viewMode === 'detailed' && dependencies.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-navy-200 dark:border-navy-700">
                            <h4 className="font-semibold text-navy-700 dark:text-navy-300 mb-2">
                              Dependencies:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {dependencies.map((dep) => (
                                <span
                                  key={dep.id}
                                  className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 text-sm rounded-full"
                                >
                                  {dep.title} ({dep.status})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resources */}
                        {viewMode === 'detailed' && task.resources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-navy-200 dark:border-navy-700">
                            <h4 className="font-semibold text-navy-700 dark:text-navy-300 mb-2">
                              Assigned Resources:
                            </h4>
                            <div className="space-y-2">
                              {task.resources.map((resource) => {
                                const adjustedEstimate = resource.estimatedDays * (resource.focusFactor / 100)
                                const ResourceIcon = getIconById(resource.icon || 'generic')
                                return (
                                  <div
                                    key={resource.id}
                                    className="flex justify-between items-center bg-navy-50 dark:bg-navy-900 p-3 rounded"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <ResourceIcon className="w-5 h-5 text-navy-600 dark:text-navy-400" />
                                        <span className="font-medium text-navy-800 dark:text-navy-100">
                                          {resource.title}
                                        </span>
                                      </div>
                                      <div className="text-sm text-navy-600 dark:text-navy-400 mt-1">
                                        Estimated: {resource.estimatedDays} days | Focus Factor: {resource.focusFactor}% |
                                        Adjusted: {adjustedEstimate.toFixed(2)} days
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveResource(task.id, resource.id)}
                                      className="ml-4 px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )
                              })}
                              <div className="mt-2 pt-2 border-t border-navy-200 dark:border-navy-700">
                                <span className="font-semibold text-navy-800 dark:text-navy-100">
                                  Total Remaining Estimate: {totalEstimate.toFixed(2)} days
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
          </>
        )}

        {/* Milestones Tab Content */}
        {activeTab === 'milestones' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100">Milestones</h2>
              {selectedProjectFilter !== 'all' && (
                <button
                  onClick={() => {
                    setCurrentMilestone(null)
                    setMilestoneFormData({ title: '', date: '', icon: 'flag', color: '#9333ea' })
                    setShowMilestoneModal(true)
                  }}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  + Add Milestone
                </button>
              )}
            </div>

            {/* Project Filter for Milestones */}
            <div className="mb-6">
              <label className="text-navy-700 dark:text-navy-300 font-medium mr-4">Filter by Project:</label>
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-800 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
              >
                <option value="all">All Projects</option>
                {activeProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedProjectFilter === 'all' ? (
              <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
                <p className="text-navy-500 dark:text-navy-400 text-center">
                  Please select a specific project to view and manage milestones.
                </p>
              </div>
            ) : filteredMilestones.length === 0 ? (
              <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
                <p className="text-navy-500 dark:text-navy-400 text-center">
                  No milestones yet. Add milestones to track key dates in your project timeline.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
                <div className="space-y-3">
                  {filteredMilestones
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((milestone) => (
                      <div
                        key={milestone.id}
                        className="flex justify-between items-center bg-navy-50 dark:bg-navy-900 p-4 rounded-lg border border-navy-200 dark:border-navy-700 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: milestone.color }}
                          />
                          <div>
                            <span className="font-semibold text-navy-800 dark:text-navy-100 text-lg">
                              {milestone.title}
                            </span>
                            <p className="text-navy-500 dark:text-navy-400 text-sm mt-1">
                              {new Date(milestone.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditMilestoneModal(milestone)}
                            className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded font-medium text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteMilestoneModal(milestone)}
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded font-medium text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-4">Create New Task</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">Project *</label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  >
                    <option value="">Select a project</option>
                    {activeProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                {/* Status and Color in 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                      className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    >
                      <option value="Todo">Todo</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">Task Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-12 h-10 border border-navy-200 dark:border-navy-700 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent text-sm"
                        placeholder="#6366f1"
                      />
                    </div>
                  </div>
                </div>
                {/* Start and End Dates in 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">
                    Progress: {formData.progress}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                    className="w-full h-2 bg-navy-200 dark:bg-navy-700 rounded-lg appearance-none cursor-pointer accent-salmon-600"
                  />
                  <div className="flex justify-between text-xs text-navy-500 dark:text-navy-400 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">Dependencies</label>
                  <p className="text-xs text-navy-500 dark:text-navy-400 mb-2">
                    Select tasks from the same project that must be completed before this task can start
                  </p>
                  {formData.projectId ? (
                    <div className="border border-navy-200 dark:border-navy-700 rounded-lg max-h-48 overflow-y-auto">
                      {tasksWithResources
                        .filter((t) => t.projectId === formData.projectId)
                        .map((task) => {
                          const isSelected = formData.dependencies.includes(task.id)
                          return (
                            <label
                              key={task.id}
                              className={`flex items-center gap-3 p-3 hover:bg-navy-50 dark:hover:bg-navy-900 cursor-pointer border-b border-navy-100 dark:border-navy-800 last:border-b-0 ${
                                isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, dependencies: [...formData.dependencies, task.id] })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      dependencies: formData.dependencies.filter((id) => id !== task.id),
                                    })
                                  }
                                }}
                                className="w-4 h-4 text-purple-600 border-navy-300 rounded focus:ring-purple-500"
                              />
                              <div className="flex-1">
                                <span className="text-navy-800 dark:text-navy-100">{task.title}</span>
                                <span className="ml-2 text-sm text-navy-600 dark:text-navy-400">({task.status})</span>
                              </div>
                            </label>
                          )
                        })}
                      {tasksWithResources.filter((t) => t.projectId === formData.projectId).length === 0 && (
                        <p className="p-3 text-sm text-navy-500 dark:text-navy-400">
                          No other tasks in this project yet
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-navy-500 dark:text-navy-400">
                      Please select a project first to choose dependencies
                    </p>
                  )}
                  {formData.dependencies.length > 0 && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                      {formData.dependencies.length} {formData.dependencies.length === 1 ? 'dependency' : 'dependencies'} selected
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleCreateTask}
                  className="flex-1 px-4 py-2 bg-salmon-600 hover:bg-salmon-700 text-white rounded-lg font-medium transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-navy-200 hover:bg-navy-300 dark:bg-navy-700 dark:hover:bg-navy-600 text-navy-800 dark:text-navy-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {showEditModal && currentTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-2xl w-full">
              <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-4">Edit Task</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">Project *</label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  >
                    <option value="">Select a project</option>
                    {activeProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                {/* Status and Color in 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                      className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    >
                      <option value="Todo">Todo</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">Task Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-12 h-10 border border-navy-200 dark:border-navy-700 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent text-sm"
                        placeholder="#6366f1"
                      />
                    </div>
                  </div>
                </div>
                {/* Start and End Dates in 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">
                    Progress: {formData.progress}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                    className="w-full h-2 bg-navy-200 dark:bg-navy-700 rounded-lg appearance-none cursor-pointer accent-salmon-600"
                  />
                  <div className="flex justify-between text-xs text-navy-500 dark:text-navy-400 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleEditTask}
                  className="flex-1 px-4 py-2 bg-salmon-600 hover:bg-salmon-700 text-white rounded-lg font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setCurrentTask(null)
                  }}
                  className="flex-1 px-4 py-2 bg-navy-200 hover:bg-navy-300 dark:bg-navy-700 dark:hover:bg-navy-600 text-navy-800 dark:text-navy-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Task Modal */}
        {showDeleteModal && currentTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-4">Delete Task</h2>
              <p className="text-navy-600 dark:text-navy-400 mb-6">
                Are you sure you want to delete "{currentTask.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteTask}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setCurrentTask(null)
                  }}
                  className="flex-1 px-4 py-2 bg-navy-200 hover:bg-navy-300 dark:bg-navy-700 dark:hover:bg-navy-600 text-navy-800 dark:text-navy-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Dependencies Modal */}
        {showDependenciesModal && currentTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-4">
                Manage Dependencies for "{currentTask.title}"
              </h2>

              {/* Current Dependencies */}
              <div className="mb-6">
                <h3 className="font-semibold text-navy-700 dark:text-navy-300 mb-3">Current Dependencies:</h3>
                {getTaskDependencies(currentTask.id).length === 0 ? (
                  <p className="text-navy-500 dark:text-navy-400 text-sm">No dependencies yet.</p>
                ) : (
                  <div className="space-y-2">
                    {getTaskDependencies(currentTask.id).map((dep) => {
                      const depResources = getTaskResources(dep.id)
                      const remainingEstimate = depResources.reduce((total, r) => total + (r.estimatedDays * (r.focusFactor / 100)), 0)
                      return (
                        <div
                          key={dep.id}
                          className="flex justify-between items-center bg-navy-50 dark:bg-navy-900 p-3 rounded"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-navy-800 dark:text-navy-100">{dep.title}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                dep.status === 'Done' || remainingEstimate === 0
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                              }`}>
                                {dep.status} {remainingEstimate > 0 ? `(${remainingEstimate.toFixed(1)}d remaining)` : '(Complete)'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveDependency(dep.id)}
                            className="px-3 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Add Dependency */}
              <div className="border-t border-navy-200 dark:border-navy-700 pt-6">
                <h3 className="font-semibold text-navy-700 dark:text-navy-300 mb-3">Add Dependency:</h3>
                <p className="text-sm text-navy-600 dark:text-navy-400 mb-4">
                  Select tasks from the same project that must be completed before this task can start.
                </p>
                <div className="space-y-2">
                  {tasksWithResources
                    .filter((t) => t.projectId === currentTask.projectId && t.id !== currentTask.id)
                    .filter((t) => !getTaskDependencies(currentTask.id).some((dep) => dep.id === t.id))
                    .map((task) => (
                      <div
                        key={task.id}
                        className="flex justify-between items-center bg-navy-50 dark:bg-navy-900 p-3 rounded hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors"
                      >
                        <div>
                          <span className="font-medium text-navy-800 dark:text-navy-100">{task.title}</span>
                          <span className="ml-2 text-sm text-navy-600 dark:text-navy-400">({task.status})</span>
                        </div>
                        <button
                          onClick={() => handleAddDependency(task.id)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
                {tasksWithResources.filter((t) => t.projectId === currentTask.projectId && t.id !== currentTask.id).length === 0 && (
                  <p className="text-sm text-navy-500 dark:text-navy-400">No other tasks in this project.</p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-navy-200 dark:border-navy-700">
                <button
                  onClick={() => {
                    setShowDependenciesModal(false)
                    setCurrentTask(null)
                  }}
                  className="w-full px-4 py-2 bg-navy-200 hover:bg-navy-300 dark:bg-navy-700 dark:hover:bg-navy-600 text-navy-800 dark:text-navy-100 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Resources Modal */}
        {showResourceModal && currentTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-4">
                Manage Resources for "{currentTask.title}"
              </h2>

              {/* Current Resources */}
              <div className="mb-6">
                <h3 className="font-semibold text-navy-700 dark:text-navy-300 mb-3">Current Resources:</h3>
                {getTaskResources(currentTask.id).length === 0 ? (
                  <p className="text-navy-500 dark:text-navy-400 text-sm">No resources assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {getTaskResources(currentTask.id).map((resource) => (
                      <div
                        key={resource.id}
                        className="flex justify-between items-center bg-navy-50 dark:bg-navy-900 p-3 rounded"
                      >
                        <div>
                          <span className="font-medium text-navy-800 dark:text-navy-100">{resource.title}</span>
                          <div className="text-sm text-navy-600 dark:text-navy-400">
                            {resource.estimatedDays} days | {resource.focusFactor}% focus
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveResource(currentTask.id, resource.id)}
                          className="px-3 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Resource Form */}
              <div className="border-t border-navy-200 dark:border-navy-700 pt-6">
                <h3 className="font-semibold text-navy-700 dark:text-navy-300 mb-3">Add Resource:</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">Resource Type *</label>
                    <select
                      value={resourceFormData.resourceId}
                      onChange={(e) => setResourceFormData({ ...resourceFormData, resourceId: e.target.value })}
                      className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    >
                      <option value="">Select a resource</option>
                      {getProjectResources(currentTask.projectId).map((resource) => (
                        <option key={resource.id} value={resource.id}>
                          {resource.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">
                      Estimated Days: {resourceFormData.estimatedDays}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={resourceFormData.estimatedDays}
                      onChange={(e) =>
                        setResourceFormData({ ...resourceFormData, estimatedDays: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-navy-600 dark:text-navy-400">
                      <span>0.5 days</span>
                      <span>100 days</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">
                      Focus Factor: {resourceFormData.focusFactor}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={resourceFormData.focusFactor}
                      onChange={(e) =>
                        setResourceFormData({ ...resourceFormData, focusFactor: parseInt(e.target.value, 10) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-navy-600 dark:text-navy-400">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <button
                    onClick={handleAddResource}
                    disabled={!resourceFormData.resourceId}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-navy-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    Add Resource
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-navy-200 dark:border-navy-700">
                <button
                  onClick={() => {
                    setShowResourceModal(false)
                    setCurrentTask(null)
                  }}
                  className="w-full px-4 py-2 bg-navy-200 hover:bg-navy-300 dark:bg-navy-700 dark:hover:bg-navy-600 text-navy-800 dark:text-navy-100 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Milestone Modal */}
        {showMilestoneModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-4">
                {currentMilestone ? 'Edit Milestone' : 'Create New Milestone'}
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

export default TasksPage
