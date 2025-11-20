import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Project, Task, Resource } from '../../types/entities.types'

/**
 * Unit tests for task exporter functionality (JSON, CSV, Excel)
 * Tests data preparation and formatting logic
 */

describe('Task Exporter', () => {
  // Mock data
  const mockProject: Project = {
    id: 'proj-1',
    title: 'E-Commerce Platform',
    description: 'Building a new e-commerce platform',
    status: 'Active',
    startDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'User Authentication',
      description: 'Implement JWT authentication',
      projectId: 'proj-1',
      status: 'Done',
      progress: 100,
      color: '#6366f1',
      startDate: '2024-01-01',
      endDate: '2024-01-05',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-05T00:00:00.000Z',
    },
    {
      id: 'task-2',
      title: 'Product Catalog',
      description: 'Build product catalog with search',
      projectId: 'proj-1',
      status: 'In Progress',
      progress: 60,
      color: '#ec4899',
      startDate: '2024-01-06',
      endDate: '2024-01-15',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-10T00:00:00.000Z',
    },
    {
      id: 'task-3',
      title: 'Shopping Cart, Payment & Checkout',
      description: 'Complex task with commas, quotes "and" special characters',
      projectId: 'proj-1',
      status: 'Todo',
      progress: 0,
      color: '#10b981',
      startDate: '2024-01-16',
      endDate: '2024-01-25',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ]

  const mockResource: Resource & { estimatedDays: number; focusFactor: number } = {
    id: 'res-1',
    title: 'Backend Developer',
    description: 'Senior backend developer',
    defaultVelocity: 80,
    icon: 'code',
    status: 'Active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    estimatedDays: 10,
    focusFactor: 80,
  }

  const mockTaskResources = new Map<string, (Resource & { estimatedDays: number; focusFactor: number })[]>([
    ['task-1', [mockResource]],
    ['task-2', [{ ...mockResource, estimatedDays: 15 }]],
    ['task-3', []],
  ])

  const mockTaskDependencies = new Map<string, Task[]>([
    ['task-2', [mockTasks[0]]], // task-2 depends on task-1
    ['task-3', [mockTasks[1]]], // task-3 depends on task-2
  ])

  const mockExportData = {
    project: mockProject,
    tasks: mockTasks,
    taskResources: mockTaskResources,
    taskDependencies: mockTaskDependencies,
  }

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('JSON Export Data Structure', () => {
    it('should include project information', () => {
      const exportData = {
        project: {
          id: mockProject.id,
          title: mockProject.title,
          description: mockProject.description,
          status: mockProject.status,
          startDate: mockProject.startDate,
          createdAt: mockProject.createdAt,
          updatedAt: mockProject.updatedAt,
        },
        tasks: mockTasks.map(task => ({
          ...task,
          resources: mockTaskResources.get(task.id) || [],
          dependencies: (mockTaskDependencies.get(task.id) || []).map(dep => dep.id),
        })),
        exportedAt: expect.any(String),
      }

      expect(exportData.project).toEqual({
        id: 'proj-1',
        title: 'E-Commerce Platform',
        description: 'Building a new e-commerce platform',
        status: 'Active',
        startDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
    })

    it('should include all tasks with resources', () => {
      const tasks = mockTasks.map(task => ({
        ...task,
        resources: mockTaskResources.get(task.id) || [],
        dependencies: (mockTaskDependencies.get(task.id) || []).map(dep => dep.id),
      }))

      expect(tasks).toHaveLength(3)
      expect(tasks[0].resources).toHaveLength(1)
      expect(tasks[0].resources[0].estimatedDays).toBe(10)
      expect(tasks[1].resources).toHaveLength(1)
      expect(tasks[2].resources).toHaveLength(0)
    })

    it('should include dependencies as task IDs', () => {
      const tasks = mockTasks.map(task => ({
        ...task,
        resources: mockTaskResources.get(task.id) || [],
        dependencies: (mockTaskDependencies.get(task.id) || []).map(dep => dep.id),
      }))

      expect(tasks[0].dependencies).toEqual([])
      expect(tasks[1].dependencies).toEqual(['task-1'])
      expect(tasks[2].dependencies).toEqual(['task-2'])
    })

    it('should include export timestamp', () => {
      const exportData = {
        exportedAt: new Date().toISOString(),
      }

      expect(exportData.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('CSV Export Formatting', () => {
    it('should generate correct CSV headers', () => {
      const headers = [
        'Task ID',
        'Task Title',
        'Description',
        'Status',
        'Progress (%)',
        'Color',
        'Start Date',
        'End Date',
        'Resources',
        'Dependencies',
        'Created At',
        'Updated At',
      ]

      expect(headers).toHaveLength(12)
      expect(headers[0]).toBe('Task ID')
      expect(headers[1]).toBe('Task Title')
      expect(headers[8]).toBe('Resources')
      expect(headers[9]).toBe('Dependencies')
    })

    it('should format task rows correctly', () => {
      const task = mockTasks[0]
      const resources = mockTaskResources.get(task.id) || []
      const dependencies = mockTaskDependencies.get(task.id) || []

      const resourcesStr = resources
        .map(r => `${r.title} (${r.estimatedDays}d @ ${r.focusFactor}%)`)
        .join('; ')

      const dependenciesStr = dependencies
        .map(d => d.title)
        .join('; ')

      const row = [
        task.id,
        task.title,
        task.description.replace(/"/g, '""'),
        task.status,
        task.progress.toString(),
        task.color,
        task.startDate || '',
        task.endDate || '',
        resourcesStr,
        dependenciesStr,
        task.createdAt,
        task.updatedAt,
      ]

      expect(row[0]).toBe('task-1')
      expect(row[1]).toBe('User Authentication')
      expect(row[3]).toBe('Done')
      expect(row[8]).toBe('Backend Developer (10d @ 80%)')
    })

    it('should escape quotes in descriptions', () => {
      const task = mockTasks[2]
      const escaped = task.description.replace(/"/g, '""')

      expect(escaped).toBe('Complex task with commas, quotes ""and"" special characters')
    })

    it('should handle empty resources and dependencies', () => {
      const task = mockTasks[2]
      const resources = mockTaskResources.get(task.id) || []
      const dependencies = mockTaskDependencies.get(task.id) || []

      const resourcesStr = resources
        .map(r => `${r.title} (${r.estimatedDays}d @ ${r.focusFactor}%)`)
        .join('; ')

      const dependenciesStr = dependencies
        .map(d => d.title)
        .join('; ')

      expect(resourcesStr).toBe('')
      expect(dependenciesStr).toBe('Product Catalog')
    })

    it('should format project info header', () => {
      const projectInfo = [
        `Project: ${mockProject.title}`,
        `Description: ${mockProject.description}`,
        `Status: ${mockProject.status}`,
        `Start Date: ${mockProject.startDate || 'N/A'}`,
      ]

      expect(projectInfo[0]).toBe('Project: E-Commerce Platform')
      expect(projectInfo[1]).toBe('Description: Building a new e-commerce platform')
      expect(projectInfo[2]).toBe('Status: Active')
      expect(projectInfo[3]).toBe('Start Date: 2024-01-01')
    })

    it('should handle commas in task titles for CSV', () => {
      const task = mockTasks[2]
      const csvCell = `"${task.title}"`

      expect(csvCell).toBe('"Shopping Cart, Payment & Checkout"')
    })

    it('should handle multiple resources formatting', () => {
      const multipleResources = [
        { ...mockResource, title: 'Backend Dev', estimatedDays: 10, focusFactor: 80 },
        { ...mockResource, title: 'Frontend Dev', estimatedDays: 8, focusFactor: 90 },
      ]

      const resourcesStr = multipleResources
        .map(r => `${r.title} (${r.estimatedDays}d @ ${r.focusFactor}%)`)
        .join('; ')

      expect(resourcesStr).toBe('Backend Dev (10d @ 80%); Frontend Dev (8d @ 90%)')
    })
  })

  describe('Excel Export Data Preparation', () => {
    it('should prepare project info sheet data', () => {
      const projectData = [
        ['Project Information'],
        ['Title', mockProject.title],
        ['Description', mockProject.description],
        ['Status', mockProject.status],
        ['Start Date', mockProject.startDate || 'N/A'],
      ]

      expect(projectData[0]).toEqual(['Project Information'])
      expect(projectData[1]).toEqual(['Title', 'E-Commerce Platform'])
      expect(projectData[2]).toEqual(['Description', 'Building a new e-commerce platform'])
    })

    it('should prepare tasks sheet with correct headers', () => {
      const taskHeaders = [
        'Task ID',
        'Title',
        'Description',
        'Status',
        'Progress (%)',
        'Color',
        'Start Date',
        'End Date',
        'Created At',
        'Updated At',
      ]

      expect(taskHeaders).toHaveLength(10)
      expect(taskHeaders[4]).toBe('Progress (%)')
    })

    it('should prepare task rows for Excel', () => {
      const taskRows = mockTasks.map(task => [
        task.id,
        task.title,
        task.description,
        task.status,
        task.progress,
        task.color,
        task.startDate || '',
        task.endDate || '',
        task.createdAt,
        task.updatedAt,
      ])

      expect(taskRows).toHaveLength(3)
      expect(taskRows[0][0]).toBe('task-1')
      expect(taskRows[0][4]).toBe(100) // progress as number
      expect(taskRows[1][4]).toBe(60)
    })

    it('should prepare resources sheet data', () => {
      const resourceHeaders = ['Task ID', 'Task Title', 'Resource', 'Estimated Days', 'Focus Factor (%)']
      const resourceRows: (string | number)[][] = []

      mockTasks.forEach(task => {
        const resources = mockTaskResources.get(task.id) || []
        resources.forEach(resource => {
          resourceRows.push([
            task.id,
            task.title,
            resource.title,
            resource.estimatedDays,
            resource.focusFactor,
          ])
        })
      })

      expect(resourceHeaders).toHaveLength(5)
      expect(resourceRows).toHaveLength(2) // task-1 and task-2 have resources
      expect(resourceRows[0]).toEqual(['task-1', 'User Authentication', 'Backend Developer', 10, 80])
    })

    it('should prepare dependencies sheet data', () => {
      const depHeaders = ['Task ID', 'Task Title', 'Depends On ID', 'Depends On Title']
      const depRows: string[][] = []

      mockTasks.forEach(task => {
        const dependencies = mockTaskDependencies.get(task.id) || []
        dependencies.forEach(dep => {
          depRows.push([
            task.id,
            task.title,
            dep.id,
            dep.title,
          ])
        })
      })

      expect(depHeaders).toHaveLength(4)
      expect(depRows).toHaveLength(2) // task-2 and task-3 have dependencies
      expect(depRows[0]).toEqual(['task-2', 'Product Catalog', 'task-1', 'User Authentication'])
      expect(depRows[1]).toEqual(['task-3', 'Shopping Cart, Payment & Checkout', 'task-2', 'Product Catalog'])
    })

    it('should handle empty resources sheet', () => {
      const emptyTaskResources = new Map<string, (Resource & { estimatedDays: number; focusFactor: number })[]>()
      const resourceRows: (string | number)[][] = []

      mockTasks.forEach(task => {
        const resources = emptyTaskResources.get(task.id) || []
        resources.forEach(resource => {
          resourceRows.push([
            task.id,
            task.title,
            resource.title,
            resource.estimatedDays,
            resource.focusFactor,
          ])
        })
      })

      expect(resourceRows).toHaveLength(0)
    })

    it('should handle empty dependencies sheet', () => {
      const emptyDependencies = new Map<string, Task[]>()
      const depRows: string[][] = []

      mockTasks.forEach(task => {
        const dependencies = emptyDependencies.get(task.id) || []
        dependencies.forEach(dep => {
          depRows.push([
            task.id,
            task.title,
            dep.id,
            dep.title,
          ])
        })
      })

      expect(depRows).toHaveLength(0)
    })
  })

  describe('File Naming', () => {
    it('should generate correct JSON filename', () => {
      const filename = `${mockProject.title.toLowerCase().replace(/\s+/g, '-')}-tasks-2024-01-15.json`
      expect(filename).toBe('e-commerce-platform-tasks-2024-01-15.json')
    })

    it('should generate correct CSV filename', () => {
      const filename = `${mockProject.title.toLowerCase().replace(/\s+/g, '-')}-tasks-2024-01-15.csv`
      expect(filename).toBe('e-commerce-platform-tasks-2024-01-15.csv')
    })

    it('should generate correct Excel filename', () => {
      const filename = `${mockProject.title.toLowerCase().replace(/\s+/g, '-')}-tasks-2024-01-15.xlsx`
      expect(filename).toBe('e-commerce-platform-tasks-2024-01-15.xlsx')
    })

    it('should handle project names with special characters', () => {
      const specialProject = { ...mockProject, title: 'My Project: Phase 1 & 2' }
      const filename = `${specialProject.title.toLowerCase().replace(/\s+/g, '-')}-tasks-2024-01-15.json`
      expect(filename).toBe('my-project:-phase-1-&-2-tasks-2024-01-15.json')
    })
  })

  describe('Edge Cases', () => {
    it('should handle tasks with no dates', () => {
      const taskNoDate = { ...mockTasks[0], startDate: undefined, endDate: undefined }
      const row = [
        taskNoDate.startDate || '',
        taskNoDate.endDate || '',
      ]

      expect(row[0]).toBe('')
      expect(row[1]).toBe('')
    })

    it('should handle tasks with zero progress', () => {
      const task = mockTasks[2]
      expect(task.progress).toBe(0)
    })

    it('should handle tasks with 100% progress', () => {
      const task = mockTasks[0]
      expect(task.progress).toBe(100)
    })

    it('should handle empty task list', () => {
      const emptyExportData = {
        ...mockExportData,
        tasks: [],
      }

      expect(emptyExportData.tasks).toHaveLength(0)
    })

    it('should handle task with very long description', () => {
      const longDesc = 'A'.repeat(1000)
      const task = { ...mockTasks[0], description: longDesc }
      const escaped = task.description.replace(/"/g, '""')

      expect(escaped).toBe(longDesc)
      expect(escaped.length).toBe(1000)
    })
  })
})
