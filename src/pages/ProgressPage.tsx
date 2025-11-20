import { useState, useEffect, useRef } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import { format } from 'date-fns'
import { getIconById } from '../utils/resourceIcons'

const ProgressPage = () => {
  const {
    projects,
    tasks,
    loadProjects,
    loadTasks,
    getTaskResources,
    progressSnapshots,
    loadProgressSnapshots,
    addProgressSnapshot,
    initialize,
    isInitialized,
  } = useEntitiesStore()

  // Load filter selections from localStorage or use defaults
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    return localStorage.getItem('progress_selectedProjectId') || 'all'
  })
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return localStorage.getItem('progress_selectedDate') || format(new Date(), 'yyyy-MM-dd')
  })
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    return localStorage.getItem('progress_searchTerm') || ''
  })
  const [estimates, setEstimates] = useState<Record<string, number>>({})
  const [progressValues, setProgressValues] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [changedTasks, setChangedTasks] = useState<Set<string>>(new Set())
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [currentTaskForNotes, setCurrentTaskForNotes] = useState<string | null>(null)
  const lastInitKey = useRef<string>('')

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    } else {
      loadProjects()
      loadTasks()
      loadProgressSnapshots()
    }
  }, [isInitialized, initialize, loadProjects, loadTasks, loadProgressSnapshots])

  // Persist filter selections to localStorage
  useEffect(() => {
    localStorage.setItem('progress_selectedProjectId', selectedProjectId)
  }, [selectedProjectId])

  useEffect(() => {
    localStorage.setItem('progress_selectedDate', selectedDate)
  }, [selectedDate])

  useEffect(() => {
    localStorage.setItem('progress_searchTerm', searchTerm)
  }, [searchTerm])

  // Filter active projects and tasks
  const activeProjects = projects.filter(p => p.status === 'Active')
  const activeTasks = tasks.filter(t => {
    const project = projects.find(p => p.id === t.projectId)
    return project?.status === 'Active' && t.status !== 'Done'
  })

  const filteredTasks = (selectedProjectId === 'all'
    ? activeTasks
    : activeTasks.filter(t => t.projectId === selectedProjectId)
  ).filter(t => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return t.title.toLowerCase().includes(search) ||
           (t.description && t.description.toLowerCase().includes(search))
  })

  // Initialize estimates from existing snapshots or calculated values
  // Only run when date or project selection changes, not when tasks update
  useEffect(() => {
    const initKey = `${selectedDate}-${selectedProjectId}`

    // Skip if we've already initialized for this date/project combo
    if (lastInitKey.current === initKey) {
      return
    }

    lastInitKey.current = initKey

    const newEstimates: Record<string, number> = {}
    const newProgress: Record<string, number> = {}
    const newNotes: Record<string, string> = {}

    filteredTasks.forEach(task => {
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
        const resources = getTaskResources(task.id)
        const totalEstimate = resources.reduce((sum, resource) => {
          return sum + (resource.estimatedDays * (resource.focusFactor / 100))
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
    setChangedTasks(new Set()) // Clear changed tasks when reinitializing
  }, [selectedDate, selectedProjectId, progressSnapshots, getTaskResources, filteredTasks])

  const handleSave = async () => {
    setSaveStatus('saving')

    // Create snapshots only for changed tasks
    for (const task of filteredTasks) {
      // Only save if this task was explicitly changed
      if (!changedTasks.has(task.id)) continue

      const estimate = estimates[task.id]
      const progress = progressValues[task.id]
      if (estimate !== undefined && progress !== undefined) {
        addProgressSnapshot({
          taskId: task.id,
          projectId: task.projectId,
          date: selectedDate,
          remainingEstimate: estimate,
          status: task.status,
          progress: Math.min(100, Math.max(0, progress)),
          notes: notes[task.id] || undefined,
        })
      }
    }

    // Clear changed tasks after saving
    setChangedTasks(new Set())

    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

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

  const handleOpenNotesModal = (taskId: string) => {
    setCurrentTaskForNotes(taskId)
    setShowNotesModal(true)
  }

  const handleCloseNotesModal = () => {
    setShowNotesModal(false)
    setCurrentTaskForNotes(null)
  }

  // Calculate total remaining work
  const totalRemaining = Object.values(estimates).reduce((sum, val) => sum + val, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-salmon-50 dark:from-gray-950 dark:to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-800 dark:text-navy-100 mb-2">
            Daily Progress Update
          </h1>
          <p className="text-navy-600 dark:text-navy-400">
            Update remaining estimates for your active tasks
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6 mb-6">
          {/* First Row: Date, Project, Search */}
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

            {/* Project Filter */}
            <div className="w-64">
              <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-navy-300 dark:border-navy-600 rounded-md bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 focus:outline-none focus:ring-2 focus:ring-salmon-500"
              >
                <option value="all">All Projects</option>
                {activeProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Field */}
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                Search Tasks
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
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

          {/* Second Row: Total Remaining */}
          <div className="bg-salmon-50 dark:bg-salmon-900/20 rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm font-medium text-salmon-700 dark:text-salmon-400">
              Total Remaining
            </div>
            <div className="text-2xl font-bold text-salmon-800 dark:text-salmon-300">
              {totalRemaining.toFixed(1)} days
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-8 text-center">
              <p className="text-navy-500 dark:text-navy-400 text-sm">
                {searchTerm
                  ? `No tasks found matching "${searchTerm}". Try a different search term.`
                  : 'No active tasks found. All tasks are either completed or no project is selected.'
                }
              </p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const estimate = estimates[task.id] || 0

              // Calculate original total effort
              const resources = getTaskResources(task.id)

              // Debug logging to check resource data
              if (resources.length > 0) {
                console.log(`Task "${task.title}" resources:`, resources.map(r => ({
                  id: r.id,
                  title: r.title,
                  numberOfProfiles: r.numberOfProfiles,
                  estimatedDays: r.estimatedDays
                })))
              }

              // Aggregate resources by resource ID to get total profiles per resource type
              // Use Map for more reliable aggregation
              const resourceMap = new Map<string, typeof resources[0]>()

              resources.forEach(resource => {
                const existing = resourceMap.get(resource.id)
                if (existing) {
                  // Aggregate: sum up profiles and estimated days
                  existing.numberOfProfiles += resource.numberOfProfiles
                  existing.estimatedDays += resource.estimatedDays
                } else {
                  // First occurrence: create a copy
                  resourceMap.set(resource.id, { ...resource })
                }
              })

              const aggregatedResources = Array.from(resourceMap.values())

              // Debug logging to check aggregated result
              if (aggregatedResources.length > 0) {
                console.log(`Task "${task.title}" aggregated:`, aggregatedResources.map(r => ({
                  id: r.id,
                  title: r.title,
                  numberOfProfiles: r.numberOfProfiles,
                  estimatedDays: r.estimatedDays
                })))
              }

              const totalEffort = resources.reduce((sum, resource) => {
                return sum + (resource.estimatedDays * (resource.focusFactor / 100))
              }, 0)

              // Calculate actual progress based on remaining estimate
              const calculatedProgress = totalEffort > 0
                ? Math.min(100, Math.max(0, ((totalEffort - estimate) / totalEffort) * 100))
                : 0

              // Calculate duration based on remaining estimate
              // TASK_DURATION = (REMAINING_ESTIMATION / FOCUS_FACTOR) / NUMBER_OF_PROFILES
              const resourceDurations = resources.map(resource => {
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
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-2 py-1 bg-navy-100 dark:bg-navy-700 rounded text-xs text-navy-700 dark:text-navy-300 font-medium"
                              title={`${resource.numberOfProfiles}x ${resource.title} @ ${resource.focusFactor}%`}
                            >
                              <IconComponent className="w-3.5 h-3.5" />
                              <span>{resource.numberOfProfiles}x {resource.title}</span>
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
          )}
        </div>

        {/* Save Button */}
        {filteredTasks.length > 0 && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
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

export default ProgressPage
