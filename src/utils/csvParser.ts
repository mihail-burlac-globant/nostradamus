import { CSVRow, ProjectData, Task } from '../types/project.types'
import { parse, addDays } from 'date-fns'

export const parseCSVToProjectData = (rows: CSVRow[]): ProjectData => {
  if (rows.length === 0) {
    throw new Error('CSV file is empty')
  }

  // Validate required columns per specification
  const requiredColumns = ['id', 'name', 'status', 'profile_type', 'remaining_estimate_hours']
  const firstRow = rows[0]
  const missingColumns = requiredColumns.filter(
    (col) => !(col in firstRow)
  )

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(', ')}`
    )
  }

  // Validate unique IDs
  const idSet = new Set<string>()
  const duplicateIds: string[] = []
  rows.forEach((row, index) => {
    const id = row.id?.trim()
    if (!id) {
      throw new Error(`Missing required field 'id' in row ${index + 2}`)
    }
    if (idSet.has(id)) {
      duplicateIds.push(id)
    }
    idSet.add(id)
  })

  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate task IDs found: ${[...new Set(duplicateIds)].join(', ')}`)
  }

  // Validate row-level mandatory fields
  rows.forEach((row, index) => {
    const rowNum = index + 2 // +1 for 0-index, +1 for header row

    if (!row.name?.trim()) {
      throw new Error(`Missing required field 'name' in row ${rowNum}`)
    }
    if (!row.status?.trim()) {
      throw new Error(`Missing required field 'status' in row ${rowNum}`)
    }
    if (!row.profile_type?.trim()) {
      throw new Error(`Missing required field 'profile_type' in row ${rowNum}`)
    }
    if (row.remaining_estimate_hours === undefined || row.remaining_estimate_hours === null || row.remaining_estimate_hours === '') {
      throw new Error(`Missing required field 'remaining_estimate_hours' in row ${rowNum}`)
    }

    // Validate status enum - use parseStatus which is lenient
    const parsedStatus = parseStatus(row.status)
    // parseStatus always returns a valid status, so we just use it
    // No additional validation needed here

    // Validate remaining_estimate_hours is non-negative number
    const hours = parseFloat(row.remaining_estimate_hours)
    if (isNaN(hours) || hours < 0) {
      throw new Error(`Invalid number '${row.remaining_estimate_hours}' for 'remaining_estimate_hours' in row ${rowNum}. Must be non-negative number.`)
    }
  })

  // Validate dependency references
  rows.forEach((row, index) => {
    if (row.dependency?.trim()) {
      const depId = row.dependency.trim()
      if (!idSet.has(depId)) {
        throw new Error(`Task '${row.id}' references non-existent dependency '${depId}' in row ${index + 2}`)
      }
    }
  })

  // Detect circular dependencies
  const detectCircularDependency = (taskId: string, visited: Set<string>, path: string[]): void => {
    if (visited.has(taskId)) {
      throw new Error(`Circular dependency detected: ${[...path, taskId].join(' → ')}`)
    }

    visited.add(taskId)
    path.push(taskId)

    const task = rows.find(r => r.id === taskId)
    if (task?.dependency?.trim()) {
      detectCircularDependency(task.dependency.trim(), new Set(visited), [...path])
    }
  }

  rows.forEach(row => {
    if (row.dependency?.trim()) {
      detectCircularDependency(row.id.trim(), new Set(), [])
    }
  })

  // Parse tasks
  const tasks: Task[] = rows.map((row, index) => {
    const id = row.id.trim()
    const name = row.name.trim()

    // Parse dates - now optional per spec
    const startDate = row.startDate ? parseDate(row.startDate) : null
    const endDate = row.endDate ? parseDate(row.endDate) : null

    // Validate date format if provided
    if (row.startDate && !startDate) {
      throw new Error(`Invalid date format '${row.startDate}' in row ${index + 2}. Expected: yyyy-MM-dd`)
    }
    if (row.endDate && !endDate) {
      throw new Error(`Invalid date format '${row.endDate}' in row ${index + 2}. Expected: yyyy-MM-dd`)
    }

    const progress = row.progress ? Math.min(100, Math.max(0, parseFloat(row.progress))) : 0
    const status = parseStatus(row.status)
    const assignee = row.assignee?.trim() || undefined
    const profile_type = row.profile_type.trim()
    const remaining_estimate_hours = parseFloat(row.remaining_estimate_hours)
    const dependency = row.dependency?.trim() || undefined

    return {
      id,
      name,
      startDate: startDate || new Date(), // Temporary - will be resolved
      endDate: endDate || new Date(), // Temporary - will be resolved
      progress,
      status,
      assignee,
      profile_type,
      remaining_estimate_hours,
      dependency,
    }
  })

  // Resolve dependencies and calculate missing dates
  resolveDependencies(tasks)

  // Calculate project dates
  const allDates = tasks.flatMap((task) => [task.startDate, task.endDate])
  const startDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
  const endDate = new Date(Math.max(...allDates.map((d) => d.getTime())))

  // Calculate total planned work in hours (sum of all remaining_estimate_hours)
  const totalPlannedWork = tasks.reduce((sum, task) => {
    return sum + (task.remaining_estimate_hours || 0)
  }, 0)

  return {
    name: 'Project',
    tasks,
    totalPlannedWork,
    startDate,
    endDate,
  }
}

const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null

  // Try ISO format first (YYYY-MM-DD)
  let date = parse(dateString, 'yyyy-MM-dd', new Date())
  if (!isNaN(date.getTime())) return date

  // Try MM/DD/YYYY
  date = parse(dateString, 'MM/dd/yyyy', new Date())
  if (!isNaN(date.getTime())) return date

  // Try DD/MM/YYYY
  date = parse(dateString, 'dd/MM/yyyy', new Date())
  if (!isNaN(date.getTime())) return date

  // Try native Date parsing
  date = new Date(dateString)
  if (!isNaN(date.getTime())) return date

  return null
}

const parseStatus = (
  statusString: string
): 'not-started' | 'in-progress' | 'completed' | 'blocked' => {
  const normalized = statusString.toLowerCase().trim()

  if (normalized.includes('complete')) return 'completed'
  if (normalized.includes('progress') || normalized.includes('active')) return 'in-progress'
  if (normalized.includes('block')) return 'blocked'

  return 'not-started'
}

/**
 * Resolves task dependencies and calculates missing start/end dates
 * Per specification:
 * - If task has dependency, it must start after dependency ends
 * - If startDate not provided, use dependency's endDate or "today"
 * - If endDate not provided, calculate from startDate + remaining_estimate_hours (8h/day)
 */
const resolveDependencies = (tasks: Task[]): void => {
  const taskMap = new Map<string, Task>()
  tasks.forEach(task => taskMap.set(task.id, task))

  const resolved = new Set<string>()

  const resolveTask = (taskId: string): void => {
    if (resolved.has(taskId)) return

    const task = taskMap.get(taskId)
    if (!task) return

    // Resolve dependency first
    if (task.dependency) {
      resolveTask(task.dependency)
      const depTask = taskMap.get(task.dependency)

      if (depTask) {
        // Task must start after dependency ends
        const depEndDate = depTask.endDate
        if (!task.startDate || task.startDate < depEndDate) {
          task.startDate = new Date(depEndDate)
        }
      }
    }

    // If still no startDate, use today
    if (!task.startDate || task.startDate.getTime() === new Date().getTime()) {
      task.startDate = new Date()
    }

    // Calculate endDate if not provided
    if (!task.endDate || task.endDate.getTime() === new Date().getTime()) {
      // Estimate: 8 hours per working day
      const estimatedDays = Math.ceil((task.remaining_estimate_hours || 0) / 8)
      task.endDate = addDays(task.startDate, estimatedDays)
    }

    resolved.add(taskId)
  }

  // Resolve all tasks
  tasks.forEach(task => resolveTask(task.id))
}
