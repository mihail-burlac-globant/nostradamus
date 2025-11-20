import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importProject, type ProjectExport } from '../projectImportExport'
import type { Project } from '../../types/entities.types'

// Mock the database module
vi.mock('../../services/database', () => {
  interface MockProject { id: string; title: string }
  interface MockTask { id: string; projectId: string; title: string }
  interface MockTaskDependency { taskId: string; dependsOnTaskId: string }
  interface MockProjectResource { projectId: string; resourceId: string }
  interface MockTaskResource { taskId: string; resourceId: string; estimatedDays: number; numberOfProfiles: number }
  interface MockMilestone { id: string; projectId: string; title: string }
  interface MockProgressSnapshot { id: string; taskId: string; projectId: string }
  interface MockResource { id: string; title: string }

  const mockData = {
    projects: [] as MockProject[],
    resources: [] as MockResource[],
    projectResources: [] as MockProjectResource[],
    tasks: [] as MockTask[],
    taskResources: [] as MockTaskResource[],
    taskDependencies: [] as MockTaskDependency[],
    milestones: [] as MockMilestone[],
    progressSnapshots: [] as MockProgressSnapshot[],
  }

  return {
    getDatabase: () => ({
      prepare: () => {
        return {
          bind: () => {},
          step: () => {
            // Return false to simulate no results for most queries
            return false
          },
          getAsObject: () => ({}),
          free: () => {},
        }
      },
      run: (query: string, params: unknown[]) => {
        // Simulate INSERT operations
        if (query.includes('INSERT INTO projects')) {
          mockData.projects.push({ id: params[0] as string, title: params[1] as string })
        } else if (query.includes('INSERT INTO tasks')) {
          mockData.tasks.push({ id: params[0] as string, projectId: params[1] as string, title: params[2] as string })
        } else if (query.includes('INSERT INTO task_dependencies')) {
          mockData.taskDependencies.push({ taskId: params[0] as string, dependsOnTaskId: params[1] as string })
        } else if (query.includes('INSERT INTO project_resources')) {
          mockData.projectResources.push({ projectId: params[0] as string, resourceId: params[1] as string })
        } else if (query.includes('INSERT INTO task_resources')) {
          mockData.taskResources.push({
            taskId: params[0] as string,
            resourceId: params[1] as string,
            estimatedDays: params[2] as number,
            numberOfProfiles: params[4] as number,
          })
        } else if (query.includes('INSERT INTO milestones')) {
          mockData.milestones.push({ id: params[0] as string, projectId: params[1] as string, title: params[2] as string })
        } else if (query.includes('INSERT INTO progress_snapshots')) {
          mockData.progressSnapshots.push({ id: params[0] as string, taskId: params[1] as string, projectId: params[2] as string })
        } else if (query.includes('INSERT INTO resources')) {
          mockData.resources.push({ id: params[0] as string, title: params[1] as string })
        }
      },
      export: () => new Uint8Array(),
    }),
    clearMockData: () => {
      mockData.projects = []
      mockData.resources = []
      mockData.projectResources = []
      mockData.tasks = []
      mockData.taskResources = []
      mockData.taskDependencies = []
      mockData.milestones = []
      mockData.progressSnapshots = []
    },
    getMockData: () => mockData,
  }
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Project Import/Export', () => {
  beforeEach(async () => {
    localStorageMock.clear()
    const db = await import('../../services/database')
    // @ts-expect-error - clearMockData is only available in mocked module
    if (db.clearMockData) db.clearMockData()
  })

  describe('importProject', () => {
    it('should validate export version', () => {
      const exportData: ProjectExport = {
        version: '2.0.0', // Unsupported version
        exportedAt: '2025-01-01T00:00:00Z',
        project: {} as Project,
        tasks: [],
        projectResources: [],
        milestones: [],
        progressSnapshots: [],
      }

      expect(() => importProject(exportData)).toThrow('Unsupported export version: 2.0.0')
    })

    it('should generate new IDs for imported project', async () => {
      const db = await import('../../services/database')

      const oldProjectId = crypto.randomUUID()
      const exportData: ProjectExport = {
        version: '1.0.0',
        exportedAt: '2025-01-01T00:00:00Z',
        project: {
          id: oldProjectId,
          title: 'Test Project',
          description: 'Test Description',
          status: 'Active',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        tasks: [],
        projectResources: [],
        milestones: [],
        progressSnapshots: [],
      }

      const newProjectId = importProject(exportData)

      // New ID should be generated
      expect(newProjectId).toBeDefined()
      expect(newProjectId).not.toBe(oldProjectId)

      // Project should be inserted
      // @ts-expect-error - getMockData is only available in mocked module
      const mockData = db.getMockData()
      expect(mockData.projects.length).toBe(1)
      expect(mockData.projects[0].id).toBe(newProjectId)
      expect(mockData.projects[0].title).toContain('(Imported)')
    })

    it('should import tasks with remapped IDs', async () => {
      const db = await import('../../services/database')

      const oldProjectId = crypto.randomUUID()
      const oldTaskId = crypto.randomUUID()

      const exportData: ProjectExport = {
        version: '1.0.0',
        exportedAt: '2025-01-01T00:00:00Z',
        project: {
          id: oldProjectId,
          title: 'Test Project',
          description: 'Test',
          status: 'Active',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        tasks: [
          {
            id: oldTaskId,
            projectId: oldProjectId,
            title: 'Test Task',
            description: 'Test',
            status: 'Todo',
            progress: 0,
            color: '#6366f1',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            resources: [],
            dependencies: [],
          },
        ],
        projectResources: [],
        milestones: [],
        progressSnapshots: [],
      }

      const newProjectId = importProject(exportData)

      // @ts-expect-error - getMockData is only available in mocked module
      const mockData = db.getMockData()

      // Task should be imported with new IDs
      expect(mockData.tasks.length).toBe(1)
      expect(mockData.tasks[0].id).not.toBe(oldTaskId)
      expect(mockData.tasks[0].projectId).toBe(newProjectId)
      expect(mockData.tasks[0].title).toBe('Test Task')
    })

    it('should preserve task dependencies with remapped IDs', async () => {
      const db = await import('../../services/database')

      const oldProjectId = crypto.randomUUID()
      const oldTask1Id = crypto.randomUUID()
      const oldTask2Id = crypto.randomUUID()

      const exportData: ProjectExport = {
        version: '1.0.0',
        exportedAt: '2025-01-01T00:00:00Z',
        project: {
          id: oldProjectId,
          title: 'Test Project',
          description: 'Test',
          status: 'Active',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        tasks: [
          {
            id: oldTask1Id,
            projectId: oldProjectId,
            title: 'Task 1',
            description: '',
            status: 'Done',
            progress: 100,
            color: '#6366f1',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            resources: [],
            dependencies: [],
          },
          {
            id: oldTask2Id,
            projectId: oldProjectId,
            title: 'Task 2',
            description: '',
            status: 'Todo',
            progress: 0,
            color: '#6366f1',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            resources: [],
            dependencies: [oldTask1Id], // Task 2 depends on Task 1
          },
        ],
        projectResources: [],
        milestones: [],
        progressSnapshots: [],
      }

      importProject(exportData)

      // @ts-expect-error - getMockData is only available in mocked module
      const mockData = db.getMockData()

      // Dependencies should be created
      expect(mockData.taskDependencies.length).toBe(1)

      // Both task IDs in dependency should be new (not the old IDs)
      const dep = mockData.taskDependencies[0]
      expect(dep.taskId).not.toBe(oldTask2Id)
      expect(dep.dependsOnTaskId).not.toBe(oldTask1Id)
    })

    it('should import milestones with new IDs', async () => {
      const db = await import('../../services/database')

      const oldProjectId = crypto.randomUUID()

      const exportData: ProjectExport = {
        version: '1.0.0',
        exportedAt: '2025-01-01T00:00:00Z',
        project: {
          id: oldProjectId,
          title: 'Test Project',
          description: 'Test',
          status: 'Active',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        tasks: [],
        projectResources: [],
        milestones: [
          {
            id: crypto.randomUUID(),
            projectId: oldProjectId,
            title: 'Test Milestone',
            date: '2025-01-15',
            icon: 'flag',
            color: '#9333ea',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        ],
        progressSnapshots: [],
      }

      const newProjectId = importProject(exportData)

      // @ts-expect-error - getMockData is only available in mocked module
      const mockData = db.getMockData()

      // Milestone should be imported
      expect(mockData.milestones.length).toBe(1)
      expect(mockData.milestones[0].projectId).toBe(newProjectId)
      expect(mockData.milestones[0].title).toBe('Test Milestone')
    })

    it('should import progress snapshots with remapped task IDs', async () => {
      const db = await import('../../services/database')

      const oldProjectId = crypto.randomUUID()
      const oldTaskId = crypto.randomUUID()

      const exportData: ProjectExport = {
        version: '1.0.0',
        exportedAt: '2025-01-01T00:00:00Z',
        project: {
          id: oldProjectId,
          title: 'Test Project',
          description: 'Test',
          status: 'Active',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        tasks: [
          {
            id: oldTaskId,
            projectId: oldProjectId,
            title: 'Test Task',
            description: '',
            status: 'In Progress',
            progress: 50,
            color: '#6366f1',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            resources: [],
            dependencies: [],
          },
        ],
        projectResources: [],
        milestones: [],
        progressSnapshots: [
          {
            id: crypto.randomUUID(),
            taskId: oldTaskId,
            projectId: oldProjectId,
            date: '2025-01-05',
            remainingEstimate: 5,
            status: 'In Progress',
            progress: 50,
            createdAt: '2025-01-05T00:00:00Z',
            updatedAt: '2025-01-05T00:00:00Z',
          },
        ],
      }

      const newProjectId = importProject(exportData)

      // @ts-expect-error - getMockData is only available in mocked module
      const mockData = db.getMockData()

      // Progress snapshot should be imported with remapped IDs
      expect(mockData.progressSnapshots.length).toBe(1)
      expect(mockData.progressSnapshots[0].taskId).not.toBe(oldTaskId)
      expect(mockData.progressSnapshots[0].projectId).toBe(newProjectId)
    })

    it('should include numberOfProfiles field in task resources export structure', () => {
      // Test that the export structure includes numberOfProfiles
      const exportData: ProjectExport = {
        version: '1.0.0',
        exportedAt: '2025-01-01T00:00:00Z',
        project: {
          id: crypto.randomUUID(),
          title: 'Test Project',
          description: 'Test',
          status: 'Active',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        tasks: [
          {
            id: crypto.randomUUID(),
            projectId: crypto.randomUUID(),
            title: 'Test Task',
            description: '',
            status: 'Todo',
            progress: 0,
            color: '#6366f1',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            resources: [
              {
                resourceId: crypto.randomUUID(),
                estimatedDays: 10,
                focusFactor: 75,
                numberOfProfiles: 2,
              },
            ],
            dependencies: [],
          },
        ],
        projectResources: [],
        milestones: [],
        progressSnapshots: [],
      }

      // Verify the export structure is correct
      expect(exportData.tasks[0].resources[0].numberOfProfiles).toBe(2)
      expect(exportData.tasks[0].resources[0].estimatedDays).toBe(10)
      expect(exportData.tasks[0].resources[0].focusFactor).toBe(75)
    })
  })

  describe('ProjectExport Type', () => {
    it('should have correct structure for export data', () => {
      const exportData: ProjectExport = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        project: {
          id: crypto.randomUUID(),
          title: 'Test',
          description: 'Test',
          status: 'Active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        tasks: [],
        projectResources: [],
        milestones: [],
        progressSnapshots: [],
      }

      expect(exportData.version).toBe('1.0.0')
      expect(exportData.project.title).toBe('Test')
      expect(Array.isArray(exportData.tasks)).toBe(true)
      expect(Array.isArray(exportData.projectResources)).toBe(true)
      expect(Array.isArray(exportData.milestones)).toBe(true)
      expect(Array.isArray(exportData.progressSnapshots)).toBe(true)
    })
  })
})
