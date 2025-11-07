import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBurndownData, useBurndownByProfileData } from '../useChartCalculations'
import { useProjectStore } from '../../stores/projectStore'
import type { ProjectData } from '../../types/project.types'

describe('useChartCalculations', () => {
  const mockProjectData: ProjectData = {
    name: 'Test Project',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-10'),
    totalPlannedWork: 200,
    tasks: [
      {
        id: 'task-1',
        name: 'Task 1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        progress: 100,
        status: 'completed',
        assignee: 'John Doe',
        profile_type: 'backend',
        remaining_estimate_hours: 0,
      },
      {
        id: 'task-2',
        name: 'Task 2',
        startDate: new Date('2024-01-03'),
        endDate: new Date('2024-01-08'),
        progress: 50,
        status: 'in-progress',
        assignee: 'Jane Smith',
        profile_type: 'frontend',
        remaining_estimate_hours: 80,
      },
      {
        id: 'task-3',
        name: 'Task 3',
        startDate: new Date('2024-01-06'),
        endDate: new Date('2024-01-10'),
        progress: 0,
        status: 'not-started',
        assignee: 'Bob Wilson',
        profile_type: 'qa',
        remaining_estimate_hours: 120,
      },
    ],
  }

  beforeEach(() => {
    // Reset store before each test
    useProjectStore.setState({ projectData: mockProjectData })
  })

  describe('useBurndownData', () => {
    it('should return burndown data points for each day', () => {
      const { result } = renderHook(() => useBurndownData())

      expect(result.current).toBeDefined()
      expect(Array.isArray(result.current)).toBe(true)
      expect(result.current.length).toBeGreaterThan(0)
    })

    it('should calculate ideal burndown correctly', () => {
      const { result } = renderHook(() => useBurndownData())

      const firstDay = result.current[0]
      const lastDay = result.current[result.current.length - 1]

      // First day should have ~100% ideal work remaining
      expect(firstDay.idealWork).toBeGreaterThan(95)
      expect(firstDay.idealWork).toBeLessThanOrEqual(100)

      // Last day should have ~0% ideal work remaining
      expect(lastDay.idealWork).toBeGreaterThanOrEqual(0)
      expect(lastDay.idealWork).toBeLessThan(5)
    })

    it('should calculate remaining work based on hours', () => {
      const { result } = renderHook(() => useBurndownData())

      expect(result.current).toBeDefined()
      expect(result.current.length).toBeGreaterThan(0)

      // Each data point should have valid remaining work percentage
      result.current.forEach((point) => {
        expect(point.remainingWork).toBeGreaterThanOrEqual(0)
        expect(point.remainingWork).toBeLessThanOrEqual(100)
      })
    })

    it('should return empty array when no project data', () => {
      useProjectStore.setState({ projectData: null })
      const { result } = renderHook(() => useBurndownData())

      expect(result.current).toEqual([])
    })

    it('should handle zero total hours correctly', () => {
      const projectWithNoHours: ProjectData = {
        ...mockProjectData,
        tasks: mockProjectData.tasks.map((task) => ({
          ...task,
          remaining_estimate_hours: 0,
        })),
      }
      useProjectStore.setState({ projectData: projectWithNoHours })

      const { result } = renderHook(() => useBurndownData())

      expect(result.current).toEqual([])
    })
  })

  describe('useBurndownByProfileData', () => {
    it('should return burndown data grouped by profile type', () => {
      const { result } = renderHook(() => useBurndownByProfileData())

      expect(result.current).toBeDefined()
      expect(Array.isArray(result.current)).toBe(true)
      expect(result.current.length).toBeGreaterThan(0)
    })

    it('should include profile breakdown in each data point', () => {
      const { result } = renderHook(() => useBurndownByProfileData())

      const firstDay = result.current[0]

      expect(firstDay.profileBreakdown).toBeDefined()
      expect(typeof firstDay.profileBreakdown).toBe('object')
    })

    it('should calculate total remaining hours correctly', () => {
      const { result } = renderHook(() => useBurndownByProfileData())

      result.current.forEach((point) => {
        expect(point.total).toBeGreaterThanOrEqual(0)
        expect(typeof point.total).toBe('number')
      })
    })

    it('should group by profile type correctly', () => {
      const { result } = renderHook(() => useBurndownByProfileData())

      const firstDay = result.current[0]
      const profiles = Object.keys(firstDay.profileBreakdown)

      // Should have backend, frontend, qa profiles
      expect(profiles.length).toBeGreaterThan(0)
    })

    it('should handle tasks without profile_type as "Unassigned"', () => {
      const projectWithUnassigned: ProjectData = {
        ...mockProjectData,
        tasks: [
          {
            id: 'task-1',
            name: 'Task without profile',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-05'),
            progress: 0,
            status: 'not-started',
            remaining_estimate_hours: 50,
          },
        ],
      }
      useProjectStore.setState({ projectData: projectWithUnassigned })

      const { result } = renderHook(() => useBurndownByProfileData())

      const firstDay = result.current[0]
      expect(firstDay.profileBreakdown['Unassigned']).toBeDefined()
      expect(firstDay.profileBreakdown['Unassigned']).toBe(50)
    })

    it('should return empty array when no project data', () => {
      useProjectStore.setState({ projectData: null })
      const { result } = renderHook(() => useBurndownByProfileData())

      expect(result.current).toEqual([])
    })

    it('should calculate remaining hours based on task dates', () => {
      const { result } = renderHook(() => useBurndownByProfileData())

      // First day: all tasks not started yet (all hours remaining)
      const firstDay = result.current[0]
      // Last day: tasks should be completed (fewer hours remaining)
      const lastDay = result.current[result.current.length - 1]

      // Total should decrease over time
      expect(firstDay.total).toBeGreaterThanOrEqual(lastDay.total)
    })
  })
})
