import { useState, useEffect } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Task, TaskStatus } from '../types/entities.types'
import { getResourceIconEmoji } from '../utils/resourceIconEmojis'

// Simple icon components
const XMarkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

interface TaskWizardDialogProps {
  editingTask: Task | null
  projectId: string
  onClose: () => void
  onSubmit: (data: TaskFormData) => void
}

export interface TaskFormData {
  title: string
  description: string
  projectId: string
  status: TaskStatus
  progress: number
  color: string
  startDate: string
  endDate: string
  dependencies: string[]
  resources: Array<{
    resourceId: string
    estimatedDays: number
    focusFactor: number
    numberOfProfiles: number
  }>
}

// Beautiful chart-friendly color palette
const CHART_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Lime', value: '#84CC16' },
]

const TaskWizardDialog = ({ editingTask, projectId, onClose, onSubmit }: TaskWizardDialogProps) => {
  const {
    tasks,
    resources,
    getProjectResources,
    getTaskResources,
    getTaskDependencies,
    loadResources,
    loadTasks,
  } = useEntitiesStore()

  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    projectId: projectId,
    status: 'Todo',
    progress: 0,
    color: '#6366F1',
    startDate: '',
    endDate: '',
    dependencies: [],
    resources: [],
  })

  // Load resources and tasks when the dialog opens
  useEffect(() => {
    loadResources()
    loadTasks()
  }, [loadResources, loadTasks])

  // Initialize form data when editing a task
  useEffect(() => {
    if (editingTask) {
      const taskResources = getTaskResources(editingTask.id)
      const taskDependencies = getTaskDependencies(editingTask.id)

      setFormData({
        title: editingTask.title,
        description: editingTask.description,
        projectId: editingTask.projectId,
        status: editingTask.status,
        progress: editingTask.progress,
        color: editingTask.color || '#6366F1',
        startDate: editingTask.startDate || '',
        endDate: editingTask.endDate || '',
        dependencies: taskDependencies.map(d => d.id),
        resources: taskResources.map(r => ({
          resourceId: r.id,
          estimatedDays: r.estimatedDays,
          focusFactor: r.focusFactor,
          numberOfProfiles: r.numberOfProfiles || 1,
        })),
      })
    } else {
      // For new tasks, set today as start date
      const today = new Date().toISOString().split('T')[0]
      setFormData({
        title: '',
        description: '',
        projectId: projectId,
        status: 'Todo',
        progress: 0,
        color: '#6366F1',
        startDate: today,
        endDate: '',
        dependencies: [],
        resources: [],
      })
    }
  }, [editingTask, projectId, getTaskResources, getTaskDependencies])

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    if (!formData.title.trim()) return
    onSubmit(formData)
  }

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.title.trim() !== ''
    }
    return true
  }

  // Get available tasks for dependencies (same project, not the current task)
  const availableTasks = tasks.filter(t =>
    t.projectId === formData.projectId &&
    (!editingTask || t.id !== editingTask.id)
  )

  // Get available resources for the project
  const projectResources = getProjectResources(formData.projectId)
  const availableResources = resources.filter(r =>
    projectResources.some(pr => pr.id === r.id)
  )

  // Sort resources: assigned first, then others alphabetically
  const sortedResources = [...availableResources].sort((a, b) => {
    const aAssigned = formData.resources.some(r => r.resourceId === a.id)
    const bAssigned = formData.resources.some(r => r.resourceId === b.id)
    if (aAssigned && !bAssigned) return -1
    if (!aAssigned && bAssigned) return 1
    return a.title.localeCompare(b.title)
  })

  const handleResourceToggle = (resourceId: string) => {
    const isAssigned = formData.resources.some(r => r.resourceId === resourceId)
    if (isAssigned) {
      setFormData({
        ...formData,
        resources: formData.resources.filter(r => r.resourceId !== resourceId),
      })
    } else {
      const resource = resources.find(r => r.id === resourceId)
      setFormData({
        ...formData,
        resources: [
          ...formData.resources,
          {
            resourceId,
            estimatedDays: 5,
            focusFactor: resource?.defaultVelocity || 80,
            numberOfProfiles: 1,
          },
        ],
      })
    }
  }

  const handleResourceUpdate = (resourceId: string, field: 'estimatedDays' | 'focusFactor' | 'numberOfProfiles', value: number) => {
    setFormData({
      ...formData,
      resources: formData.resources.map(r =>
        r.resourceId === resourceId ? { ...r, [field]: value } : r
      ),
    })
  }

  const handleDependencyToggle = (taskId: string) => {
    const isSelected = formData.dependencies.includes(taskId)
    if (isSelected) {
      setFormData({
        ...formData,
        dependencies: formData.dependencies.filter(id => id !== taskId),
      })
    } else {
      setFormData({
        ...formData,
        dependencies: [...formData.dependencies, taskId],
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto py-12">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white dark:bg-navy-800 rounded-lg w-full max-w-4xl my-8 shadow-2xl">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-navy-200 dark:border-navy-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button
                onClick={onClose}
                className="text-navy-400 hover:text-navy-600 dark:hover:text-navy-300 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="mt-6 flex items-center justify-between max-w-2xl mx-auto">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        step < currentStep
                          ? 'bg-green-500 text-white'
                          : step === currentStep
                          ? 'bg-salmon-500 text-white'
                          : 'bg-navy-200 dark:bg-navy-700 text-navy-600 dark:text-navy-400'
                      }`}
                    >
                      {step < currentStep ? <CheckIcon className="w-5 h-5" /> : step}
                    </div>
                    <span className="text-xs mt-2 font-medium text-navy-600 dark:text-navy-400">
                      {step === 1 ? 'Basic Info' : step === 2 ? 'Dependencies' : 'Resources'}
                    </span>
                  </div>
                  {step < 3 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        step < currentStep
                          ? 'bg-green-500'
                          : 'bg-navy-200 dark:bg-navy-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-navy-900 border border-navy-300 dark:border-navy-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-salmon-500"
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-navy-900 border border-navy-300 dark:border-navy-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-salmon-500 resize-none"
                    rows={3}
                    placeholder="Enter task description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                      className="w-full px-3 py-2 bg-white dark:bg-navy-900 border border-navy-300 dark:border-navy-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-salmon-500"
                    >
                      <option value="Todo">Todo</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">
                      Progress (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white dark:bg-navy-900 border border-navy-300 dark:border-navy-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-salmon-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-navy-900 border border-navy-300 dark:border-navy-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-salmon-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-navy-900 border border-navy-300 dark:border-navy-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-salmon-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {CHART_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`h-10 rounded-lg transition-all ${
                          formData.color === color.value
                            ? 'ring-2 ring-offset-2 ring-salmon-500'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Dependencies */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-2">
                    Task Dependencies
                  </h3>
                  <p className="text-sm text-navy-600 dark:text-navy-400">
                    Select tasks that must be completed before this task can start
                  </p>
                </div>

                {availableTasks.length === 0 ? (
                  <div className="text-center py-8 text-navy-500 dark:text-navy-400">
                    No other tasks available in this project
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableTasks.map((task) => {
                      const isSelected = formData.dependencies.includes(task.id)
                      return (
                        <div
                          key={task.id}
                          onClick={() => handleDependencyToggle(task.id)}
                          className={`px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-salmon-500 bg-salmon-50 dark:bg-salmon-900/20'
                              : 'border-navy-200 dark:border-navy-700 hover:border-salmon-300 dark:hover:border-salmon-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 text-salmon-500 rounded focus:ring-salmon-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <h4 className="text-sm font-semibold text-navy-900 dark:text-white truncate">
                                  {task.title}
                                </h4>
                                <span
                                  className="text-xs px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: task.color || '#6366F1',
                                    color: 'white',
                                  }}
                                >
                                  {task.status}
                                </span>
                              </div>
                              {task.description && (
                                <p className="text-xs text-navy-500 dark:text-navy-400 truncate mt-0.5">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {formData.dependencies.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Selected {formData.dependencies.length} {formData.dependencies.length === 1 ? 'dependency' : 'dependencies'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Resources */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-2">
                    Task Resources
                  </h3>
                  <p className="text-sm text-navy-600 dark:text-navy-400">
                    Assign resources with estimation and focus factor
                  </p>
                </div>

                {sortedResources.length === 0 ? (
                  <div className="text-center py-8 text-navy-500 dark:text-navy-400">
                    No resources assigned to this project
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sortedResources.map((resource) => {
                      const isAssigned = formData.resources.some(r => r.resourceId === resource.id)
                      const resourceData = formData.resources.find(r => r.resourceId === resource.id)

                      return (
                        <div
                          key={resource.id}
                          className={`px-3 py-2 rounded-lg border transition-all ${
                            isAssigned
                              ? 'border-salmon-500 bg-salmon-50 dark:bg-salmon-900/20'
                              : 'border-navy-200 dark:border-navy-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleResourceToggle(resource.id)}
                              className="w-4 h-4 mt-1 text-salmon-500 rounded focus:ring-salmon-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{getResourceIconEmoji(resource.icon)}</span>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-navy-900 dark:text-white">
                                    {resource.title}
                                  </h4>
                                  {resource.description && (
                                    <p className="text-xs text-navy-500 dark:text-navy-400 truncate">
                                      {resource.description}
                                    </p>
                                  )}
                                </div>
                                {isAssigned && (
                                  <button
                                    onClick={() => handleResourceToggle(resource.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Remove resource"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {isAssigned && resourceData && (
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                  <div>
                                    <label className="block text-xs font-medium text-navy-600 dark:text-navy-400 mb-1">
                                      Days
                                    </label>
                                    <input
                                      type="number"
                                      min="0.5"
                                      step="0.5"
                                      value={resourceData.estimatedDays}
                                      onChange={(e) =>
                                        handleResourceUpdate(resource.id, 'estimatedDays', parseFloat(e.target.value) || 0)
                                      }
                                      className="w-full px-2 py-1 text-sm bg-white dark:bg-navy-900 border border-navy-300 dark:border-navy-600 rounded text-navy-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-salmon-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-navy-600 dark:text-navy-400 mb-1">
                                      Focus (%)
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="100"
                                      value={resourceData.focusFactor}
                                      onChange={(e) =>
                                        handleResourceUpdate(resource.id, 'focusFactor', parseInt(e.target.value) || 0)
                                      }
                                      className="w-full px-2 py-1 text-sm bg-white dark:bg-navy-900 border border-navy-300 dark:border-navy-600 rounded text-navy-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-salmon-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-navy-600 dark:text-navy-400 mb-1">
                                      Profiles
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={resourceData.numberOfProfiles}
                                      onChange={(e) =>
                                        handleResourceUpdate(resource.id, 'numberOfProfiles', parseInt(e.target.value) || 1)
                                      }
                                      className="w-full px-2 py-1 text-sm bg-white dark:bg-navy-900 border border-navy-300 dark:border-navy-600 rounded text-navy-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-salmon-500"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {formData.resources.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Assigned {formData.resources.length} {formData.resources.length === 1 ? 'resource' : 'resources'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-navy-200 dark:border-navy-700 flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-2 text-sm font-medium text-navy-700 dark:text-navy-300 border border-navy-200 dark:border-navy-700 hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-navy-700 dark:text-navy-300 border border-navy-200 dark:border-navy-700 hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition-colors"
              >
                Cancel
              </button>

              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="px-6 py-2 text-sm font-medium text-white bg-salmon-500 hover:bg-salmon-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed()}
                  className="px-6 py-2 text-sm font-medium text-white bg-salmon-500 hover:bg-salmon-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskWizardDialog
