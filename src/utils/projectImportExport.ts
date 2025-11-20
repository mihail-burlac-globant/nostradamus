import type { Project, Task, Milestone, ProgressSnapshot } from '../types/entities.types'
import { getDatabase, saveDatabase } from '../services/database'

export interface ProjectExport {
  version: string
  exportedAt: string
  project: Project
  tasks: Array<Task & {
    resources: Array<{
      resourceId: string
      estimatedDays: number
      focusFactor: number
      numberOfProfiles: number
    }>
    dependencies: string[]
  }>
  projectResources: Array<{
    resourceId: string
    resourceTitle: string
    numberOfResources: number
    focusFactor: number
  }>
  milestones: Milestone[]
  progressSnapshots: ProgressSnapshot[]
}

/**
 * Export a complete project with all its data
 */
export const exportProject = (projectId: string): ProjectExport => {
  const database = getDatabase()

  // Get project
  const projectStmt = database.prepare('SELECT * FROM projects WHERE id = ?')
  projectStmt.bind([projectId])
  projectStmt.step()
  const project = projectStmt.getAsObject() as unknown as Project
  projectStmt.free()

  if (!project || !project.id) {
    throw new Error(`Project with id ${projectId} not found`)
  }

  // Get tasks
  const tasksStmt = database.prepare('SELECT * FROM tasks WHERE projectId = ? ORDER BY createdAt')
  tasksStmt.bind([projectId])
  const tasks: Array<Task & { resources: Array<{ resourceId: string; estimatedDays: number; focusFactor: number; numberOfProfiles: number }>; dependencies: string[] }> = []

  while (tasksStmt.step()) {
    const task = tasksStmt.getAsObject() as unknown as Task

    // Get task resources
    const resourcesStmt = database.prepare(`
      SELECT resourceId, estimatedDays, focusFactor, numberOfProfiles
      FROM task_resources
      WHERE taskId = ?
    `)
    resourcesStmt.bind([task.id])
    const resources: Array<{ resourceId: string; estimatedDays: number; focusFactor: number; numberOfProfiles: number }> = []

    while (resourcesStmt.step()) {
      resources.push(resourcesStmt.getAsObject() as { resourceId: string; estimatedDays: number; focusFactor: number; numberOfProfiles: number })
    }
    resourcesStmt.free()

    // Get task dependencies
    const depsStmt = database.prepare('SELECT dependsOnTaskId FROM task_dependencies WHERE taskId = ?')
    depsStmt.bind([task.id])
    const dependencies: string[] = []

    while (depsStmt.step()) {
      const dep = depsStmt.getAsObject() as { dependsOnTaskId: string }
      dependencies.push(dep.dependsOnTaskId)
    }
    depsStmt.free()

    tasks.push({ ...task, resources, dependencies })
  }
  tasksStmt.free()

  // Get project resources with resource details
  const projectResourcesStmt = database.prepare(`
    SELECT pr.resourceId, r.title as resourceTitle, pr.numberOfResources, pr.focusFactor
    FROM project_resources pr
    INNER JOIN resources r ON pr.resourceId = r.id
    WHERE pr.projectId = ?
  `)
  projectResourcesStmt.bind([projectId])
  const projectResources: Array<{ resourceId: string; resourceTitle: string; numberOfResources: number; focusFactor: number }> = []

  while (projectResourcesStmt.step()) {
    projectResources.push(projectResourcesStmt.getAsObject() as { resourceId: string; resourceTitle: string; numberOfResources: number; focusFactor: number })
  }
  projectResourcesStmt.free()

  // Get milestones
  const milestonesStmt = database.prepare('SELECT * FROM milestones WHERE projectId = ? ORDER BY date')
  milestonesStmt.bind([projectId])
  const milestones: Milestone[] = []

  while (milestonesStmt.step()) {
    milestones.push(milestonesStmt.getAsObject() as unknown as Milestone)
  }
  milestonesStmt.free()

  // Get progress snapshots
  const snapshotsStmt = database.prepare('SELECT * FROM progress_snapshots WHERE projectId = ? ORDER BY date, createdAt')
  snapshotsStmt.bind([projectId])
  const progressSnapshots: ProgressSnapshot[] = []

  while (snapshotsStmt.step()) {
    progressSnapshots.push(snapshotsStmt.getAsObject() as unknown as ProgressSnapshot)
  }
  snapshotsStmt.free()

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project,
    tasks,
    projectResources,
    milestones,
    progressSnapshots,
  }
}

/**
 * Import a project from exported data
 * Returns the new project ID
 */
export const importProject = (data: ProjectExport): string => {
  const database = getDatabase()

  // Validate the data structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid import file: The file does not contain valid project data')
  }

  if (!data.version) {
    throw new Error('Invalid import file: Missing version field. This file may not be a valid Nostradamus project export.')
  }

  // Validate version
  if (data.version !== '1.0.0') {
    throw new Error(`Unsupported export version: ${data.version}. This application supports version 1.0.0.`)
  }

  // Validate required fields
  if (!data.project) {
    throw new Error('Invalid import file: Missing project data')
  }

  if (!Array.isArray(data.tasks)) {
    throw new Error('Invalid import file: Missing or invalid tasks data')
  }

  // Generate new IDs for all entities
  const newProjectId = crypto.randomUUID()
  const taskIdMap = new Map<string, string>() // old ID -> new ID
  const resourceIdMap = new Map<string, string>() // old resource ID -> new resource ID

  // Import project
  const now = new Date().toISOString()
  database.run(
    `INSERT INTO projects (id, title, description, status, startDate, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      newProjectId,
      `${data.project.title} (Imported)`,
      data.project.description,
      data.project.status,
      data.project.startDate || null,
      now,
      now,
    ]
  )

  // Import or link project resources
  for (const pr of data.projectResources) {
    // Check if resource already exists by title
    const existingResourceStmt = database.prepare('SELECT id FROM resources WHERE title = ?')
    existingResourceStmt.bind([pr.resourceTitle])

    let resourceId = pr.resourceId
    if (existingResourceStmt.step()) {
      const existing = existingResourceStmt.getAsObject() as { id: string }
      resourceId = existing.id
    } else {
      // Resource doesn't exist, we'll need to use the old ID or create a warning
      // For now, we'll skip resources that don't exist
      existingResourceStmt.free()
      continue
    }
    existingResourceStmt.free()

    resourceIdMap.set(pr.resourceId, resourceId)

    // Add resource to project
    database.run(
      `INSERT INTO project_resources (projectId, resourceId, numberOfResources, focusFactor, assignedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [newProjectId, resourceId, pr.numberOfResources, pr.focusFactor, now]
    )
  }

  // Import tasks
  for (const task of data.tasks) {
    const newTaskId = crypto.randomUUID()
    taskIdMap.set(task.id, newTaskId)

    database.run(
      `INSERT INTO tasks (id, projectId, title, description, status, progress, color, startDate, endDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newTaskId,
        newProjectId,
        task.title,
        task.description,
        task.status,
        task.progress,
        task.color,
        task.startDate || null,
        task.endDate || null,
        now,
        now,
      ]
    )

    // Import task resources
    for (const resource of task.resources) {
      const mappedResourceId = resourceIdMap.get(resource.resourceId)
      if (mappedResourceId) {
        database.run(
          `INSERT INTO task_resources (taskId, resourceId, estimatedDays, focusFactor, numberOfProfiles, assignedAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [newTaskId, mappedResourceId, resource.estimatedDays, resource.focusFactor, resource.numberOfProfiles, now]
        )
      }
    }
  }

  // Import task dependencies (after all tasks are created)
  for (const task of data.tasks) {
    const newTaskId = taskIdMap.get(task.id)
    if (!newTaskId) continue

    for (const oldDepId of task.dependencies) {
      const newDepId = taskIdMap.get(oldDepId)
      if (newDepId) {
        database.run(
          `INSERT INTO task_dependencies (taskId, dependsOnTaskId, createdAt)
           VALUES (?, ?, ?)`,
          [newTaskId, newDepId, now]
        )
      }
    }
  }

  // Import milestones
  for (const milestone of data.milestones) {
    const newMilestoneId = crypto.randomUUID()
    database.run(
      `INSERT INTO milestones (id, projectId, title, date, icon, color, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newMilestoneId,
        newProjectId,
        milestone.title,
        milestone.date,
        milestone.icon,
        milestone.color,
        now,
        now,
      ]
    )
  }

  // Import progress snapshots
  for (const snapshot of data.progressSnapshots) {
    const newTaskId = taskIdMap.get(snapshot.taskId)
    if (!newTaskId) continue

    const newSnapshotId = crypto.randomUUID()
    database.run(
      `INSERT INTO progress_snapshots (id, taskId, projectId, date, remainingEstimate, status, progress, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newSnapshotId,
        newTaskId,
        newProjectId,
        snapshot.date,
        snapshot.remainingEstimate,
        snapshot.status,
        snapshot.progress,
        snapshot.notes || null,
        now,
        now,
      ]
    )
  }

  // Save database
  saveDatabase(database)

  return newProjectId
}

/**
 * Download project export as JSON file
 */
export const downloadProjectExport = (projectId: string, projectTitle: string): void => {
  const exportData = exportProject(projectId)
  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`
  link.click()

  URL.revokeObjectURL(url)
}

/**
 * Upload and import project from JSON file
 */
export const uploadAndImportProject = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content) as ProjectExport
        const newProjectId = importProject(data)
        resolve(newProjectId)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}
