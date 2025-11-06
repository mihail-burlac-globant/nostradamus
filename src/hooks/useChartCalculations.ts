import { useMemo } from 'react'
import { useProjectStore } from '../stores/projectStore'
import { BurndownDataPoint } from '../types/project.types'
import { eachDayOfInterval, differenceInDays } from 'date-fns'

export const useBurndownData = (): BurndownDataPoint[] => {
  const { projectData } = useProjectStore()

  return useMemo(() => {
    if (!projectData) return []

    const { startDate, endDate, tasks, totalPlannedWork } = projectData
    const totalDays = differenceInDays(endDate, startDate)

    if (totalDays <= 0) return []

    // Generate all dates in the project range
    const dates = eachDayOfInterval({ start: startDate, end: endDate })

    const burndownData: BurndownDataPoint[] = dates.map((date, index) => {
      // Calculate ideal work remaining (linear burndown)
      const daysElapsed = index
      const idealProgress = (daysElapsed / totalDays) * 100
      const idealWork = Math.max(0, 100 - idealProgress)

      // Calculate actual work remaining based on task progress
      const tasksActiveByDate = tasks.filter(
        (task) => task.startDate <= date && task.endDate >= date
      )

      let totalProgress = 0
      let taskCount = 0

      tasks.forEach((task) => {
        if (task.startDate <= date) {
          // For tasks that have started by this date
          if (task.endDate <= date) {
            // Task should be completed
            totalProgress += task.progress
          } else {
            // Task is in progress
            const taskDuration = differenceInDays(task.endDate, task.startDate)
            const taskDaysElapsed = differenceInDays(date, task.startDate)
            const expectedProgress = Math.min(
              100,
              (taskDaysElapsed / taskDuration) * 100
            )
            // Use actual progress if available, otherwise use expected
            totalProgress += Math.min(task.progress, expectedProgress)
          }
          taskCount++
        }
      })

      const actualProgress = taskCount > 0 ? (totalProgress / (taskCount * 100)) * 100 : 0
      const remainingWork = Math.max(0, 100 - actualProgress)

      return {
        date,
        idealWork,
        actualWork: actualProgress,
        remainingWork,
      }
    })

    return burndownData
  }, [projectData])
}
