import { useState, useMemo } from 'react'
import type { TaskEstimateComparison } from '../utils/estimateComparison'
import { getResourceIconEmoji } from '../utils/resourceIconEmojis'

interface TaskEstimateComparisonTableProps {
  comparisons: TaskEstimateComparison[]
  onExport?: () => void
}

type SortColumn = 'task' | 'project' | 'original' | 'remaining' | 'completed' | 'progress' | 'variance' | 'status'
type SortDirection = 'asc' | 'desc'

const TaskEstimateComparisonTable = ({ comparisons, onExport }: TaskEstimateComparisonTableProps) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('variance')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterStatus, setFilterStatus] = useState<'all' | 'on-track' | 'scope-creep' | 'major-issues'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 text-navy-400 dark:text-navy-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-salmon-600 dark:text-salmon-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-salmon-600 dark:text-salmon-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  const filteredAndSortedComparisons = useMemo(() => {
    let filtered = comparisons

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus)
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(c =>
        c.taskTitle.toLowerCase().includes(search) ||
        c.projectTitle.toLowerCase().includes(search)
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortColumn) {
        case 'task':
          aValue = a.taskTitle
          bValue = b.taskTitle
          break
        case 'project':
          aValue = a.projectTitle
          bValue = b.projectTitle
          break
        case 'original':
          aValue = a.originalEstimate
          bValue = b.originalEstimate
          break
        case 'remaining':
          aValue = a.currentRemaining
          bValue = b.currentRemaining
          break
        case 'completed':
          aValue = a.workCompleted
          bValue = b.workCompleted
          break
        case 'progress':
          aValue = a.progressPercentage
          bValue = b.progressPercentage
          break
        case 'variance':
          aValue = Math.abs(a.variancePercentage)
          bValue = Math.abs(b.variancePercentage)
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        const numA = aValue as number
        const numB = bValue as number
        return sortDirection === 'asc' ? numA - numB : numB - numA
      }
    })

    return sorted
  }, [comparisons, filterStatus, searchTerm, sortColumn, sortDirection])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on-track':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <span className="mr-1">🟢</span> On Track
          </span>
        )
      case 'scope-creep':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            <span className="mr-1">🟡</span> Scope Creep
          </span>
        )
      case 'major-issues':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            <span className="mr-1">🔴</span> Major Issues
          </span>
        )
      default:
        return null
    }
  }

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'Done':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Done</span>
      case 'In Progress':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">In Progress</span>
      case 'Todo':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Todo</span>
      default:
        return null
    }
  }

  const getVarianceColor = (variancePercentage: number) => {
    if (Math.abs(variancePercentage) <= 10) {
      return 'text-green-600 dark:text-green-400'
    } else if (variancePercentage > 0 && variancePercentage <= 25) {
      return 'text-yellow-600 dark:text-yellow-400'
    } else {
      return 'text-red-600 dark:text-red-400'
    }
  }

  // Calculate totals from filtered comparisons
  const totals = useMemo(() => {
    const totalOriginal = filteredAndSortedComparisons.reduce((sum, c) => sum + c.originalEstimate, 0)
    const totalRemaining = filteredAndSortedComparisons.reduce((sum, c) => sum + c.currentRemaining, 0)
    const totalCompleted = filteredAndSortedComparisons.reduce((sum, c) => sum + c.workCompleted, 0)
    const totalVariance = filteredAndSortedComparisons.reduce((sum, c) => sum + c.variance, 0)
    const avgProgress = filteredAndSortedComparisons.length > 0
      ? filteredAndSortedComparisons.reduce((sum, c) => sum + c.progressPercentage, 0) / filteredAndSortedComparisons.length
      : 0
    const totalVariancePercentage = totalOriginal > 0 ? (totalVariance / totalOriginal) * 100 : 0

    return {
      totalOriginal,
      totalRemaining,
      totalCompleted,
      totalVariance,
      avgProgress,
      totalVariancePercentage,
    }
  }, [filteredAndSortedComparisons])

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks or projects..."
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
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-salmon-600 text-white'
                : 'bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 hover:bg-navy-200 dark:hover:bg-navy-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('on-track')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'on-track'
                ? 'bg-green-600 text-white'
                : 'bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 hover:bg-navy-200 dark:hover:bg-navy-600'
            }`}
          >
            🟢 On Track
          </button>
          <button
            onClick={() => setFilterStatus('scope-creep')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'scope-creep'
                ? 'bg-yellow-600 text-white'
                : 'bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 hover:bg-navy-200 dark:hover:bg-navy-600'
            }`}
          >
            🟡 Scope Creep
          </button>
          <button
            onClick={() => setFilterStatus('major-issues')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'major-issues'
                ? 'bg-red-600 text-white'
                : 'bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 hover:bg-navy-200 dark:hover:bg-navy-600'
            }`}
          >
            🔴 Major Issues
          </button>
        </div>

        {/* Export Button */}
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-salmon-600 hover:bg-salmon-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-navy-600 dark:text-navy-400">
        Showing {filteredAndSortedComparisons.length} of {comparisons.length} tasks
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-navy-200 dark:border-navy-700">
        <table className="min-w-full divide-y divide-navy-200 dark:divide-navy-700">
          <thead className="bg-navy-50 dark:bg-navy-800">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-navy-700 dark:text-navy-300 uppercase tracking-wider cursor-pointer hover:bg-navy-100 dark:hover:bg-navy-700"
                onClick={() => handleSort('project')}
              >
                <div className="flex items-center gap-2">
                  Project {getSortIcon('project')}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-navy-700 dark:text-navy-300 uppercase tracking-wider cursor-pointer hover:bg-navy-100 dark:hover:bg-navy-700"
                onClick={() => handleSort('task')}
              >
                <div className="flex items-center gap-2">
                  Task {getSortIcon('task')}
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-navy-700 dark:text-navy-300 uppercase tracking-wider">
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-navy-700 dark:text-navy-300 uppercase tracking-wider cursor-pointer hover:bg-navy-100 dark:hover:bg-navy-700"
                onClick={() => handleSort('original')}
              >
                <div className="flex items-center justify-end gap-2">
                  Original {getSortIcon('original')}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-navy-700 dark:text-navy-300 uppercase tracking-wider cursor-pointer hover:bg-navy-100 dark:hover:bg-navy-700"
                onClick={() => handleSort('remaining')}
              >
                <div className="flex items-center justify-end gap-2">
                  Remaining {getSortIcon('remaining')}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-navy-700 dark:text-navy-300 uppercase tracking-wider cursor-pointer hover:bg-navy-100 dark:hover:bg-navy-700"
                onClick={() => handleSort('completed')}
              >
                <div className="flex items-center justify-end gap-2">
                  Completed {getSortIcon('completed')}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-navy-700 dark:text-navy-300 uppercase tracking-wider cursor-pointer hover:bg-navy-100 dark:hover:bg-navy-700"
                onClick={() => handleSort('progress')}
              >
                <div className="flex items-center justify-end gap-2">
                  Progress {getSortIcon('progress')}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-navy-700 dark:text-navy-300 uppercase tracking-wider cursor-pointer hover:bg-navy-100 dark:hover:bg-navy-700"
                onClick={() => handleSort('variance')}
              >
                <div className="flex items-center justify-end gap-2">
                  Variance {getSortIcon('variance')}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-medium text-navy-700 dark:text-navy-300 uppercase tracking-wider cursor-pointer hover:bg-navy-100 dark:hover:bg-navy-700"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center justify-center gap-2">
                  Health {getSortIcon('status')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-navy-900 divide-y divide-navy-200 dark:divide-navy-700">
            {filteredAndSortedComparisons.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-navy-500 dark:text-navy-400">
                  {searchTerm || filterStatus !== 'all' ? 'No tasks match your filters' : 'No tasks found'}
                </td>
              </tr>
            ) : (
              <>
                {filteredAndSortedComparisons.map((comparison) => (
                  <tr key={comparison.taskId} className="hover:bg-navy-50 dark:hover:bg-navy-800 transition-colors">
                    <td className="px-4 py-3 text-sm text-navy-900 dark:text-navy-100">
                      {comparison.projectTitle}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: comparison.taskColor }}
                        />
                        <div>
                          <div className="text-sm font-medium text-navy-900 dark:text-navy-100">
                            {comparison.taskTitle}
                          </div>
                          {comparison.resources.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {comparison.resources.map((resource, idx) => (
                                <span key={idx} className="text-xs text-navy-500 dark:text-navy-400">
                                  {getResourceIconEmoji(resource.icon)} {resource.numberOfProfiles}x
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getTaskStatusBadge(comparison.taskStatus)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-navy-900 dark:text-navy-100 font-medium">
                      {comparison.originalEstimate.toFixed(1)}d
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-navy-900 dark:text-navy-100 font-medium">
                      {comparison.currentRemaining.toFixed(1)}d
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-navy-900 dark:text-navy-100">
                      {comparison.workCompleted.toFixed(1)}d
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 bg-navy-200 dark:bg-navy-700 rounded-full h-2">
                          <div
                            className="bg-salmon-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, comparison.progressPercentage)}%` }}
                          />
                        </div>
                        <span className="text-navy-900 dark:text-navy-100 font-medium">
                          {comparison.progressPercentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${getVarianceColor(comparison.variancePercentage)}`}>
                      <div>
                        {comparison.variance >= 0 ? '+' : ''}{comparison.variance.toFixed(1)}d
                      </div>
                      <div className="text-xs">
                        ({comparison.variancePercentage >= 0 ? '+' : ''}{comparison.variancePercentage.toFixed(1)}%)
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(comparison.status)}
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                {filteredAndSortedComparisons.length > 0 && (
                  <tr className="bg-salmon-50 dark:bg-salmon-900/20 border-t-2 border-salmon-200 dark:border-salmon-800 font-bold">
                    <td className="px-4 py-3 text-sm text-navy-900 dark:text-navy-100">
                      TOTALS
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600 dark:text-navy-400">
                      {filteredAndSortedComparisons.length} tasks
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-sm text-right text-navy-900 dark:text-navy-100">
                      {totals.totalOriginal.toFixed(1)}d
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-navy-900 dark:text-navy-100">
                      {totals.totalRemaining.toFixed(1)}d
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-navy-900 dark:text-navy-100">
                      {totals.totalCompleted.toFixed(1)}d
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 bg-navy-200 dark:bg-navy-700 rounded-full h-2">
                          <div
                            className="bg-salmon-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, totals.avgProgress)}%` }}
                          />
                        </div>
                        <span className="text-navy-900 dark:text-navy-100">
                          {totals.avgProgress.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right ${getVarianceColor(totals.totalVariancePercentage)}`}>
                      <div>
                        {totals.totalVariance >= 0 ? '+' : ''}{totals.totalVariance.toFixed(1)}d
                      </div>
                      <div className="text-xs">
                        ({totals.totalVariancePercentage >= 0 ? '+' : ''}{totals.totalVariancePercentage.toFixed(1)}%)
                      </div>
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TaskEstimateComparisonTable
