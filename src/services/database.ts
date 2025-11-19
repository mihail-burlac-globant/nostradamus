import initSqlJs, { Database } from 'sql.js'
import type { Project, Resource, Configuration, Task } from '../types/entities.types'

let db: Database | null = null

const DB_KEY = 'nostradamus_db'
const DB_VERSION_KEY = 'nostradamus_db_version'
const CURRENT_DB_VERSION = 5 // Incremented for task start/end dates

export const initDatabase = async (): Promise<Database> => {
  if (db) return db

  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  })

  // Check database version
  const savedVersion = localStorage.getItem(DB_VERSION_KEY)
  const savedDb = localStorage.getItem(DB_KEY)

  if (savedDb && savedVersion && parseInt(savedVersion, 10) === CURRENT_DB_VERSION) {
    // Load existing database with matching version
    const uint8Array = new Uint8Array(
      savedDb.split(',').map((x) => parseInt(x, 10))
    )
    db = new SQL.Database(uint8Array)
  } else {
    // Create new database (version mismatch or no database)
    if (savedDb) {
      console.log('Database version mismatch, recreating database...')
    }
    db = new SQL.Database()
    createTables(db)
    localStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION.toString())
  }

  return db
}

const createTables = (database: Database) => {
  database.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Active', 'Archived')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      defaultVelocity REAL NOT NULL CHECK(defaultVelocity >= 0 AND defaultVelocity <= 100),
      icon TEXT NOT NULL DEFAULT 'generic',
      status TEXT NOT NULL CHECK(status IN ('Active', 'Archived')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configurations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_resources (
      projectId TEXT NOT NULL,
      resourceId TEXT NOT NULL,
      numberOfResources INTEGER NOT NULL DEFAULT 1 CHECK(numberOfResources > 0),
      focusFactor REAL NOT NULL DEFAULT 80 CHECK(focusFactor >= 0 AND focusFactor <= 100),
      assignedAt TEXT NOT NULL,
      PRIMARY KEY (projectId, resourceId),
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (resourceId) REFERENCES resources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_configurations (
      projectId TEXT NOT NULL,
      configurationId TEXT NOT NULL,
      appliedAt TEXT NOT NULL,
      PRIMARY KEY (projectId, configurationId),
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (configurationId) REFERENCES configurations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Todo', 'In Progress', 'Done')),
      color TEXT NOT NULL DEFAULT '#6366f1',
      startDate TEXT,
      endDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_resources (
      taskId TEXT NOT NULL,
      resourceId TEXT NOT NULL,
      estimatedDays REAL NOT NULL CHECK(estimatedDays > 0),
      focusFactor REAL NOT NULL DEFAULT 80 CHECK(focusFactor >= 0 AND focusFactor <= 100),
      assignedAt TEXT NOT NULL,
      PRIMARY KEY (taskId, resourceId),
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (resourceId) REFERENCES resources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_dependencies (
      taskId TEXT NOT NULL,
      dependsOnTaskId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (taskId, dependsOnTaskId),
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (dependsOnTaskId) REFERENCES tasks(id) ON DELETE CASCADE,
      CHECK (taskId != dependsOnTaskId)
    );

    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
    CREATE INDEX IF NOT EXISTS idx_project_resources_project ON project_resources(projectId);
    CREATE INDEX IF NOT EXISTS idx_project_configurations_project ON project_configurations(projectId);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(projectId);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_task_resources_task ON task_resources(taskId);
    CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(taskId);
    CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(dependsOnTaskId);
  `)

  saveDatabase(database)
}

export const saveDatabase = (database: Database = db!) => {
  if (!database) return
  const data = database.export()
  const buffer = Array.from(data)
  localStorage.setItem(DB_KEY, buffer.join(','))
}

export const getDatabase = (): Database => {
  if (!db) throw new Error('Database not initialized')
  return db
}

export const clearDatabase = (): void => {
  const database = getDatabase()
  // Delete all data from all tables
  database.run('DELETE FROM task_dependencies')
  database.run('DELETE FROM task_resources')
  database.run('DELETE FROM tasks')
  database.run('DELETE FROM project_configurations')
  database.run('DELETE FROM project_resources')
  database.run('DELETE FROM configurations')
  database.run('DELETE FROM resources')
  database.run('DELETE FROM projects')
  saveDatabase(database)
  console.log('Database cleared successfully')
}

// Project CRUD operations
export const createProject = (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project => {
  const database = getDatabase()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  database.run(
    'INSERT INTO projects (id, title, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    [id, project.title, project.description, project.status, now, now]
  )

  saveDatabase(database)

  return {
    id,
    ...project,
    createdAt: now,
    updatedAt: now,
  }
}

export const getProjects = (status?: 'Active' | 'Archived'): Project[] => {
  const database = getDatabase()
  const query = status
    ? 'SELECT * FROM projects WHERE status = ? ORDER BY updatedAt DESC'
    : 'SELECT * FROM projects ORDER BY updatedAt DESC'

  const stmt = database.prepare(query)
  const results: Project[] = []

  if (status) {
    stmt.bind([status])
  }

  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row as unknown as Project)
  }

  stmt.free()
  return results
}

export const getProjectById = (id: string): Project | null => {
  const database = getDatabase()
  const stmt = database.prepare('SELECT * FROM projects WHERE id = ?')
  stmt.bind([id])

  if (stmt.step()) {
    const project = stmt.getAsObject() as unknown as Project
    stmt.free()
    return project
  }

  stmt.free()
  return null
}

export const updateProject = (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null => {
  const database = getDatabase()
  const project = getProjectById(id)
  if (!project) return null

  const now = new Date().toISOString()
  const fields: string[] = []
  const values: string[] = []

  if (updates.title !== undefined) {
    fields.push('title = ?')
    values.push(updates.title || '')
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    values.push(updates.description || '')
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status || '')
  }

  fields.push('updatedAt = ?')
  values.push(now)
  values.push(id)

  database.run(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
    values
  )

  saveDatabase(database)
  return getProjectById(id)
}

export const deleteProject = (id: string): boolean => {
  const database = getDatabase()
  database.run('DELETE FROM projects WHERE id = ?', [id])
  saveDatabase(database)
  return true
}

// Resource CRUD operations
export const createResource = (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>): Resource => {
  const database = getDatabase()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const icon = resource.icon || 'generic'

  database.run(
    'INSERT INTO resources (id, title, description, defaultVelocity, icon, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, resource.title, resource.description, resource.defaultVelocity, icon, resource.status, now, now]
  )

  saveDatabase(database)

  return {
    id,
    ...resource,
    icon,
    createdAt: now,
    updatedAt: now,
  }
}

export const getResources = (): Resource[] => {
  const database = getDatabase()
  const stmt = database.prepare('SELECT * FROM resources ORDER BY title')
  const results: Resource[] = []

  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row as unknown as Resource)
  }

  stmt.free()
  return results
}

export const getResourceById = (id: string): Resource | null => {
  const database = getDatabase()
  const stmt = database.prepare('SELECT * FROM resources WHERE id = ?')
  stmt.bind([id])

  if (stmt.step()) {
    const resource = stmt.getAsObject() as unknown as Resource
    stmt.free()
    return resource
  }

  stmt.free()
  return null
}

export const updateResource = (id: string, updates: Partial<Omit<Resource, 'id' | 'createdAt'>>): Resource | null => {
  const database = getDatabase()
  const resource = getResourceById(id)
  if (!resource) return null

  const now = new Date().toISOString()
  const fields: string[] = []
  const values: (string | number)[] = []

  if (updates.title !== undefined) {
    fields.push('title = ?')
    values.push(updates.title || '')
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    values.push(updates.description || '')
  }
  if (updates.defaultVelocity !== undefined) {
    fields.push('defaultVelocity = ?')
    values.push(updates.defaultVelocity)
  }
  if (updates.icon !== undefined) {
    fields.push('icon = ?')
    values.push(updates.icon || 'generic')
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status || '')
  }

  fields.push('updatedAt = ?')
  values.push(now)
  values.push(id)

  database.run(
    `UPDATE resources SET ${fields.join(', ')} WHERE id = ?`,
    values
  )

  saveDatabase(database)
  return getResourceById(id)
}

export const deleteResource = (id: string): boolean => {
  const database = getDatabase()
  database.run('DELETE FROM resources WHERE id = ?', [id])
  saveDatabase(database)
  return true
}

// Configuration CRUD operations
export const createConfiguration = (config: Omit<Configuration, 'id' | 'createdAt' | 'updatedAt'>): Configuration => {
  const database = getDatabase()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  database.run(
    'INSERT INTO configurations (id, name, key, value, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, config.name, config.key, config.value, config.description || null, now, now]
  )

  saveDatabase(database)

  return {
    id,
    ...config,
    createdAt: now,
    updatedAt: now,
  }
}

export const getConfigurations = (): Configuration[] => {
  const database = getDatabase()
  const stmt = database.prepare('SELECT * FROM configurations ORDER BY name')
  const results: Configuration[] = []

  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row as unknown as Configuration)
  }

  stmt.free()
  return results
}

export const getConfigurationById = (id: string): Configuration | null => {
  const database = getDatabase()
  const stmt = database.prepare('SELECT * FROM configurations WHERE id = ?')
  stmt.bind([id])

  if (stmt.step()) {
    const config = stmt.getAsObject() as unknown as Configuration
    stmt.free()
    return config
  }

  stmt.free()
  return null
}

export const updateConfiguration = (id: string, updates: Partial<Omit<Configuration, 'id' | 'createdAt'>>): Configuration | null => {
  const database = getDatabase()
  const config = getConfigurationById(id)
  if (!config) return null

  const now = new Date().toISOString()
  const fields: string[] = []
  const values: (string | null)[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name || null)
  }
  if (updates.key !== undefined) {
    fields.push('key = ?')
    values.push(updates.key || null)
  }
  if (updates.value !== undefined) {
    fields.push('value = ?')
    values.push(updates.value || null)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    values.push(updates.description || null)
  }

  fields.push('updatedAt = ?')
  values.push(now)
  values.push(id)

  database.run(
    `UPDATE configurations SET ${fields.join(', ')} WHERE id = ?`,
    values
  )

  saveDatabase(database)
  return getConfigurationById(id)
}

export const deleteConfiguration = (id: string): boolean => {
  const database = getDatabase()
  database.run('DELETE FROM configurations WHERE id = ?', [id])
  saveDatabase(database)
  return true
}

// Task CRUD operations
export const createTask = (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task => {
  const database = getDatabase()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const color = task.color || '#6366f1'

  database.run(
    'INSERT INTO tasks (id, projectId, title, description, status, color, startDate, endDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, task.projectId, task.title, task.description, task.status, color, task.startDate || null, task.endDate || null, now, now]
  )

  saveDatabase(database)

  return {
    id,
    ...task,
    color,
    createdAt: now,
    updatedAt: now,
  }
}

export const getTasks = (projectId?: string): Task[] => {
  const database = getDatabase()
  const query = projectId
    ? 'SELECT * FROM tasks WHERE projectId = ? ORDER BY updatedAt DESC'
    : 'SELECT * FROM tasks ORDER BY updatedAt DESC'

  const stmt = database.prepare(query)
  const results: Task[] = []

  if (projectId) {
    stmt.bind([projectId])
  }

  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row as unknown as Task)
  }

  stmt.free()
  return results
}

export const getTaskById = (id: string): Task | null => {
  const database = getDatabase()
  const stmt = database.prepare('SELECT * FROM tasks WHERE id = ?')
  stmt.bind([id])

  if (stmt.step()) {
    const task = stmt.getAsObject() as unknown as Task
    stmt.free()
    return task
  }

  stmt.free()
  return null
}

export const updateTask = (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null => {
  const database = getDatabase()
  const task = getTaskById(id)
  if (!task) return null

  const now = new Date().toISOString()
  const fields: string[] = []
  const values: string[] = []

  if (updates.title !== undefined) {
    fields.push('title = ?')
    values.push(updates.title || '')
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    values.push(updates.description || '')
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status || '')
  }
  if (updates.color !== undefined) {
    fields.push('color = ?')
    values.push(updates.color || '#6366f1')
  }
  if (updates.projectId !== undefined) {
    fields.push('projectId = ?')
    values.push(updates.projectId || '')
  }
  if (updates.startDate !== undefined) {
    fields.push('startDate = ?')
    values.push(updates.startDate || '')
  }
  if (updates.endDate !== undefined) {
    fields.push('endDate = ?')
    values.push(updates.endDate || '')
  }

  fields.push('updatedAt = ?')
  values.push(now)
  values.push(id)

  database.run(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
    values
  )

  saveDatabase(database)
  return getTaskById(id)
}

export const deleteTask = (id: string): boolean => {
  const database = getDatabase()
  database.run('DELETE FROM tasks WHERE id = ?', [id])
  saveDatabase(database)
  return true
}

// Project-Resource relationship operations
export const assignResourceToProject = (
  projectId: string,
  resourceId: string,
  numberOfResources: number = 1,
  focusFactor: number = 80
): void => {
  const database = getDatabase()
  const now = new Date().toISOString()

  database.run(
    'INSERT OR REPLACE INTO project_resources (projectId, resourceId, numberOfResources, focusFactor, assignedAt) VALUES (?, ?, ?, ?, ?)',
    [projectId, resourceId, numberOfResources, focusFactor, now]
  )

  saveDatabase(database)
}

export const removeResourceFromProject = (projectId: string, resourceId: string): void => {
  const database = getDatabase()
  database.run('DELETE FROM project_resources WHERE projectId = ? AND resourceId = ?', [projectId, resourceId])
  saveDatabase(database)
}

export const getProjectResources = (projectId: string): (Resource & { numberOfResources: number; focusFactor: number })[] => {
  const database = getDatabase()
  const stmt = database.prepare(`
    SELECT r.*, pr.numberOfResources, pr.focusFactor
    FROM resources r
    INNER JOIN project_resources pr ON r.id = pr.resourceId
    WHERE pr.projectId = ?
    ORDER BY r.title
  `)
  stmt.bind([projectId])

  const results: (Resource & { numberOfResources: number; focusFactor: number })[] = []

  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row as unknown as Resource & { numberOfResources: number; focusFactor: number })
  }

  stmt.free()
  return results
}

// Project-Configuration relationship operations
// NOTE: Only ONE configuration per project is allowed
export const assignConfigurationToProject = (projectId: string, configurationId: string): void => {
  const database = getDatabase()
  const now = new Date().toISOString()

  // Remove any existing configuration for this project (enforce one-config-per-project rule)
  database.run('DELETE FROM project_configurations WHERE projectId = ?', [projectId])

  // Insert the new configuration
  database.run(
    'INSERT INTO project_configurations (projectId, configurationId, appliedAt) VALUES (?, ?, ?)',
    [projectId, configurationId, now]
  )

  saveDatabase(database)
}

export const removeConfigurationFromProject = (projectId: string, _configurationId?: string): void => {
  const database = getDatabase()
  // Since only one config per project, we can just remove by projectId
  // _configurationId parameter kept for backwards compatibility but is optional (unused)
  database.run('DELETE FROM project_configurations WHERE projectId = ?', [projectId])
  saveDatabase(database)
}

export const getProjectConfigurations = (projectId: string): Configuration[] => {
  const database = getDatabase()
  const stmt = database.prepare(`
    SELECT c.*
    FROM configurations c
    INNER JOIN project_configurations pc ON c.id = pc.configurationId
    WHERE pc.projectId = ?
    ORDER BY c.name
  `)
  stmt.bind([projectId])

  const results: Configuration[] = []

  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row as unknown as Configuration)
  }

  stmt.free()
  return results
}

// Task-Resource relationship operations
export const assignResourceToTask = (
  taskId: string,
  resourceId: string,
  estimatedDays: number,
  focusFactor: number = 80
): void => {
  const database = getDatabase()
  const now = new Date().toISOString()

  database.run(
    'INSERT OR REPLACE INTO task_resources (taskId, resourceId, estimatedDays, focusFactor, assignedAt) VALUES (?, ?, ?, ?, ?)',
    [taskId, resourceId, estimatedDays, focusFactor, now]
  )

  saveDatabase(database)
}

export const removeResourceFromTask = (taskId: string, resourceId: string): void => {
  const database = getDatabase()
  database.run('DELETE FROM task_resources WHERE taskId = ? AND resourceId = ?', [taskId, resourceId])
  saveDatabase(database)
}

export const getTaskResources = (taskId: string): (Resource & { estimatedDays: number; focusFactor: number })[] => {
  const database = getDatabase()
  const stmt = database.prepare(`
    SELECT r.*, tr.estimatedDays, tr.focusFactor
    FROM resources r
    INNER JOIN task_resources tr ON r.id = tr.resourceId
    WHERE tr.taskId = ?
    ORDER BY r.title
  `)
  stmt.bind([taskId])

  const results: (Resource & { estimatedDays: number; focusFactor: number })[] = []

  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row as unknown as Resource & { estimatedDays: number; focusFactor: number })
  }

  stmt.free()
  return results
}

// Task Dependency operations
export const addTaskDependency = (taskId: string, dependsOnTaskId: string): void => {
  const database = getDatabase()
  const now = new Date().toISOString()

  // Check if both tasks exist
  const task = getTaskById(taskId)
  const dependsOnTask = getTaskById(dependsOnTaskId)

  if (!task || !dependsOnTask) {
    throw new Error('One or both tasks not found')
  }

  // Check if tasks are in the same project
  if (task.projectId !== dependsOnTask.projectId) {
    throw new Error('Tasks must be in the same project')
  }

  database.run(
    'INSERT OR REPLACE INTO task_dependencies (taskId, dependsOnTaskId, createdAt) VALUES (?, ?, ?)',
    [taskId, dependsOnTaskId, now]
  )

  saveDatabase(database)
}

export const removeTaskDependency = (taskId: string, dependsOnTaskId: string): void => {
  const database = getDatabase()
  database.run('DELETE FROM task_dependencies WHERE taskId = ? AND dependsOnTaskId = ?', [taskId, dependsOnTaskId])
  saveDatabase(database)
}

export const getTaskDependencies = (taskId: string): Task[] => {
  const database = getDatabase()
  const stmt = database.prepare(`
    SELECT t.*
    FROM tasks t
    INNER JOIN task_dependencies td ON t.id = td.dependsOnTaskId
    WHERE td.taskId = ?
    ORDER BY t.title
  `)
  stmt.bind([taskId])

  const results: Task[] = []

  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row as unknown as Task)
  }

  stmt.free()
  return results
}

// Get tasks that depend on this task (reverse dependencies)
export const getTaskDependents = (taskId: string): Task[] => {
  const database = getDatabase()
  const stmt = database.prepare(`
    SELECT t.*
    FROM tasks t
    INNER JOIN task_dependencies td ON t.id = td.taskId
    WHERE td.dependsOnTaskId = ?
    ORDER BY t.title
  `)
  stmt.bind([taskId])

  const results: Task[] = []

  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row as unknown as Task)
  }

  stmt.free()
  return results
}

// Check if a task can be started (all dependencies are done or have 0 remaining estimate)
export const canTaskBeStarted = (taskId: string): boolean => {
  const dependencies = getTaskDependencies(taskId)

  for (const dep of dependencies) {
    if (dep.status !== 'Done') {
      // Check if remaining estimate is 0
      const resources = getTaskResources(dep.id)
      const remainingEstimate = resources.reduce((total, resource) => {
        return total + (resource.estimatedDays * (resource.focusFactor / 100))
      }, 0)

      if (remainingEstimate > 0) {
        return false
      }
    }
  }

  return true
}
