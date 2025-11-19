import { describe, it, expect } from 'vitest'

/**
 * Unit tests for task duration calculation logic
 * Formula: duration = estimatedDays / (numberOfProfiles * focusFactor)
 */

describe('Task Duration Calculation', () => {
  const calculateDuration = (
    estimatedDays: number,
    numberOfProfiles: number,
    focusFactor: number // As percentage (0-100)
  ): number => {
    const focusDecimal = focusFactor / 100
    return Math.ceil(estimatedDays / (numberOfProfiles * focusDecimal))
  }

  describe('Single resource scenarios', () => {
    it('should calculate duration with 1 profile at 100% focus', () => {
      // 10 days of work, 1 person at 100% = 10 days
      const duration = calculateDuration(10, 1, 100)
      expect(duration).toBe(10)
    })

    it('should calculate duration with 1 profile at 80% focus', () => {
      // 10 days of work, 1 person at 80% = 10 / 0.8 = 12.5 → 13 days (rounded up)
      const duration = calculateDuration(10, 1, 80)
      expect(duration).toBe(13)
    })

    it('should calculate duration with 1 profile at 50% focus', () => {
      // 10 days of work, 1 person at 50% = 10 / 0.5 = 20 days
      const duration = calculateDuration(10, 1, 50)
      expect(duration).toBe(20)
    })
  })

  describe('Multiple resource scenarios', () => {
    it('should calculate duration with 2 profiles at 100% focus', () => {
      // 10 days of work, 2 people at 100% = 10 / 2 = 5 days
      const duration = calculateDuration(10, 2, 100)
      expect(duration).toBe(5)
    })

    it('should calculate duration with 2 profiles at 80% focus', () => {
      // 10 days of work, 2 people at 80% = 10 / (2 * 0.8) = 10 / 1.6 = 6.25 → 7 days
      const duration = calculateDuration(10, 2, 80)
      expect(duration).toBe(7)
    })

    it('should calculate duration with 4 profiles at 100% focus', () => {
      // 20 days of work, 4 people at 100% = 20 / 4 = 5 days
      const duration = calculateDuration(20, 4, 100)
      expect(duration).toBe(5)
    })

    it('should calculate duration with 3 profiles at 75% focus', () => {
      // 30 days of work, 3 people at 75% = 30 / (3 * 0.75) = 30 / 2.25 = 13.33 → 14 days
      const duration = calculateDuration(30, 3, 75)
      expect(duration).toBe(14)
    })
  })

  describe('Edge cases', () => {
    it('should handle small work estimates', () => {
      // 1 day of work, 2 people at 100% = 1 / 2 = 0.5 → 1 day (rounded up)
      const duration = calculateDuration(1, 2, 100)
      expect(duration).toBe(1)
    })

    it('should handle fractional days with multiple profiles', () => {
      // 2 days of work, 3 people at 100% = 2 / 3 = 0.67 → 1 day (rounded up)
      const duration = calculateDuration(2, 3, 100)
      expect(duration).toBe(1)
    })

    it('should handle large team sizes', () => {
      // 100 days of work, 10 people at 90% = 100 / (10 * 0.9) = 100 / 9 = 11.11 → 12 days
      const duration = calculateDuration(100, 10, 90)
      expect(duration).toBe(12)
    })

    it('should handle very low focus factors', () => {
      // 10 days of work, 1 person at 25% = 10 / 0.25 = 40 days
      const duration = calculateDuration(10, 1, 25)
      expect(duration).toBe(40)
    })
  })

  describe('Real-world scenarios', () => {
    it('Backend task: 20 days with 2 backend devs at 80%', () => {
      // 20 person-days, 2 devs at 80% focus = 20 / (2 * 0.8) = 20 / 1.6 = 12.5 → 13 days
      const duration = calculateDuration(20, 2, 80)
      expect(duration).toBe(13)
    })

    it('Frontend task: 15 days with 3 frontend devs at 70%', () => {
      // 15 person-days, 3 devs at 70% focus = 15 / (3 * 0.7) = 15 / 2.1 = 7.14 → 8 days
      const duration = calculateDuration(15, 3, 70)
      expect(duration).toBe(8)
    })

    it('QA task: 5 days with 1 QA at 100%', () => {
      // 5 person-days, 1 QA at 100% = 5 / 1 = 5 days
      const duration = calculateDuration(5, 1, 100)
      expect(duration).toBe(5)
    })

    it('DevOps task: 8 days with 2 devops at 60% (part-time)', () => {
      // 8 person-days, 2 devops at 60% = 8 / (2 * 0.6) = 8 / 1.2 = 6.67 → 7 days
      const duration = calculateDuration(8, 2, 60)
      expect(duration).toBe(7)
    })
  })

  describe('Scaling effects', () => {
    it('should show duration halves when doubling team size', () => {
      const duration1 = calculateDuration(20, 1, 100)
      const duration2 = calculateDuration(20, 2, 100)

      expect(duration1).toBe(20)
      expect(duration2).toBe(10)
      expect(duration1 / duration2).toBe(2)
    })

    it('should show duration doubles when halving focus factor', () => {
      const duration1 = calculateDuration(20, 2, 100)
      const duration2 = calculateDuration(20, 2, 50)

      expect(duration1).toBe(10)
      expect(duration2).toBe(20)
      expect(duration2 / duration1).toBe(2)
    })

    it('should demonstrate adding more profiles speeds up tasks', () => {
      const work = 40

      const with1Profile = calculateDuration(work, 1, 80)
      const with2Profiles = calculateDuration(work, 2, 80)
      const with4Profiles = calculateDuration(work, 4, 80)

      expect(with1Profile).toBe(50) // 40 / 0.8 = 50
      expect(with2Profiles).toBe(25) // 40 / 1.6 = 25
      expect(with4Profiles).toBe(13) // 40 / 3.2 = 12.5 → 13

      expect(with1Profile).toBeGreaterThan(with2Profiles)
      expect(with2Profiles).toBeGreaterThan(with4Profiles)
    })
  })

  describe('Parallel work with multiple resource types', () => {
    it('should take longest duration when resources work in parallel', () => {
      // Backend: 20 days work, 2 people at 80% = 13 days
      const backendDuration = calculateDuration(20, 2, 80)

      // Frontend: 10 days work, 1 person at 100% = 10 days
      const frontendDuration = calculateDuration(10, 1, 100)

      // Task takes the max of both (they work in parallel)
      const taskDuration = Math.max(backendDuration, frontendDuration)

      expect(backendDuration).toBe(13)
      expect(frontendDuration).toBe(10)
      expect(taskDuration).toBe(13) // Limited by backend
    })

    it('should show frontend as bottleneck when it takes longer', () => {
      // Backend: 10 days work, 3 people at 100% = 4 days
      const backendDuration = calculateDuration(10, 3, 100)

      // Frontend: 20 days work, 1 person at 80% = 25 days
      const frontendDuration = calculateDuration(20, 1, 80)

      const taskDuration = Math.max(backendDuration, frontendDuration)

      expect(backendDuration).toBe(4)
      expect(frontendDuration).toBe(25)
      expect(taskDuration).toBe(25) // Limited by frontend
    })
  })
})
