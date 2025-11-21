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
  progress: number // Task completion progress in percentage (0-100)
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
  numberOfProfiles: number // How many profiles of this resource type work on this task (1 to project max)
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
  icon: string // Icon identifier (e.g., 'flag', 'star', 'rocket', 'target')
  color: string // Hex color for milestone marker, default: '#9333ea'
  createdAt: string
  updatedAt: string
}

export interface ProgressSnapshot {
  id: string
  taskId: string
  projectId: string
  date: string // ISO date string (YYYY-MM-DD) for the snapshot date
  remainingEstimate: number // Person-days remaining at this point in time
  status: TaskStatus // Task status at this point in time
  progress: number // Task progress percentage at this point in time (0-100)
  notes?: string // Optional notes about progress or blockers
  focusFactors?: Record<string, number> // resourceId -> focusFactor at snapshot time (0-100)
  createdAt: string
  updatedAt: string
}

// Velocity metrics for tracking actual progress
export interface VelocityMetrics {
  averageVelocity: number // Average person-days completed per day
  plannedVelocity: number // Expected velocity based on resource allocation
  velocityTrend: 'improving' | 'stable' | 'declining'
  completionDateOptimistic: Date // Based on planned velocity
  completionDateRealistic: Date // Based on actual velocity
  daysAnalyzed: number // Number of days used for velocity calculation
  confidenceLevel: 'high' | 'medium' | 'low' // Based on data points available
}
