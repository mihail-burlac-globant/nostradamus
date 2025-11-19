import { useEffect, useState } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Task, Resource, TaskStatus } from '../types/entities.types'

interface TaskWithResources extends Task {
  resources: (Resource & { estimatedDays: number; focusFactor: number })[]
}

const TasksPage = () => {
  const {
    tasks,
    projects,
    loadTasks,
    loadProjects,
    addTask,
    editTask,
    removeTask,
    getProjectResources,
    assignResourceToTask,
    removeResourceFromTask,
    getTaskResources,
    initialize,
    isInitialized,
  } = useEntitiesStore()

  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>(() => {
    const saved = localStorage.getItem('nostradamus_tasks_project_filter')
    return saved || 'all'
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [tasksWithResources, setTasksWithResources] = useState<TaskWithResources[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    status: 'Todo' as TaskStatus,
  })
  const [resourceFormData, setResourceFormData] = useState({
    resourceId: '',
    estimatedDays: 1,
    focusFactor: 80,
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

  const activeProjects = projects.filter((p) => p.status === 'Active')

  const filteredTasks =
    selectedProjectFilter === 'all'
      ? tasksWithResources
      : tasksWithResources.filter((t) => t.projectId === selectedProjectFilter)

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

    addTask(formData)
    // Save the last selected project for future use
    localStorage.setItem('nostradamus_tasks_last_project', formData.projectId)
    setFormData({ title: '', description: '', projectId: '', status: 'Todo' })
    setShowCreateModal(false)
  }

  const handleEditTask = () => {
    if (!currentTask || !formData.title.trim()) return

    editTask(currentTask.id, formData)
    setFormData({ title: '', description: '', projectId: '', status: 'Todo' })
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

  const openEditModal = (task: Task) => {
    setCurrentTask(task)
    setFormData({
      title: task.title,
      description: task.description,
      projectId: task.projectId,
      status: task.status,
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
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-salmon-50 dark:from-navy-900 dark:to-salmon-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-navy-800 dark:text-navy-100">Tasks</h1>
          <button
            onClick={() => {
              // Pre-select project based on filter, or use last selected, or first active project
              const defaultProjectId = selectedProjectFilter !== 'all'
                ? selectedProjectFilter
                : localStorage.getItem('nostradamus_tasks_last_project') || (activeProjects[0]?.id || '')
              setFormData({ title: '', description: '', projectId: defaultProjectId, status: 'Todo' })
              setShowCreateModal(true)
            }}
            className="px-6 py-3 bg-salmon-600 hover:bg-salmon-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
          >
            + Add Task
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 items-center">
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
                    return (
                      <div
                        key={task.id}
                        className="border border-navy-200 dark:border-navy-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-navy-800 dark:text-navy-100 mb-1">
                              {task.title}
                            </h3>
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
                              Manage Resources
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

                        {/* Resources */}
                        {task.resources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-navy-200 dark:border-navy-700">
                            <h4 className="font-semibold text-navy-700 dark:text-navy-300 mb-2">
                              Assigned Resources:
                            </h4>
                            <div className="space-y-2">
                              {task.resources.map((resource) => {
                                const adjustedEstimate = resource.estimatedDays * (resource.focusFactor / 100)
                                return (
                                  <div
                                    key={resource.id}
                                    className="flex justify-between items-center bg-navy-50 dark:bg-navy-900 p-3 rounded"
                                  >
                                    <div className="flex-1">
                                      <span className="font-medium text-navy-800 dark:text-navy-100">
                                        {resource.title}
                                      </span>
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

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-md w-full">
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
            <div className="bg-white dark:bg-navy-800 rounded-lg p-6 max-w-md w-full">
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
      </div>
    </div>
  )
}

export default TasksPage
