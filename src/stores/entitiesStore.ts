import { create } from 'zustand'
import type { Project, Resource, Configuration } from '../types/entities.types'
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
  updateConfiguration,
  deleteConfiguration,
  assignResourceToProject,
  removeResourceFromProject,
  getProjectResources,
  assignConfigurationToProject,
  removeConfigurationFromProject,
  getProjectConfigurations,
} from '../services/database'

interface EntitiesState {
  // State
  projects: Project[]
  resources: Resource[]
  configurations: Configuration[]
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

  // Relationship actions
  assignResourceToProject: (projectId: string, resourceId: string, numberOfResources?: number, focusFactor?: number) => void
  removeResourceFromProject: (projectId: string, resourceId: string) => void
  getProjectResources: (projectId: string) => (Resource & { numberOfResources: number; focusFactor: number })[]
  assignConfigurationToProject: (projectId: string, configurationId: string) => void
  removeConfigurationFromProject: (projectId: string, configurationId: string) => void
  getProjectConfigurations: (projectId: string) => Configuration[]
}

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  // Initial state
  projects: [],
  resources: [],
  configurations: [],
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
    createProject(project)
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
}))
