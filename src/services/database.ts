import initSqlJs, { Database } from 'sql.js'
import type { Project, Resource, Configuration } from '../types/entities.types'

let db: Database | null = null

const DB_KEY = 'nostradamus_db'

export const initDatabase = async (): Promise<Database> => {
  if (db) return db

  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  })

  // Try to load existing database from localStorage
  const savedDb = localStorage.getItem(DB_KEY)
  if (savedDb) {
    const uint8Array = new Uint8Array(
      savedDb.split(',').map((x) => parseInt(x, 10))
    )
    db = new SQL.Database(uint8Array)
  } else {
    db = new SQL.Database()
    createTables(db)
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

    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
    CREATE INDEX IF NOT EXISTS idx_project_resources_project ON project_resources(projectId);
    CREATE INDEX IF NOT EXISTS idx_project_configurations_project ON project_configurations(projectId);
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

  database.run(
    'INSERT INTO resources (id, title, description, defaultVelocity, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, resource.title, resource.description, resource.defaultVelocity, resource.status, now, now]
  )

  saveDatabase(database)

  return {
    id,
    ...resource,
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
export const assignConfigurationToProject = (projectId: string, configurationId: string): void => {
  const database = getDatabase()
  const now = new Date().toISOString()

  database.run(
    'INSERT OR REPLACE INTO project_configurations (projectId, configurationId, appliedAt) VALUES (?, ?, ?)',
    [projectId, configurationId, now]
  )

  saveDatabase(database)
}

export const removeConfigurationFromProject = (projectId: string, configurationId: string): void => {
  const database = getDatabase()
  database.run('DELETE FROM project_configurations WHERE projectId = ? AND configurationId = ?', [projectId, configurationId])
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
