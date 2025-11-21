import { useEffect, useMemo, useState } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import { calculateTaskEstimateComparison, calculateAggregateMetrics, exportComparisonToCSV } from '../utils/estimateComparison'
import TaskEstimateComparisonTable from '../components/TaskEstimateComparisonTable'

const EstimatesPage = () => {
  const {
    projects,
    tasks,
    isInitialized,
    initialize,
    loadProjects,
    loadTasks,
    getTaskResources,
    progressSnapshots,
    loadProgressSnapshots,
  } = useEntitiesStore()

  const activeProjects = projects.filter(p => p.status === 'Active')

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = localStorage.getItem('estimates_selectedProjectId')
    // Don't use 'all' - only use a valid project ID
    if (saved && saved !== 'all') {
      return saved
    }
    return '' // Empty string means no selection yet
  })

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    } else {
      loadProjects()
      loadTasks()
      loadProgressSnapshots()
    }
  }, [isInitialized, initialize, loadProjects, loadTasks, loadProgressSnapshots])

  // Auto-select first active project if none selected or saved project doesn't exist
  useEffect(() => {
    if (activeProjects.length > 0) {
      // If no project selected, or selected project is no longer active
      const isValidSelection = activeProjects.some(p => p.id === selectedProjectId)
      if (!selectedProjectId || !isValidSelection) {
        setSelectedProjectId(activeProjects[0].id)
      }
    }
  }, [activeProjects, selectedProjectId])

  // Persist selection to localStorage
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('estimates_selectedProjectId', selectedProjectId)
    }
  }, [selectedProjectId])

  // Calculate comparisons for all tasks
  const comparisons = useMemo(() => {
    // Only show tasks for the selected project
    const filteredTasks = tasks.filter(t => t.projectId === selectedProjectId)

    return filteredTasks.map(task => {
      const taskResources = getTaskResources(task.id)
      const project = projects.find(p => p.id === task.projectId)
      const projectTitle = project?.title || 'Unknown Project'

      return calculateTaskEstimateComparison(
        task,
        taskResources,
        progressSnapshots,
        projectTitle
      )
    })
  }, [tasks, selectedProjectId, projects, getTaskResources, progressSnapshots])

  // Calculate aggregate metrics
  const aggregateMetrics = useMemo(() => {
    return calculateAggregateMetrics(comparisons)
  }, [comparisons])

  const handleExport = () => {
    const csvContent = exportComparisonToCSV(comparisons)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `estimate-comparison-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-salmon-50 dark:from-gray-950 dark:to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-800 dark:text-navy-100 mb-2">
            Estimate Comparison
          </h1>
          <p className="text-navy-600 dark:text-navy-400">
            Compare original estimates with current reality and track scope changes
          </p>
        </div>

        {/* Project Selector */}
        <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-navy-700 dark:text-navy-300">
              Project:
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex-1 max-w-md px-4 py-2 border border-navy-300 dark:border-navy-600 rounded-md bg-white dark:bg-navy-700 text-navy-800 dark:text-navy-100 focus:outline-none focus:ring-2 focus:ring-salmon-500"
            >
              {activeProjects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Aggregate Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Tasks */}
          <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy-600 dark:text-navy-400">Total Tasks</p>
                <p className="text-2xl font-bold text-navy-900 dark:text-navy-100 mt-1">
                  {aggregateMetrics.totalTasks}
                </p>
              </div>
              <div className="w-12 h-12 bg-navy-100 dark:bg-navy-700 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-navy-600 dark:text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Variance */}
          <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy-600 dark:text-navy-400">Total Variance</p>
                <p className={`text-2xl font-bold mt-1 ${
                  Math.abs(aggregateMetrics.totalVariancePercentage) <= 10
                    ? 'text-green-600 dark:text-green-400'
                    : aggregateMetrics.totalVariancePercentage > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {aggregateMetrics.totalVariance >= 0 ? '+' : ''}
                  {aggregateMetrics.totalVariance.toFixed(1)}d
                </p>
                <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
                  {aggregateMetrics.totalVariancePercentage >= 0 ? '+' : ''}
                  {aggregateMetrics.totalVariancePercentage.toFixed(1)}%
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                Math.abs(aggregateMetrics.totalVariancePercentage) <= 10
                  ? 'bg-green-100 dark:bg-green-900/20'
                  : aggregateMetrics.totalVariancePercentage > 0
                  ? 'bg-red-100 dark:bg-red-900/20'
                  : 'bg-green-100 dark:bg-green-900/20'
              }`}>
                <svg className={`w-6 h-6 ${
                  Math.abs(aggregateMetrics.totalVariancePercentage) <= 10
                    ? 'text-green-600 dark:text-green-400'
                    : aggregateMetrics.totalVariancePercentage > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Average Progress */}
          <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy-600 dark:text-navy-400">Avg Progress</p>
                <p className="text-2xl font-bold text-navy-900 dark:text-navy-100 mt-1">
                  {aggregateMetrics.avgProgressPercentage.toFixed(0)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-salmon-100 dark:bg-salmon-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-salmon-600 dark:text-salmon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Health Status Breakdown */}
          <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
            <div>
              <p className="text-sm font-medium text-navy-600 dark:text-navy-400 mb-3">Health Status</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy-700 dark:text-navy-300">🟢 On Track</span>
                  <span className="font-semibold text-navy-900 dark:text-navy-100">
                    {aggregateMetrics.onTrackCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy-700 dark:text-navy-300">🟡 Scope Creep</span>
                  <span className="font-semibold text-navy-900 dark:text-navy-100">
                    {aggregateMetrics.scopeCreepCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy-700 dark:text-navy-300">🔴 Major Issues</span>
                  <span className="font-semibold text-navy-900 dark:text-navy-100">
                    {aggregateMetrics.majorIssuesCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-navy-800 dark:text-navy-100">
              Task Estimates
            </h2>
            <p className="text-sm text-navy-600 dark:text-navy-400 mt-1">
              Original estimates vs. current remaining work
            </p>
          </div>

          {comparisons.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-navy-400 dark:text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-navy-900 dark:text-navy-100">No tasks found</h3>
              <p className="mt-1 text-sm text-navy-500 dark:text-navy-400">
                {selectedProjectId === 'all'
                  ? 'Create tasks in your projects to see estimate comparisons.'
                  : 'This project has no tasks yet. Add tasks to see estimate comparisons.'}
              </p>
            </div>
          ) : (
            <TaskEstimateComparisonTable
              comparisons={comparisons}
              onExport={handleExport}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default EstimatesPage
