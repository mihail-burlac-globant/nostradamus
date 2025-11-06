export interface Task {
  id: string
  name: string
  startDate: Date
  endDate: Date
  progress: number
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked'
  assignee?: string
  profile_type?: string
  remaining_estimate_hours?: number
  dependency?: string
}

export interface ProjectData {
  name: string
  tasks: Task[]
  totalPlannedWork: number
  startDate: Date
  endDate: Date
}

export interface BurndownDataPoint {
  date: Date
  idealWork: number
  actualWork: number
  remainingWork: number
}

export interface BurndownByProfileDataPoint {
  date: Date
  profileBreakdown: Record<string, number> // profile_type -> hours remaining
  total: number
}

export interface ChartData {
  gantt: GanttChartData
  burndown: BurndownDataPoint[]
}

export interface GanttChartData {
  tasks: Task[]
  startDate: Date
  endDate: Date
}

export interface CSVRow {
  [key: string]: string
}
