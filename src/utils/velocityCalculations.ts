import { format, differenceInDays, addDays, startOfDay } from 'date-fns'
import type { ProgressSnapshot, VelocityMetrics } from '../types/entities.types'

/**
 * Calculate actual velocity based on progress snapshots
 * Uses weighted average favoring recent data
 */
export const calculateActualVelocity = (
  snapshots: ProgressSnapshot[]
): { velocity: number; confidence: 'high' | 'medium' | 'low' } => {
  if (snapshots.length < 2) {
    return { velocity: 0, confidence: 'low' }
  }

  // Sort snapshots by date (oldest first)
  const sortedSnapshots = [...snapshots].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Calculate work done between consecutive snapshots
  const workDonePerDay: { date: string; workDone: number }[] = []

  for (let i = 1; i < sortedSnapshots.length; i++) {
    const prev = sortedSnapshots[i - 1]
    const curr = sortedSnapshots[i]

    const workDone = prev.remainingEstimate - curr.remainingEstimate
    const daysBetween = differenceInDays(new Date(curr.date), new Date(prev.date))

    if (daysBetween > 0 && workDone > 0) {
      // Distribute work evenly across days
      const dailyWork = workDone / daysBetween
      workDonePerDay.push({ date: curr.date, workDone: dailyWork })
    }
  }

  if (workDonePerDay.length === 0) {
    return { velocity: 0, confidence: 'low' }
  }

  // Use weighted average (more recent = higher weight)
  const weights = workDonePerDay.map((_, index) => index + 1)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  const weightedVelocity = workDonePerDay.reduce((sum, item, index) => {
    return sum + (item.workDone * weights[index])
  }, 0) / totalWeight

  // Determine confidence based on data points
  const confidence: 'high' | 'medium' | 'low' =
    workDonePerDay.length >= 10 ? 'high' :
    workDonePerDay.length >= 5 ? 'medium' : 'low'

  return { velocity: weightedVelocity, confidence }
}

/**
 * Calculate actual velocity from the past N days of snapshots
 * More accurate for recent performance tracking
 */
export const calculateRecentVelocity = (
  snapshots: ProgressSnapshot[],
  days: number = 15
): { velocity: number; confidence: 'high' | 'medium' | 'low' } => {
  if (snapshots.length < 2) {
    return { velocity: 0, confidence: 'low' }
  }

  const today = startOfDay(new Date())
  const cutoffDate = addDays(today, -days)

  // Filter snapshots from the past N days
  const recentSnapshots = snapshots.filter(s =>
    new Date(s.date) >= cutoffDate
  )

  if (recentSnapshots.length < 2) {
    // Fall back to all available data if not enough recent data
    return calculateActualVelocity(snapshots)
  }

  // Use the filtered snapshots to calculate velocity
  return calculateActualVelocity(recentSnapshots)
}

/**
 * Calculate planned velocity based on resource allocation
 */
export const calculatePlannedVelocity = (
  resources: Array<{ numberOfResources: number; focusFactor: number }>
): number => {
  return resources.reduce((total, resource) => {
    return total + (resource.numberOfResources * (resource.focusFactor / 100))
  }, 0)
}

/**
 * Determine velocity trend based on recent snapshots
 */
export const calculateVelocityTrend = (
  snapshots: ProgressSnapshot[]
): 'improving' | 'stable' | 'declining' => {
  if (snapshots.length < 4) {
    return 'stable'
  }

  const sortedSnapshots = [...snapshots].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Calculate velocity for first half vs second half
  const midpoint = Math.floor(sortedSnapshots.length / 2)
  const firstHalf = sortedSnapshots.slice(0, midpoint)
  const secondHalf = sortedSnapshots.slice(midpoint)

  const firstVelocity = calculateActualVelocity(firstHalf).velocity
  const secondVelocity = calculateActualVelocity(secondHalf).velocity

  const percentChange = ((secondVelocity - firstVelocity) / firstVelocity) * 100

  if (percentChange > 10) return 'improving'
  if (percentChange < -10) return 'declining'
  return 'stable'
}

/**
 * Project completion date based on velocity
 */
export const projectCompletionDate = (
  remainingWork: number,
  velocity: number
): Date | null => {
  if (velocity <= 0) return null

  const daysRemaining = Math.ceil(remainingWork / velocity)
  return addDays(startOfDay(new Date()), daysRemaining)
}

/**
 * Calculate comprehensive velocity metrics for a project
 */
export const calculateVelocityMetrics = (
  snapshots: ProgressSnapshot[],
  currentRemainingWork: number,
  plannedVelocity: number
): VelocityMetrics => {
  const { velocity: actualVelocity, confidence } = calculateActualVelocity(snapshots)
  const trend = calculateVelocityTrend(snapshots)

  const completionDateOptimistic = projectCompletionDate(currentRemainingWork, plannedVelocity)
  const completionDateRealistic = projectCompletionDate(currentRemainingWork, actualVelocity)

  return {
    averageVelocity: actualVelocity,
    plannedVelocity,
    velocityTrend: trend,
    completionDateOptimistic: completionDateOptimistic || new Date(),
    completionDateRealistic: completionDateRealistic || new Date(),
    daysAnalyzed: snapshots.length,
    confidenceLevel: confidence,
  }
}

/**
 * Generate projected burndown data based on actual velocity
 */
export const generateActualProjection = (
  todayIndex: number,
  currentRemaining: number,
  actualVelocity: number,
  maxDays: number
): number[] => {
  const projection: number[] = []
  let remaining = currentRemaining

  for (let i = todayIndex; i < maxDays; i++) {
    projection.push(Math.max(0, remaining))
    remaining -= actualVelocity

    if (remaining <= 0) {
      projection.push(0)
      break
    }
  }

  return projection
}

/**
 * Get historical actual remaining estimates from snapshots
 */
export const getHistoricalData = (
  snapshots: ProgressSnapshot[],
  startDate: Date,
  endDate: Date
): Map<string, number> => {
  const historicalMap = new Map<string, number>()

  snapshots
    .filter(snapshot => {
      const snapshotDate = new Date(snapshot.date)
      return snapshotDate >= startDate && snapshotDate <= endDate
    })
    .forEach(snapshot => {
      const dateKey = format(new Date(snapshot.date), 'yyyy-MM-dd')

      // If multiple snapshots on same day, use the latest (most recent update)
      if (!historicalMap.has(dateKey) ||
          snapshot.createdAt > (snapshots.find(s => format(new Date(s.date), 'yyyy-MM-dd') === dateKey)?.createdAt || '')) {
        historicalMap.set(dateKey, snapshot.remainingEstimate)
      }
    })

  return historicalMap
}
