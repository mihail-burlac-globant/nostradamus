import { useState, useEffect } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import { format } from 'date-fns'

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
  } = useEntitiesStore()

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [estimates, setEstimates] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    loadProjects()
    loadTasks()
    loadProgressSnapshots()
  }, [loadProjects, loadTasks, loadProgressSnapshots])

  // Filter active projects and tasks
  const activeProjects = projects.filter(p => p.status === 'Active')
  const activeTasks = tasks.filter(t => {
    const project = projects.find(p => p.id === t.projectId)
    return project?.status === 'Active' && t.status !== 'Done'
  })

  const filteredTasks = selectedProjectId === 'all'
    ? activeTasks
    : activeTasks.filter(t => t.projectId === selectedProjectId)

  // Initialize estimates from existing snapshots or calculated values
  useEffect(() => {
    const newEstimates: Record<string, number> = {}
    const newNotes: Record<string, string> = {}

    filteredTasks.forEach(task => {
      // Check if snapshot exists for this task and date
      const existingSnapshot = progressSnapshots.find(
        s => s.taskId === task.id && s.date === selectedDate
      )

      if (existingSnapshot) {
        newEstimates[task.id] = existingSnapshot.remainingEstimate
        newNotes[task.id] = existingSnapshot.notes || ''
      } else {
        // Calculate remaining estimate from resources
        const resources = getTaskResources(task.id)
        const totalEstimate = resources.reduce((sum, resource) => {
          return sum + (resource.estimatedDays * (resource.focusFactor / 100))
        }, 0)
        const remaining = totalEstimate * (1 - task.progress / 100)
        newEstimates[task.id] = Math.max(0, Number(remaining.toFixed(2)))
        newNotes[task.id] = ''
      }
    })

    setEstimates(newEstimates)
    setNotes(newNotes)
  }, [filteredTasks, selectedDate, progressSnapshots, getTaskResources])

  const handleSave = async () => {
    setSaveStatus('saving')

    // Create snapshots for all tasks with estimates
    for (const task of filteredTasks) {
      const estimate = estimates[task.id]
      if (estimate !== undefined) {
        addProgressSnapshot({
          taskId: task.id,
          projectId: task.projectId,
          date: selectedDate,
          remainingEstimate: estimate,
          status: task.status,
          progress: task.progress,
          notes: notes[task.id] || undefined,
        })
      }
    }

    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const handleEstimateChange = (taskId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setEstimates(prev => ({ ...prev, [taskId]: Math.max(0, numValue) }))
  }

  const handleNotesChange = (taskId: string, value: string) => {
    setNotes(prev => ({ ...prev, [taskId]: value }))
  }

  const handleQuickAdjust = (taskId: string, delta: number) => {
    setEstimates(prev => ({
      ...prev,
      [taskId]: Math.max(0, (prev[taskId] || 0) + delta)
    }))
  }

  // Calculate total remaining work
  const totalRemaining = Object.values(estimates).reduce((sum, val) => sum + val, 0)

  return (
    <div className="min-h-screen bg-navy-50 dark:bg-navy-950 p-8">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Selector */}
            <div>
              <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-navy-300 dark:border-navy-600 rounded-md bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 focus:outline-none focus:ring-2 focus:ring-salmon-500"
              />
            </div>

            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-navy-300 dark:border-navy-600 rounded-md bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 focus:outline-none focus:ring-2 focus:ring-salmon-500"
              >
                <option value="all">All Projects</option>
                {activeProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary */}
            <div className="flex items-end">
              <div className="bg-salmon-50 dark:bg-salmon-900/20 rounded-lg p-4 w-full">
                <div className="text-sm text-salmon-700 dark:text-salmon-400 mb-1">
                  Total Remaining
                </div>
                <div className="text-2xl font-bold text-salmon-800 dark:text-salmon-300">
                  {totalRemaining.toFixed(1)} days
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-12 text-center">
              <p className="text-navy-500 dark:text-navy-400">
                No active tasks found. All tasks are either completed or no project is selected.
              </p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const project = projects.find(p => p.id === task.projectId)
              const estimate = estimates[task.id] || 0

              return (
                <div
                  key={task.id}
                  className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6 border-l-4"
                  style={{ borderLeftColor: task.color || '#6366f1' }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Task Info */}
                    <div className="md:col-span-5">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: task.color || '#6366f1' }}
                        />
                        <h3 className="font-semibold text-navy-800 dark:text-navy-100">
                          {task.title}
                        </h3>
                      </div>
                      <p className="text-sm text-navy-600 dark:text-navy-400 mb-2">
                        {project?.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`px-2 py-1 rounded ${
                          task.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {task.status}
                        </span>
                        <span className="text-navy-600 dark:text-navy-400">
                          Progress: {task.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Remaining Estimate Input */}
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                        Remaining (days)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuickAdjust(task.id, -0.5)}
                          className="px-2 py-1 bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 rounded hover:bg-navy-200 dark:hover:bg-navy-600 transition-colors"
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
                          className="flex-1 px-3 py-2 border border-navy-300 dark:border-navy-600 rounded-md bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 focus:outline-none focus:ring-2 focus:ring-salmon-500 text-center font-semibold"
                        />
                        <button
                          onClick={() => handleQuickAdjust(task.id, 0.5)}
                          className="px-2 py-1 bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 rounded hover:bg-navy-200 dark:hover:bg-navy-600 transition-colors"
                          title="Increase by 0.5 days"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                        Notes (optional)
                      </label>
                      <input
                        type="text"
                        value={notes[task.id] || ''}
                        onChange={(e) => handleNotesChange(task.id, e.target.value)}
                        placeholder="Blockers, progress notes..."
                        className="w-full px-3 py-2 border border-navy-300 dark:border-navy-600 rounded-md bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 placeholder-navy-400 dark:placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-salmon-500"
                      />
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
      </div>
    </div>
  )
}

export default ProgressPage
