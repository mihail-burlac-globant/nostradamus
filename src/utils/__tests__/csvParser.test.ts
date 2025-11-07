import { describe, it, expect } from 'vitest'
import { parseCSVToProjectData } from '../csvParser'
import Papa from 'papaparse'
import { CSVRow } from '../../types/project.types'

describe('csvParser', () => {
  describe('parseCSVToProjectData', () => {
    it('should parse valid CSV data correctly', () => {
      const csvData = Papa.parse<CSVRow>(`id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,dependency
task-1,Test Task,2024-01-01,2024-01-10,50,in-progress,John Doe,backend,40,`, {
        header: true,
        skipEmptyLines: true,
      })

      const result = parseCSVToProjectData(csvData.data)

      expect(result).toBeDefined()
      expect(result.tasks).toHaveLength(1)
      expect(result.tasks[0].id).toBe('task-1')
      expect(result.tasks[0].name).toBe('Test Task')
      expect(result.tasks[0].progress).toBe(50)
      expect(result.tasks[0].status).toBe('in-progress')
      expect(result.tasks[0].assignee).toBe('John Doe')
      expect(result.tasks[0].profile_type).toBe('backend')
      expect(result.tasks[0].remaining_estimate_hours).toBe(40)
    })

    it('should parse dates correctly', () => {
      const csvData = Papa.parse<CSVRow>(`id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,dependency
task-1,Test Task,2024-01-15,2024-02-20,100,completed,Jane Smith,frontend,0,`, {
        header: true,
        skipEmptyLines: true,
      })

      const result = parseCSVToProjectData(csvData.data)

      expect(result.tasks[0].startDate).toBeInstanceOf(Date)
      expect(result.tasks[0].endDate).toBeInstanceOf(Date)
      expect(result.tasks[0].startDate.getFullYear()).toBe(2024)
      expect(result.tasks[0].startDate.getMonth()).toBe(0) // January is 0
      expect(result.tasks[0].startDate.getDate()).toBe(15)
    })

    it('should calculate project start and end dates correctly', () => {
      const csvData = Papa.parse<CSVRow>(`id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,dependency
task-1,Task 1,2024-01-01,2024-01-10,100,completed,John,backend,0,
task-2,Task 2,2024-01-15,2024-02-20,50,in-progress,Jane,frontend,50,
task-3,Task 3,2024-02-15,2024-03-01,0,not-started,Bob,qa,100,`, {
        header: true,
        skipEmptyLines: true,
      })

      const result = parseCSVToProjectData(csvData.data)

      expect(result.startDate).toBeInstanceOf(Date)
      expect(result.endDate).toBeInstanceOf(Date)
      expect(result.startDate.getFullYear()).toBe(2024)
      expect(result.startDate.getMonth()).toBe(0) // January
      expect(result.startDate.getDate()).toBe(1)
      expect(result.endDate.getMonth()).toBe(2) // March
      expect(result.endDate.getDate()).toBe(1)
    })

    it('should calculate total planned work from remaining hours', () => {
      const csvData = Papa.parse<CSVRow>(`id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,dependency
task-1,Task 1,2024-01-01,2024-01-10,100,completed,John,backend,0,
task-2,Task 2,2024-01-15,2024-02-20,50,in-progress,Jane,frontend,50,
task-3,Task 3,2024-02-15,2024-03-01,0,not-started,Bob,qa,100,`, {
        header: true,
        skipEmptyLines: true,
      })

      const result = parseCSVToProjectData(csvData.data)

      // Total: 0 + 50 + 100 = 150
      expect(result.totalPlannedWork).toBe(150)
    })

    it('should handle optional fields correctly', () => {
      const csvData = Papa.parse<CSVRow>(`id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,dependency
task-1,Task 1,2024-01-01,2024-01-10,50,in-progress,,backend,40,
task-2,Task 2,2024-01-15,2024-02-20,75,in-progress,Jane Smith,frontend,25,task-1`, {
        header: true,
        skipEmptyLines: true,
      })

      const result = parseCSVToProjectData(csvData.data)

      // assignee and dependency are truly optional
      expect(result.tasks[0].assignee).toBeUndefined()
      expect(result.tasks[0].dependency).toBeUndefined()
      // profile_type is now mandatory
      expect(result.tasks[0].profile_type).toBe('backend')

      expect(result.tasks[1].assignee).toBe('Jane Smith')
      expect(result.tasks[1].profile_type).toBe('frontend')
      expect(result.tasks[1].dependency).toBe('task-1')
    })

    it('should handle multiple tasks correctly', () => {
      const csvData = Papa.parse<CSVRow>(`id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,dependency
task-1,Task 1,2024-01-01,2024-01-10,100,completed,John,backend,0,
task-2,Task 2,2024-01-05,2024-01-15,75,in-progress,Jane,frontend,20,task-1
task-3,Task 3,2024-01-10,2024-01-20,50,in-progress,Bob,qa,40,task-2
task-4,Task 4,2024-01-15,2024-01-25,0,not-started,Alice,devops,80,task-3`, {
        header: true,
        skipEmptyLines: true,
      })

      const result = parseCSVToProjectData(csvData.data)

      expect(result.tasks).toHaveLength(4)
      expect(result.tasks[0].status).toBe('completed')
      expect(result.tasks[1].status).toBe('in-progress')
      expect(result.tasks[2].status).toBe('in-progress')
      expect(result.tasks[3].status).toBe('not-started')
    })

    it('should throw error when remaining_estimate_hours is missing', () => {
      const csvData = Papa.parse<CSVRow>(`id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,dependency
task-1,Task 1,2024-01-01,2024-01-10,100,completed,John,backend,,`, {
        header: true,
        skipEmptyLines: true,
      })

      // remaining_estimate_hours is now mandatory
      expect(() => parseCSVToProjectData(csvData.data)).toThrow('Missing required field')
    })

    it('should validate unique task IDs', () => {
      const csvData = Papa.parse<CSVRow>(`id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,dependency
task-1,Task 1,2024-01-01,2024-01-10,100,completed,John,backend,0,
task-1,Task 2,2024-01-15,2024-02-20,50,in-progress,Jane,frontend,40,`, {
        header: true,
        skipEmptyLines: true,
      })

      expect(() => parseCSVToProjectData(csvData.data)).toThrow('Duplicate task IDs')
    })

    it('should validate dependency references exist', () => {
      const csvData = Papa.parse<CSVRow>(`id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,dependency
task-1,Task 1,2024-01-01,2024-01-10,100,completed,John,backend,0,task-999`, {
        header: true,
        skipEmptyLines: true,
      })

      expect(() => parseCSVToProjectData(csvData.data)).toThrow('non-existent dependency')
    })

    it('should detect circular dependencies', () => {
      const csvData = Papa.parse<CSVRow>(`id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,dependency
task-1,Task 1,2024-01-01,2024-01-10,50,in-progress,John,backend,40,task-2
task-2,Task 2,2024-01-15,2024-02-20,50,in-progress,Jane,frontend,40,task-1`, {
        header: true,
        skipEmptyLines: true,
      })

      expect(() => parseCSVToProjectData(csvData.data)).toThrow('Circular dependency')
    })
  })
})
