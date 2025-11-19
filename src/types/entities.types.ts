export type ProjectStatus = 'Active' | 'Archived'

export interface Project {
  id: string
  title: string
  description: string
  status: ProjectStatus
  startDate?: string // ISO date string for project start date (optional)
  createdAt: string
  updatedAt: string
}

export interface Resource {
  id: string
  title: string // e.g., 'PHP', 'TypeScript', 'ReactJS', 'iOS', etc.
  description: string
  defaultVelocity: number // Focus factor in percentage (0-100)
  icon: string // Icon ID from resource icons library, default: 'generic'
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
  numberOfResources: number
  focusFactor: number
  assignedAt: string
}

export interface ProjectConfiguration {
  projectId: string
  configurationId: string
  appliedAt: string
}

export type TaskStatus = 'Todo' | 'In Progress' | 'Done'

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  status: TaskStatus
  color: string // Hex color for the task, default: '#6366f1'
  startDate?: string // ISO date string for task start date (optional)
  endDate?: string // ISO date string for task end date (optional)
  createdAt: string
  updatedAt: string
}

export interface TaskResource {
  taskId: string
  resourceId: string
  estimatedDays: number // Man-days estimate
  focusFactor: number // Task-specific focus factor (0-100)
  assignedAt: string
}

export interface TaskDependency {
  taskId: string // The task that has dependencies
  dependsOnTaskId: string // The task that must be completed first
  createdAt: string
}

export interface Milestone {
  id: string
  projectId: string
  title: string
  date: string // ISO date string for milestone date
  createdAt: string
  updatedAt: string
}
