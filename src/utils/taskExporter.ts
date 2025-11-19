import * as XLSX from 'xlsx'
import type { Project, Task, Resource } from '../types/entities.types'
import { format } from 'date-fns'

export interface TaskExportData {
  project: Project
  tasks: Task[]
  taskResources: Map<string, (Resource & { estimatedDays: number; focusFactor: number })[]>
  taskDependencies: Map<string, Task[]>
}

// Export to JSON
export const exportToJSON = (data: TaskExportData): void => {
  const exportData = {
    project: {
      id: data.project.id,
      title: data.project.title,
      description: data.project.description,
      status: data.project.status,
      startDate: data.project.startDate,
      createdAt: data.project.createdAt,
      updatedAt: data.project.updatedAt,
    },
    tasks: data.tasks.map(task => ({
      ...task,
      resources: data.taskResources.get(task.id) || [],
      dependencies: (data.taskDependencies.get(task.id) || []).map(dep => dep.id),
    })),
    exportedAt: new Date().toISOString(),
  }

  const jsonString = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${data.project.title.toLowerCase().replace(/\s+/g, '-')}-tasks-${format(new Date(), 'yyyy-MM-dd')}.json`
  link.click()
  URL.revokeObjectURL(url)
}

// Export to CSV
export const exportToCSV = (data: TaskExportData): void => {
  const headers = [
    'Task ID',
    'Task Title',
    'Description',
    'Status',
    'Progress (%)',
    'Color',
    'Start Date',
    'End Date',
    'Resources',
    'Dependencies',
    'Created At',
    'Updated At',
  ]

  const rows = data.tasks.map(task => {
    const resources = data.taskResources.get(task.id) || []
    const dependencies = data.taskDependencies.get(task.id) || []

    const resourcesStr = resources
      .map(r => `${r.title} (${r.estimatedDays}d @ ${r.focusFactor}%)`)
      .join('; ')

    const dependenciesStr = dependencies
      .map(d => d.title)
      .join('; ')

    return [
      task.id,
      task.title,
      task.description.replace(/"/g, '""'), // Escape quotes
      task.status,
      task.progress.toString(),
      task.color,
      task.startDate || '',
      task.endDate || '',
      resourcesStr,
      dependenciesStr,
      task.createdAt,
      task.updatedAt,
    ]
  })

  // Build CSV string
  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Add project info at the top
  const projectInfo = [
    `"Project: ${data.project.title}"`,
    `"Description: ${data.project.description}"`,
    `"Status: ${data.project.status}"`,
    `"Start Date: ${data.project.startDate || 'N/A'}"`,
    `"Exported: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}"`,
    '',
    ''
  ].join('\n')

  const fullCSV = projectInfo + csvContent

  const blob = new Blob([fullCSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${data.project.title.toLowerCase().replace(/\s+/g, '-')}-tasks-${format(new Date(), 'yyyy-MM-dd')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Export to Excel
export const exportToExcel = (data: TaskExportData): void => {
  // Create a new workbook
  const wb = XLSX.utils.book_new()

  // Sheet 1: Project Info
  const projectData = [
    ['Project Information'],
    ['Title', data.project.title],
    ['Description', data.project.description],
    ['Status', data.project.status],
    ['Start Date', data.project.startDate || 'N/A'],
    ['Created At', format(new Date(data.project.createdAt), 'yyyy-MM-dd HH:mm:ss')],
    ['Updated At', format(new Date(data.project.updatedAt), 'yyyy-MM-dd HH:mm:ss')],
    ['Exported At', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
  ]
  const wsProject = XLSX.utils.aoa_to_sheet(projectData)
  XLSX.utils.book_append_sheet(wb, wsProject, 'Project Info')

  // Sheet 2: Tasks
  const taskHeaders = [
    'Task ID',
    'Title',
    'Description',
    'Status',
    'Progress (%)',
    'Color',
    'Start Date',
    'End Date',
    'Created At',
    'Updated At',
  ]

  const taskRows = data.tasks.map(task => [
    task.id,
    task.title,
    task.description,
    task.status,
    task.progress,
    task.color,
    task.startDate || '',
    task.endDate || '',
    format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    format(new Date(task.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
  ])

  const wsTasks = XLSX.utils.aoa_to_sheet([taskHeaders, ...taskRows])
  XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks')

  // Sheet 3: Task Resources
  const resourceHeaders = ['Task ID', 'Task Title', 'Resource', 'Estimated Days', 'Focus Factor (%)']
  const resourceRows: (string | number)[][] = []

  data.tasks.forEach(task => {
    const resources = data.taskResources.get(task.id) || []
    resources.forEach(resource => {
      resourceRows.push([
        task.id,
        task.title,
        resource.title,
        resource.estimatedDays,
        resource.focusFactor,
      ])
    })
  })

  const wsResources = XLSX.utils.aoa_to_sheet(
    resourceRows.length > 0 ? [resourceHeaders, ...resourceRows] : [resourceHeaders, ['No resources assigned']]
  )
  XLSX.utils.book_append_sheet(wb, wsResources, 'Task Resources')

  // Sheet 4: Task Dependencies
  const depHeaders = ['Task ID', 'Task Title', 'Depends On ID', 'Depends On Title']
  const depRows: string[][] = []

  data.tasks.forEach(task => {
    const dependencies = data.taskDependencies.get(task.id) || []
    dependencies.forEach(dep => {
      depRows.push([
        task.id,
        task.title,
        dep.id,
        dep.title,
      ])
    })
  })

  const wsDeps = XLSX.utils.aoa_to_sheet(
    depRows.length > 0 ? [depHeaders, ...depRows] : [depHeaders, ['No dependencies']]
  )
  XLSX.utils.book_append_sheet(wb, wsDeps, 'Dependencies')

  // Write the file
  const fileName = `${data.project.title.toLowerCase().replace(/\s+/g, '-')}-tasks-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  XLSX.writeFile(wb, fileName)
}
