import { format } from 'date-fns'
import type { VelocityMetrics } from '../types/entities.types'

interface VelocityMetricsPanelProps {
  metrics: VelocityMetrics
  currentRemainingWork: number
  variant?: 'compact' | 'detailed'
}

const VelocityMetricsPanel = ({ metrics, currentRemainingWork, variant = 'detailed' }: VelocityMetricsPanelProps) => {
  const getTrendIcon = () => {
    switch (metrics.velocityTrend) {
      case 'improving':
        return '📈'
      case 'declining':
        return '📉'
      case 'stable':
      default:
        return '➡️'
    }
  }

  const getConfidenceBadge = () => {
    const colors = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[metrics.confidenceLevel]}`}>
        {metrics.confidenceLevel.toUpperCase()} Confidence
      </span>
    )
  }

  const getDaysAheadBehind = () => {
    const daysDiff = Math.round(
      (metrics.completionDateOptimistic.getTime() - metrics.completionDateRealistic.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysDiff === 0) {
      return { text: 'On Schedule', color: 'text-green-600 dark:text-green-400', icon: '✓' }
    } else if (daysDiff > 0) {
      return {
        text: `${Math.abs(daysDiff)} days ahead`,
        color: 'text-green-600 dark:text-green-400',
        icon: '⚡',
      }
    } else {
      return {
        text: `${Math.abs(daysDiff)} days behind`,
        color: 'text-red-600 dark:text-red-400',
        icon: '⚠️',
      }
    }
  }

  const velocityPercentage = metrics.plannedVelocity > 0
    ? (metrics.averageVelocity / metrics.plannedVelocity) * 100
    : 0

  const scheduleStatus = getDaysAheadBehind()

  if (variant === 'compact') {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-lg p-4 border border-navy-200 dark:border-navy-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">
              Projected Completion
            </div>
            <div className="text-lg font-bold text-navy-900 dark:text-navy-100">
              {format(metrics.completionDateRealistic, 'MMM dd, yyyy')}
            </div>
          </div>
          <div className={`text-sm font-semibold ${scheduleStatus.color}`}>
            {scheduleStatus.icon} {scheduleStatus.text}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-navy-900 dark:text-navy-100">
          Velocity & Projections
        </h3>
        {getConfidenceBadge()}
      </div>

      {/* Velocity Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Velocity */}
        <div className="bg-navy-50 dark:bg-navy-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-navy-600 dark:text-navy-400">
              Current Velocity
            </span>
            <span className="text-xs text-navy-500 dark:text-navy-500">
              {getTrendIcon()} {metrics.velocityTrend}
            </span>
          </div>
          <div className="text-2xl font-bold text-navy-900 dark:text-navy-100">
            {metrics.averageVelocity.toFixed(2)}
            <span className="text-sm font-normal text-navy-600 dark:text-navy-400 ml-1">
              p-d/day
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-navy-200 dark:bg-navy-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  velocityPercentage >= 100
                    ? 'bg-green-600'
                    : velocityPercentage >= 80
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
                }`}
                style={{ width: `${Math.min(100, velocityPercentage)}%` }}
              />
            </div>
            <div className="text-xs text-navy-600 dark:text-navy-400 mt-1">
              {velocityPercentage.toFixed(0)}% of planned velocity
            </div>
          </div>
        </div>

        {/* Planned Velocity */}
        <div className="bg-navy-50 dark:bg-navy-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-navy-600 dark:text-navy-400">
              Planned Velocity
            </span>
          </div>
          <div className="text-2xl font-bold text-navy-900 dark:text-navy-100">
            {metrics.plannedVelocity.toFixed(2)}
            <span className="text-sm font-normal text-navy-600 dark:text-navy-400 ml-1">
              p-d/day
            </span>
          </div>
          <div className="mt-2 text-xs text-navy-600 dark:text-navy-400">
            Based on team capacity and focus factors
          </div>
        </div>
      </div>

      {/* Completion Dates */}
      <div className="border-t border-navy-200 dark:border-navy-700 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Optimistic Date */}
          <div>
            <div className="text-sm font-medium text-navy-600 dark:text-navy-400 mb-2">
              Optimistic Completion
            </div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                {format(metrics.completionDateOptimistic, 'MMM dd, yyyy')}
              </div>
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-xs text-navy-500 dark:text-navy-500 mt-1">
              If team maintains planned velocity
            </div>
          </div>

          {/* Realistic Date */}
          <div>
            <div className="text-sm font-medium text-navy-600 dark:text-navy-400 mb-2">
              Realistic Completion
            </div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold text-salmon-600 dark:text-salmon-400">
                {format(metrics.completionDateRealistic, 'MMM dd, yyyy')}
              </div>
              <svg className="w-5 h-5 text-salmon-600 dark:text-salmon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-xs text-navy-500 dark:text-navy-500 mt-1">
              Based on current actual velocity
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Status */}
      <div className="bg-salmon-50 dark:bg-salmon-900/20 rounded-lg p-4 border border-salmon-200 dark:border-salmon-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`text-3xl ${scheduleStatus.color}`}>
              {scheduleStatus.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-navy-700 dark:text-navy-300">
                Schedule Status
              </div>
              <div className={`text-lg font-bold ${scheduleStatus.color}`}>
                {scheduleStatus.text}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-navy-600 dark:text-navy-400">
              Remaining Work
            </div>
            <div className="text-xl font-bold text-navy-900 dark:text-navy-100">
              {currentRemainingWork.toFixed(1)}
              <span className="text-sm font-normal text-navy-600 dark:text-navy-400 ml-1">
                p-days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality Info */}
      <div className="flex items-center gap-2 text-xs text-navy-500 dark:text-navy-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Analysis based on {metrics.daysAnalyzed} progress snapshot{metrics.daysAnalyzed !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

export default VelocityMetricsPanel
