import { useMemo } from 'react'
import { useProjectStore } from '../stores/projectStore'
import { BurndownDataPoint, BurndownByProfileDataPoint } from '../types/project.types'
import { eachDayOfInterval, differenceInDays } from 'date-fns'

export const useBurndownData = (): BurndownDataPoint[] => {
  const { projectData } = useProjectStore()

  return useMemo(() => {
    if (!projectData) return []

    const { startDate, endDate, tasks } = projectData
    const totalDays = differenceInDays(endDate, startDate)

    if (totalDays <= 0) return []

    // Calculate total hours estimate from all tasks
    const totalHoursEstimate = tasks.reduce((sum, task) => {
      const remaining = task.remaining_estimate_hours || 0
      return sum + remaining
    }, 0)

    if (totalHoursEstimate === 0) {
      // Fallback to percentage-based if no hours data
      return []
    }

    // Generate all dates in the project range
    const dates = eachDayOfInterval({ start: startDate, end: endDate })

    const burndownData: BurndownDataPoint[] = dates.map((date, index) => {
      // Calculate ideal work remaining (linear burndown in hours)
      const daysElapsed = index
      const idealHoursProgress = (daysElapsed / totalDays) * totalHoursEstimate
      const idealHoursRemaining = Math.max(0, totalHoursEstimate - idealHoursProgress)

      // Calculate actual work remaining based on remaining_estimate_hours
      let actualHoursRemaining = 0

      tasks.forEach((task) => {
        if (task.startDate <= date) {
          // Task has started by this date
          if (task.endDate <= date) {
            // Task should be completed by this date - no hours remaining
            actualHoursRemaining += 0
          } else {
            // Task is in progress - count remaining hours
            actualHoursRemaining += task.remaining_estimate_hours || 0
          }
        } else {
          // Task hasn't started yet - count full remaining hours
          actualHoursRemaining += task.remaining_estimate_hours || 0
        }
      })

      // Convert to percentages for consistent chart display
      const idealWorkPercent = totalHoursEstimate > 0
        ? (idealHoursRemaining / totalHoursEstimate) * 100
        : 0
      const remainingWorkPercent = totalHoursEstimate > 0
        ? (actualHoursRemaining / totalHoursEstimate) * 100
        : 0
      const actualWorkPercent = 100 - remainingWorkPercent

      return {
        date,
        idealWork: idealWorkPercent,
        actualWork: actualWorkPercent,
        remainingWork: remainingWorkPercent,
      }
    })

    return burndownData
  }, [projectData])
}

export const useBurndownByProfileData = (): BurndownByProfileDataPoint[] => {
  const { projectData } = useProjectStore()

  return useMemo(() => {
    if (!projectData) return []

    const { startDate, endDate, tasks } = projectData
    const totalDays = differenceInDays(endDate, startDate)

    if (totalDays <= 0) return []

    // Generate all dates in the project range
    const dates = eachDayOfInterval({ start: startDate, end: endDate })

    const burndownData: BurndownByProfileDataPoint[] = dates.map((date) => {
      const profileBreakdown: Record<string, number> = {}
      let total = 0

      tasks.forEach((task) => {
        let hoursRemaining = 0

        if (task.startDate <= date) {
          // Task has started by this date
          if (task.endDate <= date) {
            // Task should be completed by this date - no hours remaining
            hoursRemaining = 0
          } else {
            // Task is in progress - count remaining hours
            hoursRemaining = task.remaining_estimate_hours || 0
          }
        } else {
          // Task hasn't started yet - count full remaining hours
          hoursRemaining = task.remaining_estimate_hours || 0
        }

        if (hoursRemaining > 0) {
          const profileType = task.profile_type || 'Unassigned'
          profileBreakdown[profileType] = (profileBreakdown[profileType] || 0) + hoursRemaining
          total += hoursRemaining
        }
      })

      return {
        date,
        profileBreakdown,
        total,
      }
    })

    return burndownData
  }, [projectData])
}
