import { CSVRow, ProjectData, Task } from '../types/project.types'
import { parse } from 'date-fns'

export const parseCSVToProjectData = (rows: CSVRow[]): ProjectData => {
  if (rows.length === 0) {
    throw new Error('CSV file is empty')
  }

  // Validate required columns
  const requiredColumns = ['name', 'startDate', 'endDate', 'progress', 'status']
  const firstRow = rows[0]
  const missingColumns = requiredColumns.filter(
    (col) => !(col in firstRow)
  )

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(', ')}`
    )
  }

  // Parse tasks
  const tasks: Task[] = rows.map((row, index) => {
    const id = row.id || `task-${index + 1}`
    const name = row.name || `Task ${index + 1}`

    // Parse dates - try multiple formats
    const startDate = parseDate(row.startDate)
    const endDate = parseDate(row.endDate)

    if (!startDate || !endDate) {
      throw new Error(`Invalid date format in row ${index + 1}. Use format: YYYY-MM-DD or MM/DD/YYYY`)
    }

    const progress = Math.min(100, Math.max(0, parseFloat(row.progress) || 0))
    const status = parseStatus(row.status)
    const assignee = row.assignee || undefined
    const profile_type = row.profile_type || undefined
    const remaining_estimate_hours = row.remaining_estimate_hours
      ? parseFloat(row.remaining_estimate_hours)
      : undefined
    const dependency = row.dependency || undefined

    return {
      id,
      name,
      startDate,
      endDate,
      progress,
      status,
      assignee,
      profile_type,
      remaining_estimate_hours,
      dependency,
    }
  })

  // Calculate project dates
  const allDates = tasks.flatMap((task) => [task.startDate, task.endDate])
  const startDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
  const endDate = new Date(Math.max(...allDates.map((d) => d.getTime())))

  // Calculate total planned work
  const totalPlannedWork = tasks.length * 100

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
