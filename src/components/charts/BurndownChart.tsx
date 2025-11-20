import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { Task, Milestone } from '../../types/entities.types'
import { format, eachDayOfInterval, isAfter, startOfDay, isWeekend } from 'date-fns'
import { useEntitiesStore } from '../../stores/entitiesStore'
import {
  calculateRecentVelocity,
  calculatePlannedVelocity,
  calculateVelocityMetrics,
  getHistoricalData,
} from '../../utils/velocityCalculations'
import { addWatermarkToChart } from '../../utils/chartWatermark'

interface BurndownChartProps {
  projectId: string
  projectTitle: string
  projectStartDate?: string
  tasks: Task[]
  milestones?: Milestone[]
}

const BurndownChart = ({ projectId, projectTitle, projectStartDate, tasks, milestones = [] }: BurndownChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const { getTaskResources, getProjectResources, getTaskDependencies, progressSnapshots } = useEntitiesStore()

  useEffect(() => {
    if (!chartRef.current || tasks.length === 0) return

    console.log('📈 BurndownChart received milestones:', milestones)
    // Debug: Log each milestone's icon value
    milestones.forEach(m => {
      console.log(`  Milestone "${m.title}": icon="${m.icon}", color="${m.color}"`)
    })

    // Get project resources BEFORE calculateTaskDates to avoid initialization error
    const projectResources = getProjectResources(projectId)

    // Calculate effective start and end dates for each task
    const calculateTaskDates = (task: Task, taskDateMap: Map<string, { start: Date; end: Date }>): { start: Date; end: Date } => {
      // Check if already calculated
      if (taskDateMap.has(task.id)) {
        return taskDateMap.get(task.id)!
      }

      // Get dependencies
      const dependencies = getTaskDependencies(task.id)

      // Calculate earliest start date based on dependencies
      let earliestStart: Date
      if (dependencies.length > 0) {
        // Task can't start until all dependencies are complete
        // Recursively calculate dependency end dates
        const dependencyEndDates = dependencies.map(dep => {
          const depDates = calculateTaskDates(dep, taskDateMap)
          return depDates.end
        })
        earliestStart = new Date(Math.max(...dependencyEndDates.map(d => d.getTime())))
        // Add 1 day buffer after dependency completes
        earliestStart.setDate(earliestStart.getDate() + 1)
      } else {
        // No dependencies - use task start date or project start date
        if (task.startDate) {
          earliestStart = new Date(task.startDate)
        } else if (projectStartDate) {
          earliestStart = new Date(projectStartDate)
        } else {
          earliestStart = new Date() // Fallback to today
        }
      }

      // Calculate duration: estimatedDays / (numberOfProfiles * focusFactor)
      const resources = getTaskResources(task.id)

      // For each resource type, calculate how long it takes considering team size
      const resourceDurations: number[] = []

      resources.forEach(taskResource => {
        // Person-days of work needed
        const workDays = taskResource.estimatedDays

        // Find how many people of this resource type are available in the project
        const projectResource = projectResources.find(pr => pr.id === taskResource.id)
        const numberOfProfiles = projectResource?.numberOfResources || 1
        // Priority: 1) Task assignment focus factor, 2) Project resource focus factor, 3) Default 100
        const focusFactor = (taskResource.focusFactor || projectResource?.focusFactor || 100) / 100 // Convert to decimal (80% = 0.8)

        // Duration = workDays / (numberOfProfiles * focusFactor)
        const duration = workDays / (numberOfProfiles * focusFactor)
        resourceDurations.push(duration)
      })

      // Task duration is the longest duration among all resource types (they work in parallel)
      const durationDays = resourceDurations.length > 0
        ? Math.ceil(Math.max(...resourceDurations))
        : 1

      // Calculate end date
      const endDate = new Date(earliestStart)
      endDate.setDate(endDate.getDate() + durationDays)

      const result = { start: earliestStart, end: endDate }
      taskDateMap.set(task.id, result)
      return result
    }

    // Calculate dates for all tasks
    const taskDateMap = new Map<string, { start: Date; end: Date }>()
    const validTasks = tasks.map(task => {
      const dates = calculateTaskDates(task, taskDateMap)
      return {
        ...task,
        startDate: dates.start.toISOString().split('T')[0],
        endDate: dates.end.toISOString().split('T')[0]
      }
    })

    if (validTasks.length === 0) {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
      return
    }

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    // Calculate project bounds - start from earliest task start date
    const allStartDates = validTasks.map(t => new Date(t.startDate!))
    const projectStart = new Date(Math.min(...allStartDates.map(d => d.getTime())))

    const today = startOfDay(new Date())
    const chartStart = projectStart

    // We'll determine chartEnd dynamically after simulation to ensure we show until work is complete
    // For now, use a far future date
    const allEndDates = validTasks.map(t => new Date(t.endDate!))
    const latestTaskEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())))

    // Add buffer to ensure we capture all work completion
    const initialChartEnd = new Date(latestTaskEnd)
    initialChartEnd.setDate(initialChartEnd.getDate() + 30) // Add 30 days buffer

    // Generate days for the burndown chart (from project start to far future)
    const allDays = eachDayOfInterval({ start: chartStart, end: initialChartEnd })

    // Calculate initial effort and current remaining effort for each task
    const taskInitialEffort = new Map<string, number>()
    const taskCurrentRemaining = new Map<string, number>()
    const taskResourceTypes = new Map<string, string[]>() // task -> resource types

    validTasks.forEach(task => {
      const resources = getTaskResources(task.id)
      const effort = resources.reduce((sum, resource) => {
        return sum + (resource.estimatedDays * (resource.focusFactor / 100))
      }, 0)
      taskInitialEffort.set(task.id, effort)

      // Calculate remaining effort based on progress
      const remaining = effort * (1 - task.progress / 100)
      taskCurrentRemaining.set(task.id, remaining)

      // Store resource types for this task
      const resourceTypes = resources.map(r => r.id)
      taskResourceTypes.set(task.id, resourceTypes)
    })

    // Build dependency graph
    const taskDependencies = new Map<string, string[]>() // task -> depends on these tasks
    const completedTasks = new Set<string>()

    validTasks.forEach(task => {
      const deps = getTaskDependencies(task.id) // Returns Task objects this task depends on
      taskDependencies.set(task.id, deps.map(d => d.id))

      // Mark done tasks as completed
      if (task.status === 'Done' || task.progress >= 100) {
        completedTasks.add(task.id)
      }
    })

    // Calculate resource capacity per type from project resources
    const resourceCapacity = new Map<string, number>() // resourceId -> daily capacity
    projectResources.forEach(pr => {
      const capacity = pr.numberOfResources * (pr.focusFactor / 100)
      resourceCapacity.set(pr.id, capacity)
    })

    // Get progress snapshots for this project (needed for calculations below)
    const projectSnapshots = progressSnapshots.filter(s => s.projectId === projectId)

    // Simulate work day by day to calculate remaining effort
    const taskRemainingByDay = validTasks.map(task => ({
      task,
      color: task.color,
      data: [] as number[]
    }))

    // For each day, simulate work
    const taskRemainingSimulation = new Map<string, number>()
    // Initialize with current remaining as fallback (will be overwritten by today's values if today exists in range)
    validTasks.forEach(task => {
      taskRemainingSimulation.set(task.id, taskCurrentRemaining.get(task.id) || 0)
    })

    const simulationCompletedTasks = new Set(completedTasks)
    let completionDayIndex = -1

    allDays.forEach((date, dayIndex) => {
      const isFuture = isAfter(date, today)
      const dateKey = format(date, 'yyyy-MM-dd')

      if (!isFuture) {
        // For past dates and today: show theoretical remaining based on snapshot progress (if available)
        validTasks.forEach(task => {
          const idx = validTasks.indexOf(task)
          const snapshot = projectSnapshots.find(s => s.taskId === task.id && s.date === dateKey)

          let theoreticalRemaining: number
          if (snapshot) {
            // Calculate theoretical remaining from snapshot's progress
            const resources = getTaskResources(task.id)
            const totalEffort = resources.reduce((sum, resource) => {
              return sum + (resource.estimatedDays * (resource.focusFactor / 100))
            }, 0)
            theoreticalRemaining = totalEffort * (1 - snapshot.progress / 100)
          } else {
            // No snapshot - use current remaining
            theoreticalRemaining = taskCurrentRemaining.get(task.id) || 0
          }

          taskRemainingByDay[idx].data.push(theoreticalRemaining)

          // Initialize simulation with today's values for future projections
          if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
            taskRemainingSimulation.set(task.id, theoreticalRemaining)
          }
        })
      } else {
        // For future dates: simulate work with dependencies

        // Check if it's a weekend - no work happens on weekends
        const isWeekendDay = isWeekend(date)

        if (isWeekendDay) {
          // Weekend: no work done, just record current remaining
          validTasks.forEach(task => {
            const idx = validTasks.indexOf(task)
            taskRemainingByDay[idx].data.push(taskRemainingSimulation.get(task.id) || 0)
          })
        } else {
          // Weekday: simulate work with dependencies

          // Find tasks that can be worked on (dependencies satisfied)
          const workableTasks = validTasks.filter(task => {
            if (simulationCompletedTasks.has(task.id)) return false

            const deps = taskDependencies.get(task.id) || []
            return deps.every(depId => simulationCompletedTasks.has(depId))
          })

          // Group workable tasks by resource type and calculate work done
          const workDoneByTask = new Map<string, number>()

          // For each resource type, distribute capacity across tasks that need it
          resourceCapacity.forEach((capacity, resourceId) => {
            const tasksNeedingResource = workableTasks.filter(task => {
              const types = taskResourceTypes.get(task.id) || []
              return types.includes(resourceId) && (taskRemainingSimulation.get(task.id) || 0) > 0
            })

            if (tasksNeedingResource.length === 0) return

            // Distribute capacity evenly across tasks needing this resource
            const capacityPerTask = capacity / tasksNeedingResource.length

            tasksNeedingResource.forEach(task => {
              const currentWork = workDoneByTask.get(task.id) || 0
              workDoneByTask.set(task.id, currentWork + capacityPerTask)
            })
          })

          // Apply work done and update remaining effort
          workableTasks.forEach(task => {
            const workDone = workDoneByTask.get(task.id) || 0
            const remaining = taskRemainingSimulation.get(task.id) || 0
            const newRemaining = Math.max(0, remaining - workDone)
            taskRemainingSimulation.set(task.id, newRemaining)

            // Mark as completed if done
            if (newRemaining <= 0.01) {
              simulationCompletedTasks.add(task.id)
            }
          })

          // Record remaining effort for this day
          validTasks.forEach(task => {
            const idx = validTasks.indexOf(task)
            taskRemainingByDay[idx].data.push(taskRemainingSimulation.get(task.id) || 0)
          })

          // Check if all work is complete
          const totalRemaining = validTasks.reduce((sum, task) => {
            return sum + (taskRemainingSimulation.get(task.id) || 0)
          }, 0)

          if (totalRemaining <= 0.01 && completionDayIndex === -1) {
            completionDayIndex = dayIndex
          }
        }
      }
    })

    // Truncate data to completion day if found, otherwise keep all data
    let finalDays = allDays
    if (completionDayIndex > -1) {
      // Add a few days buffer after completion for visibility
      const endIndex = Math.min(completionDayIndex + 5, allDays.length)
      finalDays = allDays.slice(0, endIndex)
      taskRemainingByDay.forEach(taskData => {
        taskData.data = taskData.data.slice(0, endIndex)
      })
    }

    // Track which days are in the past for opacity
    const todayIndex = finalDays.findIndex(day => format(day, 'MMM dd') === format(today, 'MMM dd'))

    // Calculate total current remaining effort (theoretical)
    const totalCurrentRemaining = Array.from(taskCurrentRemaining.values()).reduce((sum, val) => sum + val, 0)

    // Calculate total actual remaining from today's snapshots (manual estimates)
    const todayDateKey = format(today, 'yyyy-MM-dd')
    const totalActualRemaining = validTasks.reduce((sum, task) => {
      const todaySnapshot = projectSnapshots.find(s => s.taskId === task.id && s.date === todayDateKey)
      if (todaySnapshot) {
        return sum + todaySnapshot.remainingEstimate
      }
      // If no snapshot for today, use theoretical remaining
      const resources = getTaskResources(task.id)
      const totalEffort = resources.reduce((effortSum, resource) => {
        return effortSum + (resource.estimatedDays * (resource.focusFactor / 100))
      }, 0)
      return sum + (totalEffort * (1 - task.progress / 100))
    }, 0)

    // Get historical actual data from snapshots
    const historicalData = getHistoricalData(
      projectSnapshots,
      chartStart,
      finalDays[finalDays.length - 1]
    )

    // Build actual data series (historical remaining estimates from snapshots)
    const actualDataSeries: (number | null)[] = finalDays.map((day, index) => {
      const dateKey = format(day, 'yyyy-MM-dd')

      // Use snapshot data if available
      if (historicalData.has(dateKey)) {
        return historicalData.get(dateKey)!
      }

      // Only show data for past days where we have snapshots or can interpolate
      if (index <= todayIndex) {
        // For past days without snapshots, return null (won't draw line)
        return null
      }

      // Future days - no actual data
      return null
    })

    // Calculate scope increase per task per day
    // For each task and day, compare manual remaining estimate vs theoretical remaining
    const taskScopeIncreaseByDay = validTasks.map(task => ({
      task,
      color: task.color,
      data: [] as number[]
    }))

    finalDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const isFuture = isAfter(day, today)

      validTasks.forEach((task, taskIndex) => {
        let scopeIncrease = 0

        // Only calculate scope increase for past/present days with snapshots
        if (!isFuture) {
          const snapshot = projectSnapshots.find(s => s.taskId === task.id && s.date === dateKey)

          if (snapshot) {
            // Calculate theoretical remaining based on progress and total effort
            const resources = getTaskResources(task.id)
            const totalEffort = resources.reduce((sum, resource) => {
              return sum + (resource.estimatedDays * (resource.focusFactor / 100))
            }, 0)
            const theoreticalRemaining = totalEffort * (1 - snapshot.progress / 100)

            // Scope increase = manual remaining - theoretical remaining
            const increase = snapshot.remainingEstimate - theoreticalRemaining
            if (increase > 0) {
              scopeIncrease = increase
            }
          }
        }

        taskScopeIncreaseByDay[taskIndex].data.push(scopeIncrease)
      })
    })

    // Calculate velocities
    const plannedVelocity = calculatePlannedVelocity(
      projectResources.map(r => ({
        numberOfResources: r.numberOfResources,
        focusFactor: r.focusFactor
      }))
    )

    const { velocity: recentVelocity } = calculateRecentVelocity(projectSnapshots, 15)

    // Calculate velocity metrics for display
    const velocityMetrics = projectSnapshots.length >= 2
      ? calculateVelocityMetrics(projectSnapshots, totalCurrentRemaining, plannedVelocity)
      : null

    // Generate theoretical projection from the simulated bars (accounts for dependencies)
    const theoreticalProjectionSeries: (number | null)[] = finalDays.map((_day, index) => {
      if (index < todayIndex) return null // No projection for past

      // Sum all task remaining values from the simulation
      const totalForDay = taskRemainingByDay.reduce((sum, taskData) => {
        return sum + (taskData.data[index] || 0)
      }, 0)

      return totalForDay
    })

    // Generate realistic projection (from today forward using actual velocity from past 15 days)
    const realisticProjectionSeries: (number | null)[] = finalDays.map((_day, index) => {
      if (index < todayIndex) return null // No projection for past
      if (index === todayIndex) return totalActualRemaining // Start from actual remaining (manual estimates)
      if (recentVelocity <= 0) return totalActualRemaining // No velocity data yet

      const daysFromToday = index - todayIndex
      const projected = Math.max(0, totalActualRemaining - (recentVelocity * daysFromToday))
      return projected
    })

    // Detect dark mode
    const isDarkMode = document.documentElement.classList.contains('dark')
    const textColor = isDarkMode ? '#E8E8EA' : '#2E2E36'
    const gridColor = isDarkMode ? '#3D3D47' : '#E8E8EA'
    const backgroundColor = isDarkMode ? '#262629' : '#ffffff'

    // Build velocity subtitle
    const velocitySubtitle = recentVelocity > 0
      ? `Recent Velocity (15d): ${recentVelocity.toFixed(2)} p-d/day | Planned: ${plannedVelocity.toFixed(2)} p-d/day | ` +
        `Trend: ${velocityMetrics ? (velocityMetrics.velocityTrend === 'improving' ? '📈' : velocityMetrics.velocityTrend === 'declining' ? '📉' : '➡️') + ' ' + velocityMetrics.velocityTrend : '―'}`
      : `Planned Velocity: ${plannedVelocity.toFixed(2)} person-days/day (no actual data yet)`

    const option: echarts.EChartsOption = {
      backgroundColor: backgroundColor,
      title: [
        {
          text: `${projectTitle} - Burndown Chart`,
          left: 'center',
          textStyle: {
            color: textColor,
            fontSize: 18,
            fontWeight: 600,
          },
        },
        {
          text: velocitySubtitle,
          left: 'center',
          top: 28,
          textStyle: {
            color: textColor,
            fontSize: 12,
            fontWeight: 400,
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (params: any) {
          const dataIndex = params[0]?.dataIndex
          const date = params[0]?.axisValue || ''

          // Get day of week from the actual date
          let dayOfWeek = ''
          if (dataIndex !== undefined && finalDays[dataIndex]) {
            dayOfWeek = format(finalDays[dataIndex], 'EEE') // Mon, Tue, etc.
          }

          let totalRemaining = 0
          let result = `<div style="padding: 8px; min-width: 200px;"><div style="font-weight: 600; margin-bottom: 8px;">${dayOfWeek ? `${dayOfWeek}, ` : ''}${date}</div>`

          // Group tasks: base remaining + scope increase
          const taskData = new Map<string, { baseValue: number; scopeValue: number; color: string }>()

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params.forEach((param: any) => {
            const value = param.value
            const name = param.seriesName
            const color = param.color

            if (value > 0) {
              totalRemaining += value

              // Check if this is a scope increase series (has " (Scope +)" suffix)
              if (name.includes('(Scope +)')) {
                const taskName = name.replace(' (Scope +)', '')
                const existing = taskData.get(taskName) || { baseValue: 0, scopeValue: 0, color }
                existing.scopeValue = value
                taskData.set(taskName, existing)
              } else {
                // Base remaining series
                const existing = taskData.get(name) || { baseValue: 0, scopeValue: 0, color }
                existing.baseValue = value
                existing.color = color
                taskData.set(name, existing)
              }
            }
          })

          // Render grouped task data
          taskData.forEach((data, taskName) => {
            const total = data.baseValue + data.scopeValue
            const scopeIndicator = data.scopeValue > 0 ? ` (+${data.scopeValue.toFixed(1)})` : ''

            result += `
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 4px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="display: inline-block; width: 12px; height: 12px; background-color: ${data.color};"></span>
                  <span style="font-size: 12px; color: #374151;">${taskName}</span>
                </div>
                <span style="font-size: 12px; font-weight: 600; color: #1f2937;">
                  ${total.toFixed(1)}d${data.scopeValue > 0 ? `<span style="color: #ef4444;">${scopeIndicator}</span>` : ''}
                </span>
              </div>
            `
          })

          result += `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; font-weight: 600;">
                <span style="font-size: 13px; color: #111827;">Total Remaining:</span>
                <span style="font-size: 13px; color: #111827;">${totalRemaining.toFixed(1)} person-days</span>
              </div>
            </div>
          </div>`
          return result
        },
      },
      legend: {
        data: [
          'Theoretical Projection',
          'Realistic Projection',
        ],
        top: 50,
        textStyle: {
          color: textColor,
          fontSize: 11,
        },
        type: 'scroll',
        pageIconColor: textColor,
        pageTextStyle: {
          color: textColor,
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        top: 100,
        bottom: 80,
      },
      xAxis: {
        type: 'category',
        data: finalDays.map(d => format(d, 'MMM dd')),
        axisLabel: {
          color: textColor,
          rotate: 45,
          interval: Math.floor(finalDays.length / 10), // Show ~10 labels
        },
        axisLine: {
          lineStyle: {
            color: gridColor,
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Remaining Effort (person-days)',
        nameTextStyle: {
          color: textColor,
        },
        axisLabel: {
          color: textColor,
        },
        axisLine: {
          lineStyle: {
            color: gridColor,
          },
        },
        splitLine: {
          lineStyle: {
            color: gridColor,
            type: 'dashed' as const,
          },
        },
      },
      series: [
        // Create a bar series for each task (stacked)
        ...taskRemainingByDay.map(taskData => ({
          name: taskData.task.title,
          type: 'bar' as const,
          stack: 'total',
          data: taskData.data.map((value, index) => ({
            value,
            itemStyle: {
              // Apply opacity to past days
              opacity: index <= todayIndex ? 0.4 : 1,
            },
          })),
          itemStyle: {
            color: taskData.color,
          },
          emphasis: {
            focus: 'series' as const,
          },
        })),
        // Create scope increase bar series for each task (stacked on top, with border)
        ...taskScopeIncreaseByDay.map(taskData => ({
          name: `${taskData.task.title} (Scope +)`,
          type: 'bar' as const,
          stack: 'total',
          data: taskData.data.map((value, index) => ({
            value,
            itemStyle: {
              color: taskData.color,
              borderColor: '#ef4444', // Red border
              borderWidth: 2,
              borderType: 'solid' as const,
              opacity: index <= todayIndex ? 0.4 : 1,
            },
          })),
          emphasis: {
            focus: 'series' as const,
          },
        })),
        // Actual progress line (historical data from snapshots) - not in legend
        {
          name: 'Actual Progress',
          type: 'line' as const,
          data: actualDataSeries,
          lineStyle: {
            color: '#3b82f6', // Blue
            width: 3,
            type: 'solid',
          },
          itemStyle: {
            color: '#3b82f6',
          },
          symbol: 'circle',
          symbolSize: 6,
          smooth: false,
          z: 10, // Higher z-index to appear on top
          connectNulls: false, // Don't connect gaps in data
        },
        // Theoretical projection line (planned velocity from today forward)
        {
          name: 'Theoretical Projection',
          type: 'line' as const,
          data: theoreticalProjectionSeries,
          lineStyle: {
            color: '#10b981', // Green
            width: 2,
            type: 'dashed',
          },
          itemStyle: {
            color: '#10b981',
          },
          symbol: 'none',
          smooth: true,
          z: 8,
          connectNulls: false,
        },
        // Realistic projection line (recent actual velocity from past 15 days, projected forward)
        {
          name: 'Realistic Projection',
          type: 'line' as const,
          data: realisticProjectionSeries,
          lineStyle: {
            color: recentVelocity >= plannedVelocity * 0.9 ? '#f59e0b' : '#ef4444', // Orange or Red based on velocity
            width: 2,
            type: 'dashed',
          },
          itemStyle: {
            color: recentVelocity >= plannedVelocity * 0.9 ? '#f59e0b' : '#ef4444',
          },
          symbol: 'none',
          smooth: true,
          z: 9,
          connectNulls: false,
        },
        // Add "Today" and milestone markers using a dummy line series
        {
          name: 'Markers',
          type: 'line' as const,
          data: [], // No data, just markers
          markLine: {
            silent: false,
            symbol: ['none', 'none'],
            data: (() => {
              // Map icon names to Unicode symbols
              const iconSymbols: Record<string, string> = {
                flag: '🚩',
                star: '⭐',
                trophy: '🏆',
                target: '🎯',
                check: '✅',
                calendar: '📅',
                rocket: '🚀',
              }

              // Filter milestones and calculate their indices
              const milestonesWithIndices = milestones
                .filter(milestone => {
                  const milestoneDate = new Date(milestone.date)
                  const finalChartEnd = finalDays[finalDays.length - 1]
                  return milestoneDate >= chartStart && milestoneDate <= finalChartEnd
                })
                .map(milestone => {
                  const milestoneDate = new Date(milestone.date)
                  const dateStr = format(milestoneDate, 'MMM dd')
                  const index = finalDays.findIndex(day => format(day, 'MMM dd') === dateStr)

                  if (index < 0) {
                    console.warn(`Milestone "${milestone.title}" date not found in chart range`)
                    return null
                  }

                  return { milestone, index }
                })
                .filter((item): item is { milestone: Milestone; index: number } => item !== null)

              // Create all markers including Today and Project Complete
              const allMarkers: Array<{
                index: number
                type: 'today' | 'milestone' | 'complete'
                milestone?: Milestone
              }> = [
                { index: todayIndex, type: 'today' },
                ...milestonesWithIndices.map(m => ({
                  index: m.index,
                  type: 'milestone' as const,
                  milestone: m.milestone
                }))
              ]

              // Add Project Complete marker if applicable
              if (completionDayIndex > -1) {
                allMarkers.push({
                  index: completionDayIndex,
                  type: 'complete'
                })
              }

              // Sort all markers by index
              allMarkers.sort((a, b) => a.index - b.index)

              // Calculate stair-step offsets for overlapping labels
              const proximityThreshold = 5
              const baseDistance = 5
              const distanceIncrement = 20 // pixels to offset each overlapping label

              let currentOffset = 0
              let previousIndex = -999

              return allMarkers.map((marker, i) => {
                // Check if this marker is close to the previous one
                if (i > 0 && (marker.index - previousIndex) < proximityThreshold) {
                  // Increment offset for overlapping marker
                  currentOffset += distanceIncrement
                } else {
                  // Reset offset for well-separated markers
                  currentOffset = 0
                }

                previousIndex = marker.index

                if (marker.type === 'today') {
                  // Today marker
                  return {
                    name: 'Today',
                    xAxis: marker.index,
                    label: {
                      show: true,
                      position: 'end' as const,
                      formatter: 'Today',
                      color: '#ef4444',
                      fontSize: 12,
                      fontWeight: 'bold' as const,
                      distance: baseDistance + currentOffset,
                      rotate: 0,
                    },
                    lineStyle: {
                      color: '#ef4444',
                      width: 3,
                      type: 'solid' as const,
                    },
                  }
                } else if (marker.type === 'complete') {
                  // Project Complete marker
                  return {
                    name: 'Project Complete',
                    xAxis: marker.index,
                    label: {
                      show: true,
                      position: 'end' as const,
                      formatter: '🎉 Project Complete',
                      color: '#10b981',
                      fontSize: 11,
                      fontWeight: 600 as const,
                      distance: baseDistance + currentOffset,
                      rotate: 0,
                    },
                    lineStyle: {
                      color: '#10b981',
                      width: 3,
                      type: 'solid' as const,
                    },
                  }
                } else {
                  // Milestone marker
                  const milestone = marker.milestone!
                  const normalizedIcon = (milestone.icon || '').trim().toLowerCase()
                  const iconSymbol = iconSymbols[normalizedIcon] || '📍'

                  // Debug: Log if icon is not found
                  if (!iconSymbols[normalizedIcon]) {
                    console.warn(`⚠️ Unknown milestone icon "${milestone.icon}" for milestone "${milestone.title}". Using fallback.`)
                  }

                  return {
                    name: milestone.title,
                    xAxis: marker.index,
                    label: {
                      show: true,
                      position: 'end' as const,
                      formatter: `${iconSymbol} ${milestone.title}`,
                      color: milestone.color,
                      fontSize: 11,
                      fontWeight: 600 as const,
                      distance: baseDistance + currentOffset,
                      rotate: 0,
                    },
                    lineStyle: {
                      color: milestone.color,
                      width: 2,
                      type: 'dashed' as const,
                    },
                  }
                }
              })
            })(),
          },
        },
      ],
    }

    chartInstance.current.setOption(option)

    // Handle window resize
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [projectId, projectTitle, projectStartDate, tasks, milestones, getTaskResources, getProjectResources, getTaskDependencies, progressSnapshots])

  const handleExportPNG = async () => {
    if (chartInstance.current) {
      const url = chartInstance.current.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
      })

      // Add watermark to the chart
      const watermarkedUrl = await addWatermarkToChart(url)

      const link = document.createElement('a')
      link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-burndown-chart.png`
      link.href = watermarkedUrl
      link.click()
    }
  }

  return (
    <div className="w-full relative">
      <button
        onClick={handleExportPNG}
        className="absolute top-2 right-2 z-10 p-2 bg-white dark:bg-navy-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-navy-200 dark:border-navy-600 group"
        title="Export as PNG"
      >
        <svg
          className="w-5 h-5 text-navy-600 dark:text-navy-300 group-hover:text-salmon-600 dark:group-hover:text-salmon-500 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
      <div ref={chartRef} style={{ width: '100%', height: '500px' }} />
    </div>
  )
}

export default BurndownChart
