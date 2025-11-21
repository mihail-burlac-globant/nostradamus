import { useEffect, useState, useRef } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Task, Resource, TaskStatus, Milestone } from '../types/entities.types'
import { exportToJSON, exportToCSV, exportToExcel } from '../utils/taskExporter'
import KanbanBoard from '../components/KanbanBoard'
import { getResourceIconEmoji } from '../utils/resourceIconEmojis'
import TaskWizardDialog, { type TaskFormData } from '../components/TaskWizardDialog'
import { format } from 'date-fns'
import { getIconById } from '../utils/resourceIcons'

interface TaskWithResources extends Task {
  resources: (Resource & { estimatedDays: number; focusFactor: number; numberOfProfiles: number })[]
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
    progressSnapshots,
    loadProgressSnapshots,
    addProgressSnapshot,
    removeProgressSnapshot,
    initialize,
    isInitialized,
  } = useEntitiesStore()

  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>(() => {
    const saved = localStorage.getItem('nostradamus_tasks_project_filter')
    return saved || 'all'
  })
  const [viewMode, setViewMode] = useState<'detailed' | 'compact' | 'cards' | 'progress'>(() => {
    const saved = localStorage.getItem('nostradamus_tasks_view_mode')
    return (saved as 'detailed' | 'compact' | 'cards' | 'progress') || 'detailed'
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [showDependenciesModal, setShowDependenciesModal] = useState(false)
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [showDeleteMilestoneModal, setShowDeleteMilestoneModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null)
  const [tasksWithResources, setTasksWithResources] = useState<TaskWithResources[]>([])
  const [resourceFormData, setResourceFormData] = useState({
    resourceId: '',
    estimatedDays: 1,
    focusFactor: 80,
    numberOfProfiles: 1,
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
  const [dependencySearchTerm, setDependencySearchTerm] = useState('')

  // Progress view state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return localStorage.getItem('nostradamus_tasks_progress_date') || format(new Date(), 'yyyy-MM-dd')
  })
  const [progressSearchTerm, setProgressSearchTerm] = useState<string>(() => {
    return localStorage.getItem('nostradamus_tasks_progress_search') || ''
  })
  const [estimates, setEstimates] = useState<Record<string, number>>({})
  const [progressValues, setProgressValues] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [focusFactorChanges, setFocusFactorChanges] = useState<Record<string, number>>({})
  const [changedTasks, setChangedTasks] = useState<Set<string>>(new Set())
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [currentTaskForNotes, setCurrentTaskForNotes] = useState<string | null>(null)
  const lastInitKey = useRef<string>('')

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    } else {
      loadProjects('Active')
      loadTasks()
      loadProgressSnapshots()
    }
  }, [isInitialized, initialize, loadProjects, loadTasks, loadProgressSnapshots])

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

  // Persist progress view selections
  useEffect(() => {
    localStorage.setItem('nostradamus_tasks_progress_date', selectedDate)
  }, [selectedDate])

  useEffect(() => {
    localStorage.setItem('nostradamus_tasks_progress_search', progressSearchTerm)
  }, [progressSearchTerm])

  // Initialize estimates for progress view
  useEffect(() => {
    if (viewMode !== 'progress') return

    const initKey = `${selectedDate}-${selectedProjectFilter}`

    // Skip if we've already initialized for this date/project combo
    if (lastInitKey.current === initKey) {
      return
    }

    lastInitKey.current = initKey

    const activeTasks = tasksWithResources.filter(t => {
      const project = projects.find(p => p.id === t.projectId)
      return project?.status === 'Active' && t.status !== 'Done'
    })

    const filtered = (selectedProjectFilter === 'all'
      ? activeTasks
      : activeTasks.filter(t => t.projectId === selectedProjectFilter)
    ).filter(t => {
      if (!progressSearchTerm) return true
      const search = progressSearchTerm.toLowerCase()
      return t.title.toLowerCase().includes(search) ||
             (t.description && t.description.toLowerCase().includes(search))
    })

    const newEstimates: Record<string, number> = {}
    const newProgress: Record<string, number> = {}
    const newNotes: Record<string, string> = {}

    filtered.forEach(task => {
      // Check if snapshot exists for this task and date
      const existingSnapshot = progressSnapshots.find(
        s => s.taskId === task.id && s.date === selectedDate
      )

      if (existingSnapshot) {
        newEstimates[task.id] = existingSnapshot.remainingEstimate
        newProgress[task.id] = existingSnapshot.progress
        newNotes[task.id] = existingSnapshot.notes || ''
      } else {
        // Calculate remaining estimate from resources
        const totalEstimate = task.resources.reduce((sum, resource) => {
          return sum + resource.estimatedDays
        }, 0)
        const remaining = totalEstimate * (1 - task.progress / 100)
        newEstimates[task.id] = Math.max(0, Number(remaining.toFixed(2)))
        newProgress[task.id] = task.progress
        newNotes[task.id] = ''
      }
    })

    setEstimates(newEstimates)
    setProgressValues(newProgress)
    setNotes(newNotes)
    setChangedTasks(new Set())
  }, [viewMode, selectedDate, selectedProjectFilter, progressSearchTerm, progressSnapshots, tasksWithResources, projects])

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


  const handleDeleteTask = () => {
    if (!currentTask) return

    removeTask(currentTask.id)
    setCurrentTask(null)
    setShowDeleteModal(false)
  }

  // Wizard handlers
  const handleWizardSubmit = (wizardData: TaskFormData) => {
    if (currentTask) {
      // Editing existing task
      editTask(currentTask.id, wizardData)

      // Update resources - remove old ones and add new ones
      const currentResources = getTaskResources(currentTask.id)
      const currentResourceIds = currentResources.map(r => r.id)
      const newResourceIds = wizardData.resources.map(r => r.resourceId)

      // Remove resources that are not in the new list
      currentResourceIds.forEach(resId => {
        if (!newResourceIds.includes(resId)) {
          removeResourceFromTask(currentTask.id, resId)
        }
      })

      // Add or update resources
      wizardData.resources.forEach((res) => {
        // Remove first then add to update
        if (currentResourceIds.includes(res.resourceId)) {
          removeResourceFromTask(currentTask.id, res.resourceId)
        }
        assignResourceToTask(currentTask.id, res.resourceId, res.estimatedDays, res.focusFactor, res.numberOfProfiles)
      })

      // Update dependencies - remove old ones and add new ones
      const currentDependencies = getTaskDependencies(currentTask.id)
      const currentDependencyIds = currentDependencies.map(d => d.id)
      const newDependencyIds = wizardData.dependencies

      // Remove dependencies that are not in the new list
      currentDependencyIds.forEach(depId => {
        if (!newDependencyIds.includes(depId)) {
          removeTaskDependency(currentTask.id, depId)
        }
      })

      // Add new dependencies
      newDependencyIds.forEach((depId) => {
        if (!currentDependencyIds.includes(depId)) {
          try {
            addTaskDependency(currentTask.id, depId)
          } catch (error) {
            console.error('Failed to add dependency:', error)
          }
        }
      })

      loadTasks()
      setCurrentTask(null)
      setShowEditModal(false)
    } else {
      // Creating new task
      const newTask = addTask(wizardData)

      // Add resources if any were selected
      if (wizardData.resources.length > 0 && newTask) {
        wizardData.resources.forEach((res) => {
          assignResourceToTask(newTask.id, res.resourceId, res.estimatedDays, res.focusFactor, res.numberOfProfiles)
        })
      }

      // Add dependencies if any were selected
      if (wizardData.dependencies.length > 0 && newTask) {
        wizardData.dependencies.forEach((depId) => {
          try {
            addTaskDependency(newTask.id, depId)
          } catch (error) {
            console.error('Failed to add dependency:', error)
          }
        })
      }

      loadTasks()
      localStorage.setItem('nostradamus_tasks_last_project', wizardData.projectId)
      setShowCreateModal(false)
    }
  }

  const closeWizard = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setCurrentTask(null)
  }

  // Export handlers
  const handleExport = (format: 'json' | 'csv' | 'excel') => {
    if (selectedProjectFilter === 'all') {
      alert('Please select a specific project to export')
      return
    }

    const project = projects.find(p => p.id === selectedProjectFilter)
    if (!project) {
      alert('Project not found')
      return
    }

    const projectTasks = filteredTasks.filter(t => t.projectId === selectedProjectFilter)

    // Build task resources map
    const taskResourcesMap = new Map()
    projectTasks.forEach(task => {
      taskResourcesMap.set(task.id, getTaskResources(task.id))
    })

    // Build task dependencies map
    const taskDependenciesMap = new Map()
    projectTasks.forEach(task => {
      taskDependenciesMap.set(task.id, getTaskDependencies(task.id))
    })

    const exportData = {
      project,
      tasks: projectTasks,
      taskResources: taskResourcesMap,
      taskDependencies: taskDependenciesMap,
    }

    switch (format) {
      case 'json':
        exportToJSON(exportData)
        break
      case 'csv':
        exportToCSV(exportData)
        break
      case 'excel':
        exportToExcel(exportData)
        break
    }

    setShowExportMenu(false)
  }

  const handleAddResource = () => {
    if (!currentTask || !resourceFormData.resourceId) return

    assignResourceToTask(
      currentTask.id,
      resourceFormData.resourceId,
      resourceFormData.estimatedDays,
      resourceFormData.focusFactor,
      resourceFormData.numberOfProfiles
    )
    loadTasks()
    setResourceFormData({ resourceId: '', estimatedDays: 1, focusFactor: 80, numberOfProfiles: 1 })
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
    setShowEditModal(true)
  }

  const openDeleteModal = (task: Task) => {
    setCurrentTask(task)
    setShowDeleteModal(true)
  }

  const openResourceModal = (task: Task) => {
    setCurrentTask(task)
    setResourceFormData({ resourceId: '', estimatedDays: 1, focusFactor: 80, numberOfProfiles: 1 })
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

  // Progress view handlers
  const handleEstimateChange = (taskId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setEstimates(prev => ({ ...prev, [taskId]: Math.max(0, numValue) }))
    setChangedTasks(prev => new Set(prev).add(taskId))
  }

  const handleProgressChange = (taskId: string, value: string) => {
    const numValue = parseInt(value) || 0
    setProgressValues(prev => ({ ...prev, [taskId]: Math.min(100, Math.max(0, numValue)) }))
    setChangedTasks(prev => new Set(prev).add(taskId))
  }

  const handleNotesChange = (taskId: string, value: string) => {
    setNotes(prev => ({ ...prev, [taskId]: value }))
    setChangedTasks(prev => new Set(prev).add(taskId))
  }

  const handleQuickAdjust = (taskId: string, delta: number) => {
    setEstimates(prev => ({
      ...prev,
      [taskId]: Math.max(0, (prev[taskId] || 0) + delta)
    }))
    setChangedTasks(prev => new Set(prev).add(taskId))
  }

  const handleFocusFactorChange = (taskId: string, resourceId: string, value: string) => {
    const numValue = parseInt(value) || 0
    const clampedValue = Math.min(100, Math.max(0, numValue))
    const key = `${taskId}-${resourceId}`
    setFocusFactorChanges(prev => ({ ...prev, [key]: clampedValue }))
    setChangedTasks(prev => new Set(prev).add(taskId))
  }

  const handleOpenNotesModal = (taskId: string) => {
    setCurrentTaskForNotes(taskId)
    setShowNotesModal(true)
  }

  const handleCloseNotesModal = () => {
    setShowNotesModal(false)
    setCurrentTaskForNotes(null)
  }

  const handleSaveProgress = async () => {
    setSaveStatus('saving')

    const activeTasks = tasksWithResources.filter(t => {
      const project = projects.find(p => p.id === t.projectId)
      return project?.status === 'Active' && t.status !== 'Done'
    })

    const filteredForSave = (selectedProjectFilter === 'all'
      ? activeTasks
      : activeTasks.filter(t => t.projectId === selectedProjectFilter)
    ).filter(t => {
      if (!progressSearchTerm) return true
      const search = progressSearchTerm.toLowerCase()
      return t.title.toLowerCase().includes(search) ||
             (t.description && t.description.toLowerCase().includes(search))
    })

    // Create snapshots only for changed tasks
    for (const task of filteredForSave) {
      if (!changedTasks.has(task.id)) continue

      const estimate = estimates[task.id]
      const progress = progressValues[task.id]
      if (estimate !== undefined && progress !== undefined) {
        const clampedProgress = Math.min(100, Math.max(0, progress))

        // Save to progress snapshot
        addProgressSnapshot({
          taskId: task.id,
          projectId: task.projectId,
          date: selectedDate,
          remainingEstimate: estimate,
          status: task.status,
          progress: clampedProgress,
          notes: notes[task.id] || undefined,
        })

        // Also update the task's base progress field
        editTask(task.id, { progress: clampedProgress })
      }

      // Save focus factor changes for this task's resources
      const resources = getTaskResources(task.id)
      resources.forEach(resource => {
        const key = `${task.id}-${resource.id}`
        const newFocusFactor = focusFactorChanges[key]
        if (newFocusFactor !== undefined) {
          assignResourceToTask(
            task.id,
            resource.id,
            resource.estimatedDays,
            newFocusFactor,
            resource.numberOfProfiles
          )
        }
      })
    }

    loadProgressSnapshots()
    loadTasks()
    lastInitKey.current = ''
    setChangedTasks(new Set())
    setFocusFactorChanges({})

    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const handleResetEstimates = () => {
    if (!confirm('Are you sure you want to reset all remaining estimates to their original values? This will remove all manual updates for the selected date.')) {
      return
    }

    const activeTasks = tasksWithResources.filter(t => {
      const project = projects.find(p => p.id === t.projectId)
      return project?.status === 'Active' && t.status !== 'Done'
    })

    const filtered = (selectedProjectFilter === 'all'
      ? activeTasks
      : activeTasks.filter(t => t.projectId === selectedProjectFilter)
    ).filter(t => {
      if (!progressSearchTerm) return true
      const search = progressSearchTerm.toLowerCase()
      return t.title.toLowerCase().includes(search) ||
             (t.description && t.description.toLowerCase().includes(search))
    })

    // Remove all snapshots for the selected date and filtered tasks
    filtered.forEach(task => {
      const snapshot = progressSnapshots.find(
        s => s.taskId === task.id && s.date === selectedDate
      )
      if (snapshot) {
        removeProgressSnapshot(snapshot.id)
      }
    })

    loadProgressSnapshots()
    lastInitKey.current = ''

    // Trigger reinitialization
    const newEstimates: Record<string, number> = {}
    const newProgress: Record<string, number> = {}
    const newNotes: Record<string, string> = {}

    filtered.forEach(task => {
      const totalEstimate = task.resources.reduce((sum, resource) => {
        return sum + resource.estimatedDays
      }, 0)
      const remaining = totalEstimate * (1 - task.progress / 100)
      newEstimates[task.id] = Math.max(0, Number(remaining.toFixed(2)))
      newProgress[task.id] = task.progress
      newNotes[task.id] = ''
    })

    setEstimates(newEstimates)
    setProgressValues(newProgress)
    setNotes(newNotes)
    setFocusFactorChanges({})
    setChangedTasks(new Set())
  }

  const calculateTotalEstimate = (resources: (Resource & { estimatedDays: number; focusFactor: number })[]) => {
    return resources.reduce((total, resource) => {
      // Total is just the sum of estimated days (person-days of work)
      // Focus factor doesn't change the amount of work, only the duration
      return total + resource.estimatedDays
    }, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-salmon-50 dark:from-gray-950 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* First Row: Page Title on Left, Project Selector + Tabs on Right */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-navy-800 dark:text-navy-100">Tasks & Milestones</h1>
          <div className="flex items-center gap-4">
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
        </div>

        {/* Tasks Tab Content */}
        {activeTab === 'tasks' && (
          <>
            {/* Second Row: View Options on Left, Action Buttons on Right */}
            <div className="mb-6 flex gap-6 items-center flex-wrap justify-between">
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
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`
                        px-4 py-2 rounded-md font-medium text-sm transition-all duration-200
                        ${
                          viewMode === 'cards'
                            ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-500 shadow-sm'
                            : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                        }
                      `}
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => setViewMode('progress')}
                      className={`
                        px-4 py-2 rounded-md font-medium text-sm transition-all duration-200
                        ${
                          viewMode === 'progress'
                            ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-500 shadow-sm'
                            : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
                        }
                      `}
                    >
                      Progress
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {/* Export Button with Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="px-4 py-2 bg-navy-600 hover:bg-navy-700 dark:bg-navy-700 dark:hover:bg-navy-600 text-white rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export
                  </button>

                  {/* Export Dropdown Menu */}
                  {showExportMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowExportMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-navy-800 rounded-lg shadow-xl border border-navy-200 dark:border-navy-700 z-20">
                        <div className="py-2">
                          <button
                            onClick={() => handleExport('json')}
                            className="w-full px-4 py-2 text-left text-navy-700 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-700 flex items-center gap-3"
                          >
                            <span className="text-lg">📄</span>
                            <span>Export as JSON</span>
                          </button>
                          <button
                            onClick={() => handleExport('csv')}
                            className="w-full px-4 py-2 text-left text-navy-700 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-700 flex items-center gap-3"
                          >
                            <span className="text-lg">📊</span>
                            <span>Export as CSV</span>
                          </button>
                          <button
                            onClick={() => handleExport('excel')}
                            className="w-full px-4 py-2 text-left text-navy-700 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-700 flex items-center gap-3"
                          >
                            <span className="text-lg">📗</span>
                            <span>Export as Excel</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Add Task Button */}
                <button
                  onClick={() => {
                    setShowCreateModal(true)
                  }}
                  className="px-4 py-2 bg-salmon-600 hover:bg-salmon-700 text-white rounded-lg font-medium text-sm transition-all duration-200"
                >
                  + Add Task
                </button>
              </div>
            </div>

            {/* Tasks - Progress View, Cards View, or List View */}
            {viewMode === 'progress' ? (
              // Progress View - Inline Editing
              <div className="space-y-4">
            {/* Progress View Controls */}
            <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
              <div className="flex flex-wrap gap-4 items-end mb-4">
                {/* Date Selector */}
                <div className="w-48">
                  <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full h-10 px-3 py-2 border border-navy-300 dark:border-navy-600 rounded-md bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 focus:outline-none focus:ring-2 focus:ring-salmon-500"
                  />
                </div>

                {/* Search Field */}
                <div className="flex-1 min-w-64">
                  <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                    Search Tasks
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={progressSearchTerm}
                      onChange={(e) => setProgressSearchTerm(e.target.value)}
                      placeholder="Search by task name or description..."
                      className="w-full h-10 px-3 py-2 pl-10 border border-navy-300 dark:border-navy-600 rounded-md bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 placeholder-navy-400 dark:placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-salmon-500"
                    />
                    <svg
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-navy-400 dark:text-navy-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {progressSearchTerm && (
                      <button
                        onClick={() => setProgressSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-navy-400 hover:text-navy-600 dark:text-navy-500 dark:hover:text-navy-300"
                        title="Clear search"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Remaining and Reset Button */}
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-salmon-50 dark:bg-salmon-900/20 rounded-lg p-4 flex items-center justify-between">
                  <div className="text-sm font-medium text-salmon-700 dark:text-salmon-400">
                    Total Remaining
                  </div>
                  <div className="text-2xl font-bold text-salmon-800 dark:text-salmon-300">
                    {Object.values(estimates).reduce((sum, val) => sum + val, 0).toFixed(1)} days
                  </div>
                </div>
                <button
                  onClick={handleResetEstimates}
                  className="px-4 py-3 bg-navy-100 hover:bg-navy-200 dark:bg-navy-700 dark:hover:bg-navy-600 text-navy-700 dark:text-navy-300 rounded-lg font-medium transition-colors flex items-center gap-2"
                  title="Reset all estimates to original values"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset Estimates
                </button>
              </div>
            </div>

            {/* Progress Tasks List */}
            <div className="space-y-2">
              {(() => {
                const activeTasks = tasksWithResources.filter(t => {
                  const project = projects.find(p => p.id === t.projectId)
                  return project?.status === 'Active' && t.status !== 'Done'
                })

                const progressFiltered = (selectedProjectFilter === 'all'
                  ? activeTasks
                  : activeTasks.filter(t => t.projectId === selectedProjectFilter)
                ).filter(t => {
                  if (!progressSearchTerm) return true
                  const search = progressSearchTerm.toLowerCase()
                  return t.title.toLowerCase().includes(search) ||
                         (t.description && t.description.toLowerCase().includes(search))
                })

                if (progressFiltered.length === 0) {
                  return (
                    <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-8 text-center">
                      <p className="text-navy-500 dark:text-navy-400 text-sm">
                        {progressSearchTerm
                          ? `No tasks found matching "${progressSearchTerm}". Try a different search term.`
                          : 'No active tasks found. All tasks are either completed or no project is selected.'
                        }
                      </p>
                    </div>
                  )
                }

                return progressFiltered.map(task => {
                  const estimate = estimates[task.id] || 0

                  // Aggregate resources by resource ID
                  const resourceMap = new Map<string, typeof task.resources[0]>()
                  task.resources.forEach(resource => {
                    const existing = resourceMap.get(resource.id)
                    if (existing) {
                      existing.numberOfProfiles += resource.numberOfProfiles
                      existing.estimatedDays += resource.estimatedDays
                    } else {
                      resourceMap.set(resource.id, { ...resource })
                    }
                  })
                  const aggregatedResources = Array.from(resourceMap.values())

                  const totalEffort = task.resources.reduce((sum, resource) => {
                    return sum + resource.estimatedDays
                  }, 0)

                  const calculatedProgress = totalEffort > 0
                    ? Math.min(100, Math.max(0, ((totalEffort - estimate) / totalEffort) * 100))
                    : 0

                  const resourceDurations = task.resources.map(resource => {
                    const numberOfProfiles = resource.numberOfProfiles || 1
                    const focusFactor = (resource.focusFactor || 80) / 100
                    return estimate / (numberOfProfiles * focusFactor)
                  })
                  const calculatedDuration = resourceDurations.length > 0
                    ? Math.max(...resourceDurations)
                    : 0

                  return (
                    <div
                      key={task.id}
                      className="bg-white dark:bg-navy-800 rounded-lg shadow-sm p-4 border-l-4 hover:shadow-md transition-shadow"
                      style={{ borderLeftColor: task.color || '#6366f1' }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Task Info Section - 70% */}
                        <div className="flex-1 min-w-0" style={{ flexBasis: '70%' }}>
                          {/* Title and Status Row */}
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: task.color || '#6366f1' }}
                            />
                            <h3 className="font-semibold text-base text-navy-800 dark:text-navy-100 truncate">
                              {task.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 font-medium ${
                              task.status === 'In Progress'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                : task.status === 'Todo'
                                ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            }`}>
                              {task.status}
                            </span>
                          </div>

                          {/* Resource Profiles Row */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {aggregatedResources.map((resource, idx) => {
                              const IconComponent = getIconById(resource.icon || 'generic')
                              const key = `${task.id}-${resource.id}`
                              const currentFocusFactor = focusFactorChanges[key] !== undefined
                                ? focusFactorChanges[key]
                                : resource.focusFactor
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-navy-100 dark:bg-navy-700 rounded text-xs text-navy-700 dark:text-navy-300 font-medium"
                                >
                                  <IconComponent className="w-3.5 h-3.5" />
                                  <span>{resource.numberOfProfiles}x {resource.title}</span>
                                  <span className="text-navy-500 dark:text-navy-400">@</span>
                                  <input
                                    type="number"
                                    value={currentFocusFactor}
                                    onChange={(e) => handleFocusFactorChange(task.id, resource.id, e.target.value)}
                                    min="0"
                                    max="100"
                                    className="w-10 h-5 px-1 border border-navy-300 dark:border-navy-600 rounded bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 focus:outline-none focus:ring-1 focus:ring-salmon-500 text-center text-xs"
                                    title="Focus factor percentage"
                                  />
                                  <span>%</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Estimation Section - 15% */}
                        <div className="flex flex-col items-end" style={{ flexBasis: '15%', minWidth: '140px' }}>
                          <label className="text-xs font-medium text-navy-600 dark:text-navy-400 mb-1">
                            Remaining Days
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleQuickAdjust(task.id, -0.5)}
                              className="w-7 h-7 flex items-center justify-center bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 rounded hover:bg-navy-200 dark:hover:bg-navy-600 transition-colors font-bold"
                              title="Decrease by 0.5 days"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={estimate}
                              onChange={(e) => handleEstimateChange(task.id, e.target.value)}
                              step="0.5"
                              min="0"
                              className="w-16 h-7 px-2 border border-navy-300 dark:border-navy-600 rounded bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 focus:outline-none focus:ring-2 focus:ring-salmon-500 text-center text-sm font-bold"
                            />
                            <button
                              onClick={() => handleQuickAdjust(task.id, 0.5)}
                              className="w-7 h-7 flex items-center justify-center bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 rounded hover:bg-navy-200 dark:hover:bg-navy-600 transition-colors font-bold"
                              title="Increase by 0.5 days"
                            >
                              +
                            </button>
                          </div>
                          {calculatedDuration > 0 && (
                            <div className="mt-1 text-xs text-navy-500 dark:text-navy-400">
                              Duration: ~{calculatedDuration.toFixed(1)}d
                            </div>
                          )}
                        </div>

                        {/* Progress Control Section - 10% */}
                        <div className="flex flex-col items-center" style={{ flexBasis: '10%', minWidth: '80px' }}>
                          <label className="text-xs font-medium text-navy-600 dark:text-navy-400 mb-1">
                            Progress
                          </label>
                          <input
                            type="number"
                            value={progressValues[task.id] || 0}
                            onChange={(e) => handleProgressChange(task.id, e.target.value)}
                            min="0"
                            max="100"
                            className="w-16 h-7 px-2 border border-navy-300 dark:border-navy-600 rounded bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 focus:outline-none focus:ring-2 focus:ring-salmon-500 text-center text-sm font-bold"
                          />
                          <div className="mt-1 text-xs text-navy-500 dark:text-navy-400">
                            Calc: {calculatedProgress.toFixed(0)}%
                          </div>
                        </div>

                        {/* Comment Icon - 5% */}
                        <div className="flex items-center justify-center" style={{ flexBasis: '5%', minWidth: '40px' }}>
                          <button
                            onClick={() => handleOpenNotesModal(task.id)}
                            className="w-9 h-9 flex items-center justify-center text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200 hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition-colors"
                            title={notes[task.id] ? "Edit notes" : "Add notes"}
                          >
                            <svg
                              className={`w-5 h-5 ${notes[task.id] ? 'text-blue-600 dark:text-blue-400' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>

            {/* Save Button */}
            {(() => {
              const activeTasks = tasksWithResources.filter(t => {
                const project = projects.find(p => p.id === t.projectId)
                return project?.status === 'Active' && t.status !== 'Done'
              })
              const progressFiltered = (selectedProjectFilter === 'all'
                ? activeTasks
                : activeTasks.filter(t => t.projectId === selectedProjectFilter)
              ).filter(t => {
                if (!progressSearchTerm) return true
                const search = progressSearchTerm.toLowerCase()
                return t.title.toLowerCase().includes(search) ||
                       (t.description && t.description.toLowerCase().includes(search))
              })

              if (progressFiltered.length > 0) {
                return (
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleSaveProgress}
                      disabled={saveStatus === 'saving'}
                      className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 shadow-lg ${
                        saveStatus === 'saved'
                          ? 'bg-green-600 hover:bg-green-700'
                          : saveStatus === 'saving'
                          ? 'bg-navy-400 cursor-not-allowed'
                          : 'bg-salmon-600 hover:bg-salmon-700 hover:shadow-xl'
                      }`}
                    >
                      {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved!' : 'Save Progress Update'}
                    </button>
                  </div>
                )
              }
              return null
            })()}
              </div>
            ) : viewMode === 'cards' ? (
              // Kanban Board View
              <div className="mt-6">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-navy-800 rounded-lg shadow-md">
                <p className="text-navy-500 dark:text-navy-400">No tasks found. Create your first task!</p>
              </div>
            ) : (
              <KanbanBoard
                tasks={tasksWithResources.filter(task =>
                  selectedProjectFilter === 'all' ? true : task.projectId === selectedProjectFilter
                )}
                onEditTask={openEditModal}
                onDeleteTask={openDeleteModal}
                onResourcesClick={openResourceModal}
                onDependenciesClick={openDependenciesModal}
                onStatusChange={(taskId: string, newStatus: TaskStatus) => {
                  const task = tasks.find(t => t.id === taskId)
                  if (task) {
                    editTask(taskId, {
                      title: task.title,
                      description: task.description,
                      projectId: task.projectId,
                      status: newStatus,
                      progress: task.progress,
                      color: task.color,
                      startDate: task.startDate || '',
                      endDate: task.endDate || '',
                    })
                  }
                }}
                getTaskDependencies={getTaskDependencies}
                canTaskBeStarted={canTaskBeStarted}
                calculateTotalEstimate={calculateTotalEstimate}
              />
            )}
              </div>
            ) : (
              // List View (Detailed or Compact)
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
                                // Adjusted = calendar duration accounting for focus factor
                                // If 10 days work at 75% focus = 10 / 0.75 = 13.33 calendar days
                                const adjustedEstimate = resource.estimatedDays / (resource.focusFactor / 100)
                                const emoji = getResourceIconEmoji(resource.icon || 'generic')
                                return (
                                  <div
                                    key={resource.id}
                                    className="flex justify-between items-center bg-navy-50 dark:bg-navy-900 p-3 rounded"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl" role="img" aria-label={resource.title}>
                                          {emoji}
                                        </span>
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
            )
          </>
        )}

        {/* Milestones Tab Content */}
        {activeTab === 'milestones' && (
          <>
            {/* Actions for Milestones */}
            <div className="mb-6 flex justify-end">
              {selectedProjectFilter !== 'all' && (
                <button
                  onClick={() => {
                    setCurrentMilestone(null)
                    setMilestoneFormData({ title: '', date: '', icon: 'flag', color: '#9333ea' })
                    setShowMilestoneModal(true)
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-all duration-200"
                >
                  + Add Milestone
                </button>
              )}
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

        {/* Create/Edit Task Wizard */}
        {(showCreateModal || showEditModal) && (
          <TaskWizardDialog
            editingTask={currentTask}
            projectId={
              currentTask?.projectId ||
              (selectedProjectFilter !== 'all'
                ? selectedProjectFilter
                : localStorage.getItem('nostradamus_tasks_last_project') || (activeProjects[0]?.id || ''))
            }
            onClose={closeWizard}
            onSubmit={handleWizardSubmit}
          />
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
                            {resource.numberOfProfiles}x profiles | {resource.estimatedDays} days | {resource.focusFactor}% focus
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
                  <div>
                    <label className="block text-navy-700 dark:text-navy-300 mb-2">
                      Number of Profiles: {resourceFormData.numberOfProfiles}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={resourceFormData.numberOfProfiles}
                      onChange={(e) =>
                        setResourceFormData({ ...resourceFormData, numberOfProfiles: parseInt(e.target.value, 10) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-navy-600 dark:text-navy-400">
                      <span>1 profile</span>
                      <span>10 profiles</span>
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
                    {[
                      { name: 'flag', emoji: '🚩' },
                      { name: 'star', emoji: '⭐' },
                      { name: 'trophy', emoji: '🏆' },
                      { name: 'target', emoji: '🎯' },
                      { name: 'check', emoji: '✅' },
                      { name: 'calendar', emoji: '📅' },
                      { name: 'rocket', emoji: '🚀' },
                    ].map((icon) => (
                      <button
                        key={icon.name}
                        type="button"
                        onClick={() => setMilestoneFormData({ ...milestoneFormData, icon: icon.name })}
                        className={`p-2 rounded border-2 transition-all ${
                          milestoneFormData.icon === icon.name
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-navy-200 dark:border-navy-700 hover:border-purple-400'
                        }`}
                        title={icon.name}
                      >
                        <span className="text-2xl">{icon.emoji}</span>
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

        {/* Notes Modal */}
        {showNotesModal && currentTaskForNotes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-navy-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-navy-800 dark:text-navy-100">
                  Task Notes
                </h3>
                <button
                  onClick={handleCloseNotesModal}
                  className="text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mb-4">
                <p className="text-sm text-navy-600 dark:text-navy-400 mb-2">
                  {tasks.find(t => t.id === currentTaskForNotes)?.title}
                </p>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes[currentTaskForNotes] || ''}
                  onChange={(e) => handleNotesChange(currentTaskForNotes, e.target.value)}
                  placeholder="Add notes about blockers, progress, issues, or any relevant information..."
                  rows={6}
                  className="w-full px-3 py-2 border border-navy-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 placeholder-navy-400 dark:placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-salmon-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseNotesModal}
                  className="px-4 py-2 bg-navy-200 hover:bg-navy-300 dark:bg-navy-700 dark:hover:bg-navy-600 text-navy-800 dark:text-navy-100 rounded-lg font-medium transition-colors"
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
