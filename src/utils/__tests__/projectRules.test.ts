import { describe, it, expect } from 'vitest'
import { isWeekend, addDays } from 'date-fns'

/**
 * Unit tests for project business rules
 * Rule 1: A resource can only work on one task at a time
 * Rule 2: 5 working days per week (weekends excluded)
 * Rule 3: TASK_DURATION = (REMAINING_ESTIMATION/FOCUS_FACTOR)/NUMBER_OF_RESOURCES (tested in durationCalculation.test.ts)
 */

describe('Project Business Rules', () => {
  describe('Rule 1: Resource Exclusivity - One Task at a Time', () => {
    /**
     * Simulates resource work distribution
     * Returns the work done on each task when a resource can only work on ONE task at a time
     */
    const simulateResourceWork = (
      resourceCapacity: number,
      tasksRemaining: number[]
    ): number[] => {
      const workDone: number[] = new Array(tasksRemaining.length).fill(0)

      // Resource works on the FIRST task with remaining work
      const firstTaskIndex = tasksRemaining.findIndex(remaining => remaining > 0)

      if (firstTaskIndex >= 0) {
        workDone[firstTaskIndex] = Math.min(resourceCapacity, tasksRemaining[firstTaskIndex])
      }

      return workDone
    }

    it('should work on only one task when multiple tasks need the same resource', () => {
      const resourceCapacity = 1.0 // 1 person-day per day
      const tasksRemaining = [5, 3, 2] // Three tasks all need this resource

      const workDone = simulateResourceWork(resourceCapacity, tasksRemaining)

      // Resource should work only on the first task
      expect(workDone[0]).toBe(1.0)
      expect(workDone[1]).toBe(0)
      expect(workDone[2]).toBe(0)
      expect(workDone.reduce((sum, w) => sum + w, 0)).toBe(1.0)
    })

    it('should complete first task before starting second task', () => {
      const resourceCapacity = 1.0
      const tasksRemaining = [0.5, 3, 2] // First task almost done

      // Day 1: Finish first task
      let workDone = simulateResourceWork(resourceCapacity, tasksRemaining)
      expect(workDone[0]).toBe(0.5) // Complete first task
      expect(workDone[1]).toBe(0)
      expect(workDone[2]).toBe(0)

      // Update remaining
      tasksRemaining[0] -= workDone[0]
      expect(tasksRemaining[0]).toBe(0)

      // Day 2: Now work on second task
      workDone = simulateResourceWork(resourceCapacity, tasksRemaining)
      expect(workDone[0]).toBe(0) // First task completed
      expect(workDone[1]).toBe(1.0) // Now working on second task
      expect(workDone[2]).toBe(0)
    })

    it('should apply full capacity to one task, not split across multiple tasks', () => {
      const resourceCapacity = 2.0 // 2 person-days per day (e.g., 2 people)
      const tasksRemaining = [10, 8, 5]

      const workDone = simulateResourceWork(resourceCapacity, tasksRemaining)

      // Full capacity goes to first task
      expect(workDone[0]).toBe(2.0)
      expect(workDone[1]).toBe(0)
      expect(workDone[2]).toBe(0)

      // Total work equals resource capacity (not split)
      expect(workDone.reduce((sum, w) => sum + w, 0)).toBe(2.0)
    })

    it('should demonstrate incorrect behavior: splitting capacity across tasks', () => {
      // This is what we DON'T want - for comparison
      const resourceCapacity = 1.0
      const tasksRemaining = [5, 3]

      // INCORRECT: Splitting capacity
      const incorrectWorkDone = [
        resourceCapacity / 2, // 0.5 to first task
        resourceCapacity / 2  // 0.5 to second task
      ]

      // CORRECT: Full capacity to one task
      const correctWorkDone = simulateResourceWork(resourceCapacity, tasksRemaining)

      expect(incorrectWorkDone[0]).toBe(0.5)
      expect(incorrectWorkDone[1]).toBe(0.5)

      expect(correctWorkDone[0]).toBe(1.0)
      expect(correctWorkDone[1]).toBe(0)

      // Verify they're different
      expect(correctWorkDone[0]).not.toBe(incorrectWorkDone[0])
    })

    it('should handle case where first task needs less than full capacity', () => {
      const resourceCapacity = 2.0
      const tasksRemaining = [0.5, 5, 3] // First task only needs 0.5 days

      const workDone = simulateResourceWork(resourceCapacity, tasksRemaining)

      // Should do only 0.5 days on first task (what's needed)
      // Remaining capacity is lost (can't switch mid-day)
      expect(workDone[0]).toBe(0.5)
      expect(workDone[1]).toBe(0)
      expect(workDone[2]).toBe(0)
    })
  })

  describe('Rule 2: Working Days - 5 Days per Week', () => {
    /**
     * Helper to add working days (excluding weekends)
     */
    const addWorkingDays = (startDate: Date, workingDays: number): Date => {
      let result = new Date(startDate)
      let daysAdded = 0

      while (daysAdded < workingDays) {
        result = addDays(result, 1)
        if (!isWeekend(result)) {
          daysAdded++
        }
      }

      return result
    }

    /**
     * Helper to skip to next weekday
     */
    const skipToNextWeekday = (date: Date): Date => {
      let result = new Date(date)
      while (isWeekend(result)) {
        result = addDays(result, 1)
      }
      return result
    }

    it('should identify weekends correctly', () => {
      // Saturday
      const saturday = new Date('2025-01-18') // Saturday
      expect(isWeekend(saturday)).toBe(true)

      // Sunday
      const sunday = new Date('2025-01-19') // Sunday
      expect(isWeekend(sunday)).toBe(true)

      // Monday (weekday)
      const monday = new Date('2025-01-20') // Monday
      expect(isWeekend(monday)).toBe(false)

      // Friday (weekday)
      const friday = new Date('2025-01-17') // Friday
      expect(isWeekend(friday)).toBe(false)
    })

    it('should add 5 working days correctly (skipping weekends)', () => {
      // Start on Monday Jan 13, 2025
      const monday = new Date('2025-01-13')

      // Add 5 working days: Tue, Wed, Thu, Fri, Mon
      const result = addWorkingDays(monday, 5)

      // Should land on Monday Jan 20 (skipping Sat/Sun)
      expect(result.getDate()).toBe(20)
      expect(result.getMonth()).toBe(0) // January = 0
      expect(isWeekend(result)).toBe(false)
    })

    it('should add 10 working days correctly (skipping two weekends)', () => {
      // Start on Friday Jan 10, 2025
      const friday = new Date('2025-01-10')

      // Add 10 working days: Mon-Fri (week 1) + Mon-Fri (week 2)
      const result = addWorkingDays(friday, 10)

      // Should land on Friday Jan 24 (2 weeks later, skipping 2 weekends)
      // Jan 13-17 (Mon-Fri) = 5 days, Jan 20-24 (Mon-Fri) = 5 days
      expect(result.getDate()).toBe(24)
      expect(isWeekend(result)).toBe(false)
    })

    it('should skip Saturday to Monday', () => {
      const saturday = new Date('2025-01-18')
      const result = skipToNextWeekday(saturday)

      expect(result.getDate()).toBe(20) // Monday
      expect(isWeekend(result)).toBe(false)
    })

    it('should skip Sunday to Monday', () => {
      const sunday = new Date('2025-01-19')
      const result = skipToNextWeekday(sunday)

      expect(result.getDate()).toBe(20) // Monday
      expect(isWeekend(result)).toBe(false)
    })

    it('should not change weekday dates', () => {
      const monday = new Date('2025-01-20')
      const result = skipToNextWeekday(monday)

      expect(result.getTime()).toBe(monday.getTime())
    })

    it('should calculate work completion time excluding weekends', () => {
      // 10 days of work at 1 day/day starting Monday
      const startDate = new Date('2025-01-13') // Monday
      const workDays = 10
      const endDate = addWorkingDays(startDate, workDays)

      // Should take 2 calendar weeks (14 calendar days including 2 weekends)
      const calendarDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)

      expect(calendarDays).toBe(14) // 10 work days + 4 weekend days
      expect(isWeekend(endDate)).toBe(false)
    })

    it('should show 5 working days per week means 20 working days per month', () => {
      // In a 4-week period, we have:
      // - 28 calendar days
      // - 8 weekend days (4 Saturdays + 4 Sundays)
      // - 20 working days
      const startDate = new Date('2025-01-06') // Monday
      const endDate = addWorkingDays(startDate, 20)

      const calendarDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)

      // 20 working days + 8 weekend days = 28 calendar days
      expect(calendarDays).toBe(28)
    })

    it('should demonstrate no work happens on weekends', () => {
      const friday = new Date('2025-01-17') // Friday
      const saturday = addDays(friday, 1)
      const sunday = addDays(friday, 2)

      // Verify Saturday and Sunday are weekends
      expect(isWeekend(saturday)).toBe(true)
      expect(isWeekend(sunday)).toBe(true)

      // Work done on weekends should be 0
      const workOnFriday = isWeekend(friday) ? 0 : 1
      const workOnSaturday = isWeekend(saturday) ? 0 : 1
      const workOnSunday = isWeekend(sunday) ? 0 : 1

      expect(workOnFriday).toBe(1)
      expect(workOnSaturday).toBe(0)
      expect(workOnSunday).toBe(0)
    })
  })

  describe('Integration: All Rules Together', () => {
    it('should demonstrate realistic scenario with all 3 rules', () => {
      // User's example from conversation:
      // 10 days work, 1 resource at 75% focus factor

      // Rule 3: Calculate duration
      const estimatedDays = 10
      const numberOfResources = 1
      const focusFactor = 0.75
      const workDuration = estimatedDays / (numberOfResources * focusFactor)

      expect(workDuration).toBeCloseTo(13.33, 2) // 10 / 0.75 = 13.33 days

      // Rule 2: Calculate calendar days (including weekends)
      const startDate = new Date('2025-01-13') // Monday
      const endDate = addWorkingDays(startDate, Math.ceil(workDuration))

      // 14 working days starting Monday Jan 13
      // Week 1: Tue-Fri (4 days) → Jan 17
      // Week 2: Mon-Fri (5 days) → Jan 24
      // Week 3: Mon-Fri (5 days) → Jan 31
      expect(endDate.getDate()).toBe(31)

      // Rule 1: Resource works on one task at a time
      const task1Remaining = 10
      const task2Remaining = 5
      const dailyCapacity = numberOfResources * focusFactor // 0.75 days/day

      const workDone = [0, 0]
      const remaining = [task1Remaining, task2Remaining]

      // Day 1: Work on task 1 only
      workDone[0] = Math.min(dailyCapacity, remaining[0])
      workDone[1] = 0

      expect(workDone[0]).toBe(0.75)
      expect(workDone[1]).toBe(0)
    })

    it('should verify 2 resources at 75% focus for 10 days of work', () => {
      // User's example: 10 days work, 2 resources at 75%
      const estimatedDays = 10
      const numberOfResources = 2
      const focusFactor = 0.75

      // Rule 3: Duration calculation
      const duration = estimatedDays / (numberOfResources * focusFactor)
      expect(duration).toBeCloseTo(6.67, 2) // 10 / (2 * 0.75) = 6.67 days

      // Rule 2: Add working days
      const startDate = new Date('2025-01-13') // Monday
      const endDate = addWorkingDays(startDate, Math.ceil(duration))

      // 7 working days: Tue-Fri (4) + Mon-Wed (3) = Jan 22
      expect(endDate.getDate()).toBe(22)
      expect(isWeekend(endDate)).toBe(false)

      // Rule 1: Each resource works on one task at a time
      // With 2 resources, we get 2 * 0.75 = 1.5 person-days per day
      const dailyCapacity = numberOfResources * focusFactor
      expect(dailyCapacity).toBe(1.5)
    })
  })
})

/**
 * Helper function to add working days (excluding weekends)
 * Same implementation as used in GanttChart.tsx
 */
function addWorkingDays(startDate: Date, workingDays: number): Date {
  let result = new Date(startDate)
  let daysAdded = 0

  while (daysAdded < workingDays) {
    result = addDays(result, 1)
    if (!isWeekend(result)) {
      daysAdded++
    }
  }

  return result
}
