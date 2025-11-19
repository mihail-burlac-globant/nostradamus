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
    resources: [] as { resourceId: string; estimatedDays: number; focusFactor: number }[],
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
  const [activeModalTab, setActiveModalTab] = useState<'basic' | 'dependencies' | 'resources'>('basic')
  const [activeTab, setActiveTab] = useState<'tasks' | 'milestones'>(() => {
    const saved = localStorage.getItem('nostradamus_tasks_active_tab')
    return (saved as 'tasks' | 'milestones') || 'tasks'
  })
  const [dependencySearchTerm, setDependencySearchTerm] = useState('')

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

    // Add resources if any were selected
    if (formData.resources.length > 0 && newTask) {
      formData.resources.forEach((res) => {
        assignResourceToTask(newTask.id, res.resourceId, res.estimatedDays, res.focusFactor)
      })
    }

    // Add dependencies if any were selected
    if (formData.dependencies.length > 0 && newTask) {
      formData.dependencies.forEach((depId) => {
        try {
          addTaskDependency(newTask.id, depId)
        } catch (error) {
          console.error('Failed to add dependency:', error)
        }
      })
    }

    loadTasks() // Reload to show changes

    // Save the last selected project for future use
    localStorage.setItem('nostradamus_tasks_last_project', formData.projectId)
    setFormData({ title: '', description: '', projectId: '', status: 'Todo', progress: 0, color: '#6366f1', startDate: '', endDate: '', dependencies: [], resources: [] })
    setShowCreateModal(false)
  }

  const handleEditTask = () => {
    if (!currentTask || !formData.title.trim()) return

    editTask(currentTask.id, formData)

    // Update resources - remove old ones and add new ones
    const currentResources = getTaskResources(currentTask.id)
    const currentResourceIds = currentResources.map(r => r.id)
    const newResourceIds = formData.resources.map(r => r.resourceId)

    // Remove resources that are not in the new list
    currentResourceIds.forEach(resId => {
      if (!newResourceIds.includes(resId)) {
        removeResourceFromTask(currentTask.id, resId)
      }
    })

    // Add or update resources
    formData.resources.forEach((res) => {
      // Remove first then add to update
      if (currentResourceIds.includes(res.resourceId)) {
        removeResourceFromTask(currentTask.id, res.resourceId)
      }
      assignResourceToTask(currentTask.id, res.resourceId, res.estimatedDays, res.focusFactor)
    })

    loadTasks() // Reload to show changes

    setFormData({ title: '', description: '', projectId: '', status: 'Todo', progress: 0, color: '#6366f1', startDate: '', endDate: '', dependencies: [], resources: [] })
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
    const taskResources = getTaskResources(task.id)
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
      resources: taskResources.map(r => ({
        resourceId: r.id,
        estimatedDays: r.estimatedDays,
        focusFactor: r.focusFactor,
      })),
    })
    setActiveModalTab('basic')
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
                  setFormData({ title: '', description: '', projectId: defaultProjectId, status: 'Todo', progress: 0, color: '#6366f1', startDate: '', endDate: '', dependencies: [], resources: [] })
                  setActiveModalTab('basic')
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
                              {task.resources.length === 0 && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 text-xs rounded-full flex items-center gap-1" title="No resources assigned">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  No resources
                                </span>
                              )}
                              {!canStart && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-xs rounded-full">
                                  Blocked
                                </span>
                              )}
                            </div>
                            <p className="text-navy-600 dark:text-navy-400 mb-2">{task.description}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                              {viewMode === 'detailed' && (
                                <div className="flex items-center gap-2">
                                  <div className="w-32 h-2 bg-navy-200 dark:bg-navy-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-salmon-500 to-salmon-600 transition-all duration-300"
                                      style={{ width: `${task.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-navy-700 dark:text-navy-300 min-w-[3rem]">
                                    {task.progress}%
                                  </span>
                                </div>
                              )}
                            </div>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto py-12">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-5xl w-full my-8">
                <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-4">Create New Task</h2>

                {/* Tabs */}
                <div className="border-b border-navy-200 dark:border-navy-700 mb-4">
                  <div className="flex gap-6">
                    <button
                      onClick={() => setActiveModalTab('basic')}
                      className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                        activeModalTab === 'basic'
                          ? 'border-salmon-600 text-salmon-600'
                          : 'border-transparent text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                      }`}
                    >
                      Basic Info
                    </button>
                    <button
                      onClick={() => setActiveModalTab('dependencies')}
                      className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                        activeModalTab === 'dependencies'
                          ? 'border-salmon-600 text-salmon-600'
                          : 'border-transparent text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                      }`}
                    >
                      Dependencies {formData.dependencies.length > 0 && `(${formData.dependencies.length})`}
                    </button>
                    <button
                      onClick={() => setActiveModalTab('resources')}
                      className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                        activeModalTab === 'resources'
                          ? 'border-salmon-600 text-salmon-600'
                          : 'border-transparent text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                      }`}
                    >
                      Resources {formData.resources.length > 0 && `(${formData.resources.length})`}
                    </button>
                  </div>
                </div>

              {/* Basic Info Tab */}
              {activeModalTab === 'basic' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-navy-700 dark:text-navy-300 mb-1.5 text-sm font-medium">Project *</label>
                      <select
                        value={formData.projectId}
                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                        className="w-full px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent text-sm"
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
                      <label className="block text-navy-700 dark:text-navy-300 mb-1.5 text-sm font-medium">Title *</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent text-sm"
                        placeholder="Enter task title"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-1.5 text-sm font-medium">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent text-sm"
                      placeholder="Enter task description"
                      rows={2}
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
                      <label className="block text-navy-700 dark:text-navy-300 mb-2">
                        Start Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                        placeholder="Calculated from project start"
                      />
                      <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
                        If empty, inherits from project start and follows dependencies
                      </p>
                    </div>
                    <div>
                      <label className="block text-navy-700 dark:text-navy-300 mb-2">End Date (Read-only)</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-navy-50 dark:bg-navy-900 text-navy-500 dark:text-navy-400 cursor-not-allowed"
                        placeholder="Auto-calculated"
                        disabled
                      />
                      <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
                        Calculated from start date + resource estimates
                      </p>
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
              )}

              {/* Dependencies Tab */}
              {activeModalTab === 'dependencies' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">Task Dependencies</label>
                    <p className="text-xs text-navy-500 dark:text-navy-400 mb-2">
                      Select tasks from the same project that must be completed before this task can start
                    </p>
                    {formData.projectId ? (
                      <>
                        {/* Search Filter */}
                        <div className="mb-2">
                          <input
                            type="text"
                            value={dependencySearchTerm}
                            onChange={(e) => setDependencySearchTerm(e.target.value)}
                            placeholder="Search tasks..."
                            className="w-full px-3 py-1.5 border border-navy-200 dark:border-navy-700 rounded bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div className="border border-navy-200 dark:border-navy-700 rounded-lg max-h-80 overflow-y-auto">
                          {tasksWithResources
                            .filter((t) => t.projectId === formData.projectId)
                            .filter((t) => dependencySearchTerm === '' || t.title.toLowerCase().includes(dependencySearchTerm.toLowerCase()))
                            .map((task) => {
                              const isSelected = formData.dependencies.includes(task.id)
                              return (
                                <label
                                  key={task.id}
                                  className={`flex items-center gap-2 px-3 py-1.5 hover:bg-navy-50 dark:hover:bg-navy-900 cursor-pointer border-b border-navy-100 dark:border-navy-800 last:border-b-0 transition-colors ${
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
                                    className="w-4 h-4 text-purple-600 border-navy-300 rounded focus:ring-purple-500 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-navy-800 dark:text-navy-100 text-sm">{task.title}</span>
                                    <span className="ml-2 text-xs text-navy-600 dark:text-navy-400">({task.status})</span>
                                  </div>
                                </label>
                              )
                            })}
                          {tasksWithResources.filter((t) => t.projectId === formData.projectId && (dependencySearchTerm === '' || t.title.toLowerCase().includes(dependencySearchTerm.toLowerCase()))).length === 0 && (
                            <p className="p-3 text-sm text-navy-500 dark:text-navy-400">
                              {dependencySearchTerm ? 'No tasks match your search' : 'No other tasks in this project yet'}
                            </p>
                          )}
                        </div>
                      </>
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
              )}

              {/* Resources Tab */}
              {activeModalTab === 'resources' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">Assign Resources</label>
                    <p className="text-xs text-navy-500 dark:text-navy-400 mb-2">
                      Assign resources from the project to this task
                    </p>

                    {/* Current Resources */}
                    {formData.resources.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {formData.resources.map((res, index) => {
                          const resource = formData.projectId ? getProjectResources(formData.projectId).find(r => r.id === res.resourceId) : null
                          return (
                            <div key={index} className="flex items-center justify-between bg-navy-50 dark:bg-navy-900 p-2 rounded">
                              <div className="flex-1">
                                <span className="text-navy-800 dark:text-navy-100 font-medium">
                                  {resource?.title || 'Unknown Resource'}
                                </span>
                                <span className="text-sm text-navy-600 dark:text-navy-400 ml-2">
                                  {res.estimatedDays}d @ {res.focusFactor}%
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    resources: formData.resources.filter((_, i) => i !== index)
                                  })
                                }}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Add Resource Form */}
                    {formData.projectId ? (
                      <div className="border border-navy-200 dark:border-navy-700 rounded-lg p-3 space-y-3">
                        <div>
                          <label className="block text-navy-700 dark:text-navy-300 mb-1 text-sm">Resource</label>
                          <select
                            value={resourceFormData.resourceId}
                            onChange={(e) => setResourceFormData({ ...resourceFormData, resourceId: e.target.value })}
                            className="w-full px-3 py-2 border border-navy-200 dark:border-navy-700 rounded bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 text-sm"
                          >
                            <option value="">Select a resource</option>
                            {getProjectResources(formData.projectId)
                              .filter(r => !formData.resources.some(fr => fr.resourceId === r.id))
                              .map((resource) => (
                                <option key={resource.id} value={resource.id}>
                                  {resource.title}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-navy-700 dark:text-navy-300 mb-1 text-sm">
                              Days: {resourceFormData.estimatedDays}
                            </label>
                            <input
                              type="range"
                              min="0.5"
                              max="100"
                              step="0.5"
                              value={resourceFormData.estimatedDays}
                              onChange={(e) => setResourceFormData({ ...resourceFormData, estimatedDays: parseFloat(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-navy-700 dark:text-navy-300 mb-1 text-sm">
                              Focus: {resourceFormData.focusFactor}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={resourceFormData.focusFactor}
                              onChange={(e) => setResourceFormData({ ...resourceFormData, focusFactor: parseInt(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (resourceFormData.resourceId) {
                              setFormData({
                                ...formData,
                                resources: [...formData.resources, { ...resourceFormData }]
                              })
                              setResourceFormData({ resourceId: '', estimatedDays: 1, focusFactor: 80 })
                            }
                          }}
                          disabled={!resourceFormData.resourceId}
                          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-navy-300 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                        >
                          Add Resource
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-navy-500 dark:text-navy-400">
                        Please select a project first to assign resources
                      </p>
                    )}
                    {formData.resources.length === 0 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Warning: Task has no resources assigned
                      </p>
                    )}
                  </div>
                </div>
              )}

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
          </div>
        )}

        {/* Edit Task Modal */}
        {showEditModal && currentTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto py-12">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-5xl w-full my-8">
                <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100 mb-4">Edit Task</h2>

                {/* Tabs */}
                <div className="border-b border-navy-200 dark:border-navy-700 mb-4">
                  <div className="flex gap-6">
                    <button
                      onClick={() => setActiveModalTab('basic')}
                      className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                        activeModalTab === 'basic'
                          ? 'border-salmon-600 text-salmon-600'
                          : 'border-transparent text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                      }`}
                    >
                      Basic Info
                    </button>
                    <button
                      onClick={() => setActiveModalTab('dependencies')}
                      className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                        activeModalTab === 'dependencies'
                          ? 'border-salmon-600 text-salmon-600'
                          : 'border-transparent text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                      }`}
                    >
                      Dependencies {formData.dependencies.length > 0 && `(${formData.dependencies.length})`}
                    </button>
                    <button
                      onClick={() => setActiveModalTab('resources')}
                      className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                        activeModalTab === 'resources'
                          ? 'border-salmon-600 text-salmon-600'
                          : 'border-transparent text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                      }`}
                    >
                      Resources {formData.resources.length > 0 && `(${formData.resources.length})`}
                    </button>
                  </div>
                </div>

              {/* Basic Info Tab */}
              {activeModalTab === 'basic' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-1.5 text-sm font-medium">Project *</label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent text-sm"
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
                    <label className="block text-navy-700 dark:text-navy-300 mb-1.5 text-sm font-medium">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent text-sm"
                      placeholder="Enter task title"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-1.5 text-sm font-medium">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent text-sm"
                    placeholder="Enter task description"
                    rows={2}
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
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">
                      Start Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                      placeholder="Calculated from project start"
                    />
                    <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
                      If empty, inherits from project start and follows dependencies
                    </p>
                  </div>
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">End Date (Read-only)</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-navy-50 dark:bg-navy-900 text-navy-500 dark:text-navy-400 cursor-not-allowed"
                      placeholder="Auto-calculated"
                      disabled
                    />
                    <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
                      Calculated from start date + resource estimates
                    </p>
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
              )}

              {/* Dependencies Tab */}
              {activeModalTab === 'dependencies' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">Task Dependencies</label>
                    <p className="text-xs text-navy-500 dark:text-navy-400 mb-2">
                      Dependencies are managed separately through the Dependencies modal
                    </p>
                    <p className="text-sm text-navy-500 dark:text-navy-400 p-4 bg-navy-50 dark:bg-navy-900 rounded-lg">
                      Use the "Dependencies" button on the task card to add or remove dependencies for this task.
                    </p>
                  </div>
                </div>
              )}

              {/* Resources Tab */}
              {activeModalTab === 'resources' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">Assign Resources</label>
                    <p className="text-xs text-navy-500 dark:text-navy-400 mb-2">
                      Assign resources from the project to this task
                    </p>

                    {/* Current Resources */}
                    {formData.resources.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {formData.resources.map((res, index) => {
                          const resource = formData.projectId ? getProjectResources(formData.projectId).find(r => r.id === res.resourceId) : null
                          return (
                            <div key={index} className="flex items-center justify-between bg-navy-50 dark:bg-navy-900 p-2 rounded">
                              <div className="flex-1">
                                <span className="text-navy-800 dark:text-navy-100 font-medium">
                                  {resource?.title || 'Unknown Resource'}
                                </span>
                                <span className="text-sm text-navy-600 dark:text-navy-400 ml-2">
                                  {res.estimatedDays}d @ {res.focusFactor}%
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    resources: formData.resources.filter((_, i) => i !== index)
                                  })
                                }}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Add Resource Form */}
                    {formData.projectId ? (
                      <div className="border border-navy-200 dark:border-navy-700 rounded-lg p-3 space-y-3">
                        <div>
                          <label className="block text-navy-700 dark:text-navy-300 mb-1 text-sm">Resource</label>
                          <select
                            value={resourceFormData.resourceId}
                            onChange={(e) => setResourceFormData({ ...resourceFormData, resourceId: e.target.value })}
                            className="w-full px-3 py-2 border border-navy-200 dark:border-navy-700 rounded bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 text-sm"
                          >
                            <option value="">Select a resource</option>
                            {getProjectResources(formData.projectId)
                              .filter(r => !formData.resources.some(fr => fr.resourceId === r.id))
                              .map((resource) => (
                                <option key={resource.id} value={resource.id}>
                                  {resource.title}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-navy-700 dark:text-navy-300 mb-1 text-sm">
                              Days: {resourceFormData.estimatedDays}
                            </label>
                            <input
                              type="range"
                              min="0.5"
                              max="100"
                              step="0.5"
                              value={resourceFormData.estimatedDays}
                              onChange={(e) => setResourceFormData({ ...resourceFormData, estimatedDays: parseFloat(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-navy-700 dark:text-navy-300 mb-1 text-sm">
                              Focus: {resourceFormData.focusFactor}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={resourceFormData.focusFactor}
                              onChange={(e) => setResourceFormData({ ...resourceFormData, focusFactor: parseInt(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (resourceFormData.resourceId) {
                              setFormData({
                                ...formData,
                                resources: [...formData.resources, { ...resourceFormData }]
                              })
                              setResourceFormData({ resourceId: '', estimatedDays: 1, focusFactor: 80 })
                            }
                          }}
                          disabled={!resourceFormData.resourceId}
                          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-navy-300 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                        >
                          Add Resource
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-navy-500 dark:text-navy-400">
                        Please select a project first to assign resources
                      </p>
                    )}
                    {formData.resources.length === 0 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Warning: Task has no resources assigned
                      </p>
                    )}
                  </div>
                </div>
              )}
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
                <p className="text-sm text-navy-600 dark:text-navy-400 mb-3">
                  Select tasks from the same project that must be completed before this task can start.
                </p>
                {/* Search Filter */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={dependencySearchTerm}
                    onChange={(e) => setDependencySearchTerm(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full px-3 py-1.5 border border-navy-200 dark:border-navy-700 rounded bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tasksWithResources
                    .filter((t) => t.projectId === currentTask.projectId && t.id !== currentTask.id)
                    .filter((t) => !getTaskDependencies(currentTask.id).some((dep) => dep.id === t.id))
                    .filter((t) => dependencySearchTerm === '' || t.title.toLowerCase().includes(dependencySearchTerm.toLowerCase()))
                    .map((task) => (
                      <div
                        key={task.id}
                        className="flex justify-between items-center bg-navy-50 dark:bg-navy-900 px-3 py-2 rounded hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-navy-800 dark:text-navy-100 text-sm">{task.title}</span>
                          <span className="ml-2 text-xs text-navy-600 dark:text-navy-400">({task.status})</span>
                        </div>
                        <button
                          onClick={() => handleAddDependency(task.id)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors flex-shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
                {tasksWithResources.filter((t) => t.projectId === currentTask.projectId && t.id !== currentTask.id && (dependencySearchTerm === '' || t.title.toLowerCase().includes(dependencySearchTerm.toLowerCase()))).length === 0 && (
                  <p className="text-sm text-navy-500 dark:text-navy-400 mt-2">
                    {dependencySearchTerm ? 'No tasks match your search' : 'No other tasks in this project.'}
                  </p>
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
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={milestoneFormData.color}
                      onChange={(e) => setMilestoneFormData({ ...milestoneFormData, color: e.target.value })}
                      className="w-12 h-10 border border-navy-200 dark:border-navy-700 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={milestoneFormData.color}
                      onChange={(e) => setMilestoneFormData({ ...milestoneFormData, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900 text-navy-800 dark:text-navy-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="#9333ea"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-navy-700 dark:text-navy-300 mb-2">Icon</label>
                  <div className="grid grid-cols-7 gap-2">
                    {['flag', 'star', 'trophy', 'target', 'check', 'calendar', 'rocket'].map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setMilestoneFormData({ ...milestoneFormData, icon: iconName })}
                        className={`p-2 rounded border-2 transition-all ${
                          milestoneFormData.icon === iconName
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-navy-200 dark:border-navy-700 hover:border-purple-400'
                        }`}
                        title={iconName}
                      >
                        {iconName === 'flag' && (
                          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                          </svg>
                        )}
                        {iconName === 'star' && (
                          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        )}
                        {iconName === 'trophy' && (
                          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        )}
                        {iconName === 'target' && (
                          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        )}
                        {iconName === 'check' && (
                          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {iconName === 'calendar' && (
                          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        {iconName === 'rocket' && (
                          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
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
