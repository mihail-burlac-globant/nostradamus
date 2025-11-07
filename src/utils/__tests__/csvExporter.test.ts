import { describe, it, expect } from 'vitest'
import { exportToCSV } from '../csvExporter'
import type { ProjectData } from '../../types/project.types'

describe('csvExporter', () => {
  describe('exportToCSV', () => {
    const mockProjectData: ProjectData = {
      name: 'Test Project',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-10'),
      totalPlannedWork: 100,
      tasks: [
        {
          id: 'task-1',
          name: 'Test Task 1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-05'),
          progress: 100,
          status: 'completed',
          assignee: 'John Doe',
          profile_type: 'backend',
          remaining_estimate_hours: 0,
          dependency: '',
        },
        {
          id: 'task-2',
          name: 'Test Task 2',
          startDate: new Date('2024-01-03'),
          endDate: new Date('2024-01-08'),
          progress: 50,
          status: 'in-progress',
          assignee: 'Jane Smith',
          profile_type: 'frontend',
          remaining_estimate_hours: 40,
          dependency: 'task-1',
        },
      ],
    }

    it('should generate CSV with correct header', () => {
      const csv = exportToCSV(mockProjectData)

      expect(csv).toContain('id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,dependency')
    })

    it('should include all task data', () => {
      const csv = exportToCSV(mockProjectData)

      expect(csv).toContain('task-1')
      expect(csv).toContain('Test Task 1')
      expect(csv).toContain('task-2')
      expect(csv).toContain('Test Task 2')
    })

    it('should format dates correctly', () => {
      const csv = exportToCSV(mockProjectData)

      expect(csv).toContain('2024-01-01')
      expect(csv).toContain('2024-01-05')
    })

    it('should include progress and status', () => {
      const csv = exportToCSV(mockProjectData)

      expect(csv).toContain('100,completed')
      expect(csv).toContain('50,in-progress')
    })

    it('should include assignee and profile_type', () => {
      const csv = exportToCSV(mockProjectData)

      expect(csv).toContain('John Doe,backend')
      expect(csv).toContain('Jane Smith,frontend')
    })

    it('should include remaining_estimate_hours', () => {
      const csv = exportToCSV(mockProjectData)

      expect(csv).toContain(',0,')
      expect(csv).toContain(',40,')
    })

    it('should include dependencies', () => {
      const csv = exportToCSV(mockProjectData)

      expect(csv).toContain(',task-1')
    })

    it('should handle optional fields correctly', () => {
      const projectWithOptionalFields: ProjectData = {
        name: 'Test Project',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-10'),
        totalPlannedWork: 50,
        tasks: [
          {
            id: 'task-1',
            name: 'Task without optional fields',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-05'),
            progress: 50,
            status: 'in-progress',
          },
        ],
      }

      const csv = exportToCSV(projectWithOptionalFields)

      expect(csv).toBeDefined()
      expect(csv).toContain('task-1')
      expect(csv).toContain('Task without optional fields')
    })

    it('should generate valid CSV with multiple rows', () => {
      const csv = exportToCSV(mockProjectData)
      const lines = csv.split('\n').filter((line) => line.trim().length > 0)

      // Should have header + 2 task rows
      expect(lines.length).toBe(3)
    })

    it('should handle empty task list', () => {
      const emptyProject: ProjectData = {
        name: 'Empty Project',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-10'),
        totalPlannedWork: 0,
        tasks: [],
      }

      const csv = exportToCSV(emptyProject)

      // Should still have header
      expect(csv).toContain('id,name,startDate,endDate')
      const lines = csv.split('\n').filter((line) => line.trim().length > 0)
      expect(lines.length).toBe(1) // Only header
    })

    it('should escape commas in task names', () => {
      const projectWithCommas: ProjectData = {
        name: 'Test Project',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-10'),
        totalPlannedWork: 50,
        tasks: [
          {
            id: 'task-1',
            name: 'Task with, comma',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-05'),
            progress: 50,
            status: 'in-progress',
            remaining_estimate_hours: 40,
          },
        ],
      }

      const csv = exportToCSV(projectWithCommas)

      // Should wrap in quotes when there's a comma
      expect(csv).toContain('"Task with, comma"')
    })
  })
})
