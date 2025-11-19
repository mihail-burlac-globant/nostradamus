export type ProjectStatus = 'Active' | 'Archived'

export interface Project {
  id: string
  title: string
  description: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export interface Resource {
  id: string
  title: string // e.g., 'PHP', 'TypeScript', 'ReactJS', 'iOS', etc.
  description: string
  defaultVelocity: number // Focus factor in percentage (0-100)
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export interface Configuration {
  id: string
  name: string
  key: string
  value: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectResource {
  projectId: string
  resourceId: string
  assignedAt: string
}

export interface ProjectConfiguration {
  projectId: string
  configurationId: string
  appliedAt: string
}
