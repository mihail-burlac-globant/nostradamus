import { ProjectData } from '../types/project.types'
import { format } from 'date-fns'

export const exportProjectToCSV = (projectData: ProjectData): void => {
  // Prepare CSV header
  const headers = ['id', 'name', 'startDate', 'endDate', 'progress', 'status', 'assignee', 'profile_type', 'remaining_estimate_hours', 'dependency']

  // Prepare CSV rows
  const rows = projectData.tasks.map(task => [
    task.id,
    `"${task.name}"`, // Quote to handle commas in names
    format(task.startDate, 'yyyy-MM-dd'),
    format(task.endDate, 'yyyy-MM-dd'),
    task.progress.toString(),
    task.status,
    task.assignee || '',
    task.profile_type || '',
    task.remaining_estimate_hours?.toString() || '',
    task.dependency || ''
  ])

  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${projectData.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
