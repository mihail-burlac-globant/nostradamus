import type { Task, TaskResource, ProgressSnapshot } from '../types/entities.types'

export interface TaskEstimateComparison {
  taskId: string
  taskTitle: string
  taskColor: string
  taskStatus: string
  projectId: string
  projectTitle: string
  originalEstimate: number // Sum of TaskResource.estimatedDays
  currentRemaining: number // Latest ProgressSnapshot.remainingEstimate or calculated
  workCompleted: number // originalEstimate - currentRemaining
  progressPercentage: number // (workCompleted / originalEstimate) * 100
  variance: number // currentRemaining - (originalEstimate * (1 - progress/100))
  variancePercentage: number // (variance / originalEstimate) * 100
  status: 'on-track' | 'scope-creep' | 'major-issues'
  lastUpdated?: string // Date of last progress snapshot
  hasSnapshot: boolean
  resources: Array<{
    id: string
    title: string
    icon: string
    estimatedDays: number
    numberOfProfiles: number
    focusFactor: number
  }>
}

/**
 * Calculate estimate comparison metrics for a task
 */
export const calculateTaskEstimateComparison = (
  task: Task,
  taskResources: TaskResource[],
  progressSnapshots: ProgressSnapshot[],
  projectTitle: string
): TaskEstimateComparison => {
  // Calculate original estimate (sum of all resource estimated days)
  const originalEstimate = taskResources.reduce((sum, resource) => {
    return sum + resource.estimatedDays
  }, 0)

  // Get latest progress snapshot for this task
  const taskSnapshots = progressSnapshots
    .filter(s => s.taskId === task.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const latestSnapshot = taskSnapshots[0]

  // Determine current remaining
  let currentRemaining: number
  let hasSnapshot = false
  let lastUpdated: string | undefined

  if (latestSnapshot) {
    currentRemaining = latestSnapshot.remainingEstimate
    hasSnapshot = true
    lastUpdated = latestSnapshot.date
  } else {
    // No snapshot - calculate from progress
    currentRemaining = originalEstimate * (1 - task.progress / 100)
  }

  // Calculate work completed
  const workCompleted = Math.max(0, originalEstimate - currentRemaining)

  // Calculate progress percentage
  const progressPercentage = originalEstimate > 0
    ? Math.min(100, (workCompleted / originalEstimate) * 100)
    : 0

  // Calculate theoretical remaining based on progress
  const theoreticalRemaining = originalEstimate * (1 - task.progress / 100)

  // Variance: difference between actual remaining and theoretical remaining
  // Positive variance = scope creep (more work than expected)
  // Negative variance = efficient (less work than expected)
  const variance = currentRemaining - theoreticalRemaining

  // Variance as percentage of original estimate
  const variancePercentage = originalEstimate > 0
    ? (variance / originalEstimate) * 100
    : 0

  // Determine status
  let status: 'on-track' | 'scope-creep' | 'major-issues'
  if (Math.abs(variancePercentage) <= 10) {
    status = 'on-track'
  } else if (variancePercentage > 10 && variancePercentage <= 25) {
    status = 'scope-creep'
  } else {
    status = 'major-issues'
  }

  return {
    taskId: task.id,
    taskTitle: task.title,
    taskColor: task.color,
    taskStatus: task.status,
    projectId: task.projectId,
    projectTitle,
    originalEstimate,
    currentRemaining,
    workCompleted,
    progressPercentage,
    variance,
    variancePercentage,
    status,
    lastUpdated,
    hasSnapshot,
    resources: taskResources.map(r => ({
      id: r.resourceId,
      title: r.title || '',
      icon: r.icon || 'generic',
      estimatedDays: r.estimatedDays,
      numberOfProfiles: r.numberOfProfiles,
      focusFactor: r.focusFactor,
    })),
  }
}

/**
 * Calculate aggregate metrics for all tasks
 */
export const calculateAggregateMetrics = (comparisons: TaskEstimateComparison[]) => {
  const totalOriginalEstimate = comparisons.reduce((sum, c) => sum + c.originalEstimate, 0)
  const totalCurrentRemaining = comparisons.reduce((sum, c) => sum + c.currentRemaining, 0)
  const totalWorkCompleted = comparisons.reduce((sum, c) => sum + c.workCompleted, 0)
  const totalVariance = comparisons.reduce((sum, c) => sum + c.variance, 0)

  const onTrack = comparisons.filter(c => c.status === 'on-track').length
  const scopeCreep = comparisons.filter(c => c.status === 'scope-creep').length
  const majorIssues = comparisons.filter(c => c.status === 'major-issues').length

  const avgProgressPercentage = comparisons.length > 0
    ? comparisons.reduce((sum, c) => sum + c.progressPercentage, 0) / comparisons.length
    : 0

  return {
    totalTasks: comparisons.length,
    totalOriginalEstimate,
    totalCurrentRemaining,
    totalWorkCompleted,
    totalVariance,
    totalVariancePercentage: totalOriginalEstimate > 0
      ? (totalVariance / totalOriginalEstimate) * 100
      : 0,
    avgProgressPercentage,
    onTrackCount: onTrack,
    scopeCreepCount: scopeCreep,
    majorIssuesCount: majorIssues,
  }
}

/**
 * Export comparison data to CSV format
 */
export const exportComparisonToCSV = (comparisons: TaskEstimateComparison[]): string => {
  const headers = [
    'Project',
    'Task',
    'Status',
    'Original Estimate (days)',
    'Current Remaining (days)',
    'Work Completed (days)',
    'Progress (%)',
    'Variance (days)',
    'Variance (%)',
    'Health Status',
    'Last Updated',
    'Has Snapshot',
  ]

  const rows = comparisons.map(c => [
    c.projectTitle,
    c.taskTitle,
    c.taskStatus,
    c.originalEstimate.toFixed(2),
    c.currentRemaining.toFixed(2),
    c.workCompleted.toFixed(2),
    c.progressPercentage.toFixed(1),
    c.variance.toFixed(2),
    c.variancePercentage.toFixed(1),
    c.status,
    c.lastUpdated || 'Never',
    c.hasSnapshot ? 'Yes' : 'No',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}
