import { create } from 'zustand'
import type { Project, Resource, Configuration, Task, Milestone, ProgressSnapshot } from '../types/entities.types'
import {
  initDatabase,
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  createResource,
  getResources,
  updateResource,
  deleteResource,
  createConfiguration,
  getConfigurations,
  getConfigurationByKey,
  updateConfiguration,
  deleteConfiguration,
  assignResourceToProject,
  removeResourceFromProject,
  getProjectResources,
  assignConfigurationToProject,
  removeConfigurationFromProject,
  getProjectConfigurations,
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  assignResourceToTask,
  removeResourceFromTask,
  getTaskResources,
  addTaskDependency,
  removeTaskDependency,
  getTaskDependencies,
  getTaskDependents,
  canTaskBeStarted,
  createMilestone,
  getMilestones,
  getMilestonesByProject,
  updateMilestone,
  deleteMilestone,
  createProgressSnapshot,
  getProgressSnapshots,
  updateProgressSnapshot,
  deleteProgressSnapshot,
  deleteProgressSnapshotsForTask,
} from '../services/database'

interface EntitiesState {
  // State
  projects: Project[]
  resources: Resource[]
  configurations: Configuration[]
  tasks: Task[]
  milestones: Milestone[]
  progressSnapshots: ProgressSnapshot[]
  isInitialized: boolean
  isLoading: boolean

  // Actions
  initialize: () => Promise<void>

  // Project actions
  loadProjects: (status?: 'Active' | 'Archived') => void
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void
  editProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => void
  removeProject: (id: string) => void
  archiveProject: (id: string) => void
  unarchiveProject: (id: string) => void

  // Resource actions
  loadResources: () => void
  addResource: (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => void
  editResource: (id: string, updates: Partial<Omit<Resource, 'id' | 'createdAt'>>) => void
  removeResource: (id: string) => void

  // Configuration actions
  loadConfigurations: () => void
  addConfiguration: (config: Omit<Configuration, 'id' | 'createdAt' | 'updatedAt'>) => void
  editConfiguration: (id: string, updates: Partial<Omit<Configuration, 'id' | 'createdAt'>>) => void
  removeConfiguration: (id: string) => void

  // Task actions
  loadTasks: (projectId?: string) => void
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task
  editTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  removeTask: (id: string) => void

  // Relationship actions
  assignResourceToProject: (projectId: string, resourceId: string, numberOfResources?: number, focusFactor?: number) => void
  removeResourceFromProject: (projectId: string, resourceId: string) => void
  getProjectResources: (projectId: string) => (Resource & { numberOfResources: number; focusFactor: number })[]
  assignConfigurationToProject: (projectId: string, configurationId: string) => void
  removeConfigurationFromProject: (projectId: string, configurationId: string) => void
  getProjectConfigurations: (projectId: string) => Configuration[]
  assignResourceToTask: (taskId: string, resourceId: string, estimatedDays: number, focusFactor?: number, numberOfProfiles?: number) => void
  removeResourceFromTask: (taskId: string, resourceId: string) => void
  getTaskResources: (taskId: string) => (Resource & { estimatedDays: number; focusFactor: number; numberOfProfiles: number })[]

  // Task dependency actions
  addTaskDependency: (taskId: string, dependsOnTaskId: string) => void
  removeTaskDependency: (taskId: string, dependsOnTaskId: string) => void
  getTaskDependencies: (taskId: string) => Task[]
  getTaskDependents: (taskId: string) => Task[]
  canTaskBeStarted: (taskId: string) => boolean

  // Milestone actions
  loadMilestones: (projectId?: string) => void
  addMilestone: (milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => void
  editMilestone: (id: string, updates: Partial<Omit<Milestone, 'id' | 'createdAt'>>) => void
  removeMilestone: (id: string) => void

  // Progress Snapshot actions
  loadProgressSnapshots: (filters?: { taskId?: string; projectId?: string; startDate?: string; endDate?: string }) => void
  addProgressSnapshot: (snapshot: Omit<ProgressSnapshot, 'id' | 'createdAt' | 'updatedAt'>) => ProgressSnapshot
  editProgressSnapshot: (id: string, updates: Partial<Omit<ProgressSnapshot, 'id' | 'taskId' | 'projectId' | 'date' | 'createdAt' | 'updatedAt'>>) => void
  removeProgressSnapshot: (id: string) => void
  removeProgressSnapshotsForTask: (taskId: string) => void
}

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  // Initial state
  projects: [],
  resources: [],
  configurations: [],
  tasks: [],
  milestones: [],
  progressSnapshots: [],
  isInitialized: false,
  isLoading: false,

  // Initialize database
  initialize: async () => {
    if (get().isInitialized) return

    set({ isLoading: true })
    try {
      await initDatabase()
      get().loadProjects()
      get().loadResources()
      get().loadConfigurations()
      get().loadTasks()
      set({ isInitialized: true })
    } catch (error) {
      console.error('Failed to initialize database:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // Project actions
  loadProjects: (status?: 'Active' | 'Archived') => {
    const projects = getProjects(status)
    set({ projects })
  },

  addProject: (project) => {
    const newProject = createProject(project)

    // Auto-assign default configuration to new projects
    const defaultConfig = getConfigurationByKey('default_config')
    if (defaultConfig) {
      assignConfigurationToProject(newProject.id, defaultConfig.id)
    }

    get().loadProjects()
  },

  editProject: (id, updates) => {
    updateProject(id, updates)
    get().loadProjects()
  },

  removeProject: (id) => {
    deleteProject(id)
    get().loadProjects()
  },

  archiveProject: (id) => {
    updateProject(id, { status: 'Archived' })
    get().loadProjects()
  },

  unarchiveProject: (id) => {
    updateProject(id, { status: 'Active' })
    get().loadProjects()
  },

  // Resource actions
  loadResources: () => {
    const resources = getResources()
    set({ resources })
  },

  addResource: (resource) => {
    createResource(resource)
    get().loadResources()
  },

  editResource: (id, updates) => {
    updateResource(id, updates)
    get().loadResources()
  },

  removeResource: (id) => {
    deleteResource(id)
    get().loadResources()
  },

  // Configuration actions
  loadConfigurations: () => {
    const configurations = getConfigurations()
    set({ configurations })
  },

  addConfiguration: (config) => {
    createConfiguration(config)
    get().loadConfigurations()
  },

  editConfiguration: (id, updates) => {
    updateConfiguration(id, updates)
    get().loadConfigurations()
  },

  removeConfiguration: (id) => {
    deleteConfiguration(id)
    get().loadConfigurations()
  },

  // Task actions
  loadTasks: (projectId?: string) => {
    const tasks = getTasks(projectId)
    set({ tasks })
  },

  addTask: (task) => {
    const newTask = createTask(task)
    get().loadTasks()
    return newTask
  },

  editTask: (id, updates) => {
    updateTask(id, updates)
    get().loadTasks()
  },

  removeTask: (id) => {
    deleteTask(id)
    get().loadTasks()
  },

  // Relationship actions
  assignResourceToProject: (projectId, resourceId, numberOfResources, focusFactor) => {
    assignResourceToProject(projectId, resourceId, numberOfResources, focusFactor)
  },

  removeResourceFromProject: (projectId, resourceId) => {
    removeResourceFromProject(projectId, resourceId)
  },

  getProjectResources: (projectId) => {
    return getProjectResources(projectId)
  },

  assignConfigurationToProject: (projectId, configurationId) => {
    assignConfigurationToProject(projectId, configurationId)
  },

  removeConfigurationFromProject: (projectId, configurationId) => {
    removeConfigurationFromProject(projectId, configurationId)
  },

  getProjectConfigurations: (projectId) => {
    return getProjectConfigurations(projectId)
  },

  assignResourceToTask: (taskId, resourceId, estimatedDays, focusFactor, numberOfProfiles) => {
    assignResourceToTask(taskId, resourceId, estimatedDays, focusFactor, numberOfProfiles)
  },

  removeResourceFromTask: (taskId, resourceId) => {
    removeResourceFromTask(taskId, resourceId)
  },

  getTaskResources: (taskId) => {
    return getTaskResources(taskId)
  },

  // Task dependency actions
  addTaskDependency: (taskId, dependsOnTaskId) => {
    addTaskDependency(taskId, dependsOnTaskId)
  },

  removeTaskDependency: (taskId, dependsOnTaskId) => {
    removeTaskDependency(taskId, dependsOnTaskId)
  },

  getTaskDependencies: (taskId) => {
    return getTaskDependencies(taskId)
  },

  getTaskDependents: (taskId) => {
    return getTaskDependents(taskId)
  },

  canTaskBeStarted: (taskId) => {
    return canTaskBeStarted(taskId)
  },

  // Milestone actions
  loadMilestones: (projectId) => {
    const milestones = projectId ? getMilestonesByProject(projectId) : getMilestones()
    set({ milestones })
  },

  addMilestone: (milestone) => {
    createMilestone(milestone)
    const milestones = getMilestones()
    set({ milestones })
  },

  editMilestone: (id, updates) => {
    updateMilestone(id, updates)
    const milestones = getMilestones()
    set({ milestones })
  },

  removeMilestone: (id) => {
    deleteMilestone(id)
    const milestones = getMilestones()
    set({ milestones })
  },

  // Progress Snapshot actions
  loadProgressSnapshots: (filters) => {
    const progressSnapshots = getProgressSnapshots(filters)
    set({ progressSnapshots })
  },

  addProgressSnapshot: (snapshot) => {
    const newSnapshot = createProgressSnapshot(snapshot)
    const progressSnapshots = getProgressSnapshots()
    set({ progressSnapshots })
    return newSnapshot
  },

  editProgressSnapshot: (id, updates) => {
    updateProgressSnapshot(id, updates)
    const progressSnapshots = getProgressSnapshots()
    set({ progressSnapshots })
  },

  removeProgressSnapshot: (id) => {
    deleteProgressSnapshot(id)
    const progressSnapshots = getProgressSnapshots()
    set({ progressSnapshots })
  },

  removeProgressSnapshotsForTask: (taskId) => {
    deleteProgressSnapshotsForTask(taskId)
    const progressSnapshots = getProgressSnapshots()
    set({ progressSnapshots })
  },
}))
