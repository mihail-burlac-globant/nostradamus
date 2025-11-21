import { useMemo } from 'react'
import type { Task, ProgressSnapshot } from '../types/entities.types'
import { format } from 'date-fns'

interface ScopeChange {
  taskId: string
  taskTitle: string
  taskColor: string
  date: string
  scopeChange: number
  newRemaining: number
  changePercentage: number
}

interface BurndownMetricsPanelProps {
  tasks: Task[]
  progressSnapshots: ProgressSnapshot[]
  projectId: string
}

const BurndownMetricsPanel = ({ tasks, progressSnapshots, projectId }: BurndownMetricsPanelProps) => {
  // Calculate scope changes
  const scopeMetrics = useMemo(() => {
    const taskScopeChanges: ScopeChange[] = []
    let totalScopeIncrease = 0
    let totalScopeDecrease = 0
    let estimateAdjustments = 0

    // Get snapshots for this project
    const projectSnapshots = progressSnapshots.filter(s => s.projectId === projectId)

    // Group snapshots by task
    const snapshotsByTask = new Map<string, ProgressSnapshot[]>()
    projectSnapshots.forEach(snapshot => {
      if (!snapshotsByTask.has(snapshot.taskId)) {
        snapshotsByTask.set(snapshot.taskId, [])
      }
      snapshotsByTask.get(snapshot.taskId)!.push(snapshot)
    })

    // Analyze scope changes for each task
    snapshotsByTask.forEach((snapshots, taskId) => {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return

      // Sort snapshots by date
      const sortedSnapshots = [...snapshots].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Compare consecutive snapshots to find scope changes
      for (let i = 1; i < sortedSnapshots.length; i++) {
        const prev = sortedSnapshots[i - 1]
        const current = sortedSnapshots[i]

        // Calculate theoretical remaining based on progress
        const theoreticalRemaining = prev.remainingEstimate * (1 - (current.progress - prev.progress) / 100)

        // Scope change is the difference between actual and theoretical
        const scopeChange = current.remainingEstimate - theoreticalRemaining

        // Only count significant changes (>0.5 days)
        if (Math.abs(scopeChange) > 0.5) {
          estimateAdjustments++

          if (scopeChange > 0) {
            totalScopeIncrease += scopeChange
          } else {
            totalScopeDecrease += Math.abs(scopeChange)
          }

          const changePercentage = prev.remainingEstimate > 0
            ? (scopeChange / prev.remainingEstimate) * 100
            : 0

          taskScopeChanges.push({
            taskId,
            taskTitle: task.title,
            taskColor: task.color,
            date: current.date,
            scopeChange,
            newRemaining: current.remainingEstimate,
            changePercentage,
          })
        }
      }
    })

    // Sort by absolute scope change (descending) to get biggest changes
    const topScopeChanges = [...taskScopeChanges]
      .sort((a, b) => Math.abs(b.scopeChange) - Math.abs(a.scopeChange))
      .slice(0, 5)

    return {
      totalScopeIncrease,
      totalScopeDecrease,
      netScopeChange: totalScopeIncrease - totalScopeDecrease,
      estimateAdjustments,
      topScopeChanges,
      allScopeChanges: taskScopeChanges,
    }
  }, [tasks, progressSnapshots, projectId])

  // Group scope changes by date for timeline
  const scopeChangesByDate = useMemo(() => {
    const byDate = new Map<string, number>()
    scopeMetrics.allScopeChanges.forEach(change => {
      const current = byDate.get(change.date) || 0
      byDate.set(change.date, current + change.scopeChange)
    })
    return Array.from(byDate.entries())
      .map(([date, change]) => ({ date, change }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10) // Last 10 days with changes
  }, [scopeMetrics.allScopeChanges])

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Scope Increase */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700 dark:text-red-300">Scope Increase</span>
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-red-900 dark:text-red-100">
            +{scopeMetrics.totalScopeIncrease.toFixed(1)}
            <span className="text-sm font-normal text-red-700 dark:text-red-300 ml-1">days</span>
          </div>
        </div>

        {/* Total Scope Decrease */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Scope Decrease</span>
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            -{scopeMetrics.totalScopeDecrease.toFixed(1)}
            <span className="text-sm font-normal text-green-700 dark:text-green-300 ml-1">days</span>
          </div>
        </div>

        {/* Net Scope Change */}
        <div className={`rounded-lg p-4 border ${
          scopeMetrics.netScopeChange > 0
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
            : scopeMetrics.netScopeChange < 0
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${
              scopeMetrics.netScopeChange > 0
                ? 'text-orange-700 dark:text-orange-300'
                : scopeMetrics.netScopeChange < 0
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}>Net Change</span>
            <svg className={`w-5 h-5 ${
              scopeMetrics.netScopeChange > 0
                ? 'text-orange-600 dark:text-orange-400'
                : scopeMetrics.netScopeChange < 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div className={`text-2xl font-bold ${
            scopeMetrics.netScopeChange > 0
              ? 'text-orange-900 dark:text-orange-100'
              : scopeMetrics.netScopeChange < 0
              ? 'text-blue-900 dark:text-blue-100'
              : 'text-gray-900 dark:text-gray-100'
          }`}>
            {scopeMetrics.netScopeChange >= 0 ? '+' : ''}{scopeMetrics.netScopeChange.toFixed(1)}
            <span className={`text-sm font-normal ml-1 ${
              scopeMetrics.netScopeChange > 0
                ? 'text-orange-700 dark:text-orange-300'
                : scopeMetrics.netScopeChange < 0
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}>days</span>
          </div>
        </div>

        {/* Estimate Adjustments */}
        <div className="bg-navy-50 dark:bg-navy-800 rounded-lg p-4 border border-navy-200 dark:border-navy-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-navy-700 dark:text-navy-300">Adjustments</span>
            <svg className="w-5 h-5 text-navy-600 dark:text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-navy-900 dark:text-navy-100">
            {scopeMetrics.estimateAdjustments}
            <span className="text-sm font-normal text-navy-700 dark:text-navy-300 ml-1">total</span>
          </div>
        </div>
      </div>

      {/* Top Scope Changes */}
      {scopeMetrics.topScopeChanges.length > 0 && (
        <div className="bg-white dark:bg-navy-800 rounded-lg p-6 border border-navy-200 dark:border-navy-700">
          <h3 className="text-lg font-semibold text-navy-900 dark:text-navy-100 mb-4">
            Biggest Scope Changes
          </h3>
          <div className="space-y-3">
            {scopeMetrics.topScopeChanges.map((change, idx) => (
              <div
                key={`${change.taskId}-${change.date}-${idx}`}
                className="flex items-center justify-between p-3 bg-navy-50 dark:bg-navy-900 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: change.taskColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-navy-900 dark:text-navy-100 truncate">
                      {change.taskTitle}
                    </div>
                    <div className="text-xs text-navy-600 dark:text-navy-400">
                      {format(new Date(change.date), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    change.scopeChange > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {change.scopeChange >= 0 ? '+' : ''}{change.scopeChange.toFixed(1)}d
                  </div>
                  <div className="text-xs text-navy-600 dark:text-navy-400">
                    {change.changePercentage >= 0 ? '+' : ''}{change.changePercentage.toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Scope Change Timeline */}
      {scopeChangesByDate.length > 0 && (
        <div className="bg-white dark:bg-navy-800 rounded-lg p-6 border border-navy-200 dark:border-navy-700">
          <h3 className="text-lg font-semibold text-navy-900 dark:text-navy-100 mb-4">
            Recent Scope Changes
          </h3>
          <div className="space-y-2">
            {scopeChangesByDate.map(({ date, change }) => (
              <div key={date} className="flex items-center justify-between py-2 border-b border-navy-100 dark:border-navy-700 last:border-0">
                <div className="text-sm text-navy-700 dark:text-navy-300">
                  {format(new Date(date), 'MMM dd, yyyy')}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-navy-200 dark:bg-navy-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        change > 0 ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.abs(change) * 10)}%`,
                        marginLeft: change > 0 ? '0' : 'auto'
                      }}
                    />
                  </div>
                  <div className={`text-sm font-semibold min-w-[60px] text-right ${
                    change > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}d
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data Message */}
      {scopeMetrics.estimateAdjustments === 0 && (
        <div className="bg-white dark:bg-navy-800 rounded-lg p-12 border border-navy-200 dark:border-navy-700 text-center">
          <svg className="mx-auto h-12 w-12 text-navy-400 dark:text-navy-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-navy-900 dark:text-navy-100 mb-2">
            No Scope Changes Detected
          </h3>
          <p className="text-sm text-navy-600 dark:text-navy-400">
            Update task estimates on the Progress page to track scope changes over time.
          </p>
        </div>
      )}
    </div>
  )
}

export default BurndownMetricsPanel
