import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEntitiesStore } from '../stores/entitiesStore'
import { format, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns'

const HomePage = () => {
  const navigate = useNavigate()
  const {
    projects,
    tasks,
    milestones,
    progressSnapshots,
    isInitialized,
    initialize,
    loadProjects,
    loadTasks,
    loadMilestones,
    loadProgressSnapshots,
  } = useEntitiesStore()

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    } else {
      loadProjects()
      loadTasks()
      loadMilestones()
      loadProgressSnapshots()
    }
  }, [isInitialized, initialize, loadProjects, loadTasks, loadMilestones, loadProgressSnapshots])

  // Calculate statistics
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'Active')
    const allTasks = tasks.filter(t => {
      const project = projects.find(p => p.id === t.projectId)
      return project?.status === 'Active'
    })

    const inProgressTasks = allTasks.filter(t => t.status === 'In Progress')

    // Tasks completed this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const completedThisWeek = allTasks.filter(t => {
      if (t.status !== 'Done') return false
      // Check if task has recent progress snapshot showing completion
      const taskSnapshots = progressSnapshots.filter(s => s.taskId === t.id)
      return taskSnapshots.some(s => {
        const snapshotDate = new Date(s.date)
        return s.progress === 100 && snapshotDate >= oneWeekAgo
      })
    }).length

    // Upcoming milestones (next 3)
    const today = new Date()
    const upcomingMilestones = milestones
      .filter(m => {
        const milestoneDate = parseISO(m.date)
        const project = projects.find(p => p.id === m.projectId)
        return project?.status === 'Active' && isAfter(milestoneDate, today)
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .slice(0, 3)

    // Overall completion percentage
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter(t => t.status === 'Done').length
    const overallCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return {
      activeProjects: activeProjects.length,
      inProgressTasks: inProgressTasks.length,
      completedThisWeek,
      upcomingMilestones,
      overallCompletion,
      totalTasks,
      completedTasks,
    }
  }, [projects, tasks, milestones, progressSnapshots])

  // Calculate project health
  const projectsWithHealth = useMemo(() => {
    return projects
      .filter(p => p.status === 'Active')
      .map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id)
        const completedTasks = projectTasks.filter(t => t.status === 'Done').length
        const totalTasks = projectTasks.length
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        // Calculate health based on progress
        // Note: Projects don't have endDate, so health is based on progress only
        let health: 'on-track' | 'at-risk' | 'behind' = 'on-track'

        // Simple health check based on task progress
        if (totalTasks > 0) {
          if (progress < 30) {
            health = 'at-risk'
          } else if (progress < 10) {
            health = 'behind'
          }
        }

        return {
          ...project,
          progress,
          totalTasks,
          health,
        }
      })
      .sort((a, b) => b.progress - a.progress)
  }, [projects, tasks])

  // At-risk tasks
  const atRiskTasks = useMemo(() => {
    const today = new Date()
    return tasks
      .filter(t => {
        const project = projects.find(p => p.id === t.projectId)
        if (project?.status !== 'Active' || t.status === 'Done') return false

        // Task is overdue
        if (t.endDate && isAfter(today, parseISO(t.endDate))) return true

        // Task has low progress
        if (t.progress < 50 && t.status === 'In Progress') {
          // Check if it's been in progress for a while
          const taskSnapshots = progressSnapshots.filter(s => s.taskId === t.id)
          if (taskSnapshots.length > 3) return true
        }

        return false
      })
      .slice(0, 5)
  }, [tasks, projects, progressSnapshots])

  // Recent activity
  const recentActivity = useMemo(() => {
    const today = new Date()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const activities: Array<{
      type: 'task-completed' | 'milestone-reached'
      title: string
      projectName: string
      date: Date
    }> = []

    // Recently completed tasks
    tasks.forEach(task => {
      if (task.status === 'Done') {
        const project = projects.find(p => p.id === task.projectId)
        if (project?.status === 'Active') {
          const taskSnapshots = progressSnapshots
            .filter(s => s.taskId === task.id && s.progress === 100)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

          if (taskSnapshots.length > 0) {
            const completionDate = new Date(taskSnapshots[0].date)
            if (completionDate >= threeDaysAgo) {
              activities.push({
                type: 'task-completed',
                title: task.title,
                projectName: project.title,
                date: completionDate,
              })
            }
          }
        }
      }
    })

    // Recently reached milestones
    milestones.forEach(milestone => {
      const milestoneDate = parseISO(milestone.date)
      if (milestoneDate >= threeDaysAgo && isBefore(milestoneDate, today)) {
        const project = projects.find(p => p.id === milestone.projectId)
        if (project?.status === 'Active') {
          activities.push({
            type: 'milestone-reached',
            title: milestone.title,
            projectName: project.title,
            date: milestoneDate,
          })
        }
      }
    })

    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
  }, [tasks, milestones, projects, progressSnapshots])

  const getHealthColor = (health: 'on-track' | 'at-risk' | 'behind') => {
    switch (health) {
      case 'on-track':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'at-risk':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'behind':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    }
  }

  const getHealthIcon = (health: 'on-track' | 'at-risk' | 'behind') => {
    switch (health) {
      case 'on-track':
        return '✓'
      case 'at-risk':
        return '⚠'
      case 'behind':
        return '⚠'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-salmon-50 dark:from-gray-950 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-navy-800 dark:text-navy-100 mb-2">
            Welcome to Nostradamus
          </h1>
          <p className="text-navy-600 dark:text-navy-400">
            Your project management overview at a glance
          </p>
        </div>

        {/* Priority 1: Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Projects */}
          <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6 border border-navy-200 dark:border-navy-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-navy-600 dark:text-navy-400">Active Projects</h3>
              <svg className="w-8 h-8 text-salmon-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-navy-800 dark:text-navy-100">{stats.activeProjects}</p>
          </div>

          {/* Tasks In Progress */}
          <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6 border border-navy-200 dark:border-navy-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-navy-600 dark:text-navy-400">In Progress</h3>
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-navy-800 dark:text-navy-100">{stats.inProgressTasks}</p>
            <p className="text-xs text-navy-500 dark:text-navy-500 mt-1">tasks</p>
          </div>

          {/* Completed This Week */}
          <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6 border border-navy-200 dark:border-navy-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-navy-600 dark:text-navy-400">Completed This Week</h3>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-navy-800 dark:text-navy-100">{stats.completedThisWeek}</p>
            <p className="text-xs text-navy-500 dark:text-navy-500 mt-1">tasks</p>
          </div>

          {/* Overall Progress */}
          <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6 border border-navy-200 dark:border-navy-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-navy-600 dark:text-navy-400">Overall Progress</h3>
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-navy-800 dark:text-navy-100">{stats.overallCompletion}%</p>
            <p className="text-xs text-navy-500 dark:text-navy-500 mt-1">
              {stats.completedTasks} of {stats.totalTasks} tasks
            </p>
          </div>
        </div>

        {/* Priority 1: Active Projects Grid with Health Indicators */}
        <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-navy-800 dark:text-navy-100">Project Health Overview</h2>
            <button
              onClick={() => navigate('/projects')}
              className="text-salmon-600 dark:text-salmon-500 hover:text-salmon-700 dark:hover:text-salmon-400 font-medium text-sm flex items-center gap-1"
            >
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {projectsWithHealth.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-navy-300 dark:text-navy-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-navy-600 dark:text-navy-400 mb-4">No active projects yet</p>
              <button
                onClick={() => navigate('/projects')}
                className="px-6 py-3 bg-salmon-600 hover:bg-salmon-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Create Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectsWithHealth.map(project => (
                <div
                  key={project.id}
                  className="bg-navy-50 dark:bg-navy-900 rounded-lg p-4 border border-navy-200 dark:border-navy-700 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate('/tasks')}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-navy-800 dark:text-navy-100 flex-1 pr-2">
                      {project.title}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getHealthColor(project.health)}`}>
                      {getHealthIcon(project.health)} {project.health.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-navy-600 dark:text-navy-400">
                      <span>Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-navy-200 dark:bg-navy-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          project.health === 'on-track'
                            ? 'bg-green-500'
                            : project.health === 'at-risk'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-navy-500 dark:text-navy-500">
                      <span>{project.totalTasks} tasks</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Priority 2: Upcoming Milestones & At-Risk Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Milestones */}
          <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-navy-800 dark:text-navy-100">Upcoming Milestones</h2>
              <button
                onClick={() => navigate('/tasks')}
                className="text-salmon-600 dark:text-salmon-500 hover:text-salmon-700 dark:hover:text-salmon-400 font-medium text-sm"
              >
                View All
              </button>
            </div>

            {stats.upcomingMilestones.length === 0 ? (
              <p className="text-navy-500 dark:text-navy-500 text-sm text-center py-8">
                No upcoming milestones
              </p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingMilestones.map(milestone => {
                  const project = projects.find(p => p.id === milestone.projectId)
                  const milestoneDate = parseISO(milestone.date)
                  const daysUntil = differenceInDays(milestoneDate, new Date())

                  return (
                    <div
                      key={milestone.id}
                      className="flex items-center gap-3 p-3 bg-navy-50 dark:bg-navy-900 rounded-lg border border-navy-200 dark:border-navy-700"
                    >
                      <div className="text-2xl">{milestone.icon === 'flag' ? '🚩' : milestone.icon === 'star' ? '⭐' : milestone.icon === 'trophy' ? '🏆' : '📍'}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-navy-800 dark:text-navy-100">{milestone.title}</h4>
                        <p className="text-xs text-navy-500 dark:text-navy-500">{project?.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-navy-800 dark:text-navy-100">
                          {format(milestoneDate, 'MMM dd')}
                        </p>
                        <p className="text-xs text-navy-500 dark:text-navy-500">
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil}d`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* At-Risk Tasks Alert */}
          <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-navy-800 dark:text-navy-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                At-Risk Tasks
              </h2>
              <button
                onClick={() => navigate('/tasks')}
                className="text-salmon-600 dark:text-salmon-500 hover:text-salmon-700 dark:hover:text-salmon-400 font-medium text-sm"
              >
                View All
              </button>
            </div>

            {atRiskTasks.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-navy-500 dark:text-navy-500 text-sm">
                  All tasks are on track!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {atRiskTasks.map(task => {
                  const project = projects.find(p => p.id === task.projectId)
                  const isOverdue = task.endDate && isAfter(new Date(), parseISO(task.endDate))

                  return (
                    <div
                      key={task.id}
                      className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-navy-800 dark:text-navy-100">{task.title}</h4>
                          <p className="text-xs text-navy-500 dark:text-navy-500 mt-1">{project?.title}</p>
                        </div>
                        {isOverdue && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-medium rounded">
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-red-200 dark:bg-red-900/30 rounded-full h-1.5">
                          <div
                            className="bg-red-600 dark:bg-red-500 h-1.5 rounded-full"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-navy-600 dark:text-navy-400 font-medium">
                          {task.progress}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Priority 3: Recent Activity */}
        <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-navy-800 dark:text-navy-100 mb-4">Recent Activity</h2>

          {recentActivity.length === 0 ? (
            <p className="text-navy-500 dark:text-navy-500 text-sm text-center py-8">
              No recent activity in the last 3 days
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 bg-navy-50 dark:bg-navy-900 rounded-lg border border-navy-200 dark:border-navy-700"
                >
                  <div className={`p-2 rounded-full ${
                    activity.type === 'task-completed'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  }`}>
                    {activity.type === 'task-completed' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy-800 dark:text-navy-100">
                      {activity.type === 'task-completed' ? 'Task completed: ' : 'Milestone reached: '}
                      <span className="text-navy-600 dark:text-navy-400">{activity.title}</span>
                    </p>
                    <p className="text-xs text-navy-500 dark:text-navy-500 mt-0.5">
                      {activity.projectName}
                    </p>
                  </div>
                  <span className="text-xs text-navy-500 dark:text-navy-500">
                    {format(activity.date, 'MMM dd')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage
