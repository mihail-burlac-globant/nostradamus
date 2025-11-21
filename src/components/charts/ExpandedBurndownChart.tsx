import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { Task, Milestone } from '../../types/entities.types'
import { format, eachDayOfInterval, isAfter, startOfDay, isWeekend } from 'date-fns'
import { useEntitiesStore } from '../../stores/entitiesStore'
import { getResourceIconEmoji } from '../../utils/resourceIconEmojis'
import {
  calculateRecentVelocity,
  calculatePlannedVelocity,
  calculateVelocityMetrics,
  getHistoricalData,
} from '../../utils/velocityCalculations'
import { addWatermarkToChart } from '../../utils/chartWatermark'

interface ExpandedBurndownChartProps {
  projectId: string
  projectTitle: string
  projectStartDate?: string
  tasks: Task[]
  milestones?: Milestone[]
  onClose: () => void
}

const ExpandedBurndownChart = ({
  projectId,
  projectTitle,
  projectStartDate,
  tasks,
  milestones = [],
  onClose
}: ExpandedBurndownChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const { getTaskResources, getProjectResources, getTaskDependencies, progressSnapshots } = useEntitiesStore()

  useEffect(() => {
    // Similar logic to BurndownChart but with daily granularity optimizations
    if (!chartRef.current || tasks.length === 0) return

    const projectResources = getProjectResources(projectId)

    const calculateTaskDates = (task: Task, taskDateMap: Map<string, { start: Date; end: Date }>): { start: Date; end: Date } => {
      if (taskDateMap.has(task.id)) {
        return taskDateMap.get(task.id)!
      }

      const dependencies = getTaskDependencies(task.id)
      let earliestStart: Date

      if (dependencies.length > 0) {
        const dependencyEndDates = dependencies.map(dep => {
          const depDates = calculateTaskDates(dep, taskDateMap)
          return depDates.end
        })
        earliestStart = new Date(Math.max(...dependencyEndDates.map(d => d.getTime())))
      } else {
        if (task.startDate) {
          earliestStart = new Date(task.startDate)
        } else if (projectStartDate) {
          earliestStart = new Date(projectStartDate)
        } else {
          earliestStart = new Date()
        }
      }

      const resources = getTaskResources(task.id)
      const resourceDurations: number[] = []

      resources.forEach(taskResource => {
        const workDays = taskResource.estimatedDays
        const numberOfProfiles = taskResource.numberOfProfiles || 1
        const projectResource = projectResources.find(pr => pr.id === taskResource.id)
        const focusFactor = (taskResource.focusFactor || projectResource?.focusFactor || 100) / 100
        const duration = workDays / (numberOfProfiles * focusFactor)
        resourceDurations.push(duration)
      })

      const durationDays = resourceDurations.length > 0
        ? Math.ceil(Math.max(...resourceDurations))
        : 1

      const endDate = new Date(earliestStart)
      endDate.setDate(endDate.getDate() + durationDays)

      const result = { start: earliestStart, end: endDate }
      taskDateMap.set(task.id, result)
      return result
    }

    const taskDateMap = new Map<string, { start: Date; end: Date }>()
    const tasksWithDates = tasks.map(task => {
      const dates = calculateTaskDates(task, taskDateMap)
      return {
        ...task,
        startDate: dates.start.toISOString().split('T')[0],
        endDate: dates.end.toISOString().split('T')[0]
      }
    })

    const topologicalSort = (tasks: typeof tasksWithDates): typeof tasksWithDates => {
      const sorted: typeof tasksWithDates = []
      const visited = new Set<string>()
      const visiting = new Set<string>()

      const visit = (task: typeof tasksWithDates[0]) => {
        if (visited.has(task.id)) return
        if (visiting.has(task.id)) return

        visiting.add(task.id)

        const deps = getTaskDependencies(task.id)
        deps.forEach(depTask => {
          const depWithDates = tasks.find(t => t.id === depTask.id)
          if (depWithDates) visit(depWithDates)
        })

        visiting.delete(task.id)
        visited.add(task.id)
        sorted.push(task)
      }

      tasks.forEach(task => visit(task))
      return sorted
    }

    const validTasks = topologicalSort(tasksWithDates)

    if (validTasks.length === 0) {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
      return
    }

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    const allStartDates = validTasks.map(t => new Date(t.startDate!))
    const projectStart = new Date(Math.min(...allStartDates.map(d => d.getTime())))
    const today = startOfDay(new Date())
    const chartStart = projectStart

    const allEndDates = validTasks.map(t => new Date(t.endDate!))
    const latestTaskEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())))

    const initialChartEnd = new Date(latestTaskEnd)
    initialChartEnd.setDate(initialChartEnd.getDate() + 30)

    const allDays = eachDayOfInterval({ start: chartStart, end: initialChartEnd })

    const taskInitialEffort = new Map<string, number>()
    const taskCurrentRemaining = new Map<string, number>()
    const taskResourceTypes = new Map<string, string[]>()

    validTasks.forEach(task => {
      const resources = getTaskResources(task.id)
      const effort = resources.reduce((sum, resource) => sum + resource.estimatedDays, 0)
      taskInitialEffort.set(task.id, effort)

      const remaining = effort * (1 - task.progress / 100)
      taskCurrentRemaining.set(task.id, remaining)

      const resourceTypes = resources.map(r => r.id)
      taskResourceTypes.set(task.id, resourceTypes)
    })

    const taskDependencies = new Map<string, string[]>()
    const completedTasks = new Set<string>()

    validTasks.forEach(task => {
      const deps = getTaskDependencies(task.id)
      taskDependencies.set(task.id, deps.map(d => d.id))

      if (task.status === 'Done' || task.progress >= 100) {
        completedTasks.add(task.id)
      }
    })

    const resourceCapacity = new Map<string, number>()
    projectResources.forEach(pr => {
      const capacity = pr.numberOfResources * (pr.focusFactor / 100)
      resourceCapacity.set(pr.id, capacity)
    })

    const projectSnapshots = progressSnapshots.filter(s => s.projectId === projectId)

    const taskRemainingByDay = validTasks.map(task => ({
      task,
      color: task.color,
      data: [] as number[]
    }))

    const taskRemainingSimulation = new Map<string, number>()
    validTasks.forEach(task => {
      taskRemainingSimulation.set(task.id, taskCurrentRemaining.get(task.id) || 0)
    })

    const simulationCompletedTasks = new Set(completedTasks)
    let completionDayIndex = -1

    allDays.forEach((date, dayIndex) => {
      const isFuture = isAfter(date, today)
      const dateKey = format(date, 'yyyy-MM-dd')

      if (!isFuture) {
        validTasks.forEach(task => {
          const idx = validTasks.indexOf(task)
          const snapshot = projectSnapshots.find(s => s.taskId === task.id && s.date === dateKey)

          let remainingForDay: number
          let manualRemainingForDay: number

          if (snapshot) {
            const resources = getTaskResources(task.id)
            const totalEffort = resources.reduce((sum, resource) => sum + resource.estimatedDays, 0)
            remainingForDay = totalEffort * (1 - snapshot.progress / 100)
            manualRemainingForDay = snapshot.remainingEstimate
          } else {
            const resources = getTaskResources(task.id)
            const totalEffort = resources.reduce((sum, resource) => sum + resource.estimatedDays, 0)
            remainingForDay = totalEffort * (1 - task.progress / 100)
            manualRemainingForDay = remainingForDay
          }

          taskRemainingByDay[idx].data.push(remainingForDay)

          if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
            taskRemainingSimulation.set(task.id, manualRemainingForDay)
          }
        })
      } else {
        const isWeekendDay = isWeekend(date)

        if (isWeekendDay) {
          validTasks.forEach(task => {
            const idx = validTasks.indexOf(task)
            taskRemainingByDay[idx].data.push(taskRemainingSimulation.get(task.id) || 0)
          })
        } else {
          const workableTasks = validTasks.filter(task => {
            if (simulationCompletedTasks.has(task.id)) return false
            const deps = taskDependencies.get(task.id) || []
            return deps.every(depId => simulationCompletedTasks.has(depId))
          })

          const workDoneByTask = new Map<string, number>()

          resourceCapacity.forEach((capacity, resourceId) => {
            const tasksNeedingResource = workableTasks.filter(task => {
              const types = taskResourceTypes.get(task.id) || []
              return types.includes(resourceId) && (taskRemainingSimulation.get(task.id) || 0) > 0
            })

            if (tasksNeedingResource.length === 0) return

            const firstTask = tasksNeedingResource[0]
            const currentWork = workDoneByTask.get(firstTask.id) || 0
            workDoneByTask.set(firstTask.id, currentWork + capacity)
          })

          workableTasks.forEach(task => {
            const workDone = workDoneByTask.get(task.id) || 0
            const remaining = taskRemainingSimulation.get(task.id) || 0
            const newRemaining = Math.max(0, remaining - workDone)
            taskRemainingSimulation.set(task.id, newRemaining)

            if (newRemaining <= 0.01) {
              simulationCompletedTasks.add(task.id)
            }
          })

          validTasks.forEach(task => {
            const idx = validTasks.indexOf(task)
            taskRemainingByDay[idx].data.push(taskRemainingSimulation.get(task.id) || 0)
          })

          const totalRemaining = validTasks.reduce((sum, task) => {
            return sum + (taskRemainingSimulation.get(task.id) || 0)
          }, 0)

          if (totalRemaining <= 0.01 && completionDayIndex === -1) {
            completionDayIndex = dayIndex
          }
        }
      }
    })

    const theoreticalCompletionDayIndex = completionDayIndex
    let finalDays = allDays

    const todayIndex = finalDays.findIndex(day => format(day, 'MMM dd') === format(today, 'MMM dd'))
    const totalCurrentRemaining = Array.from(taskCurrentRemaining.values()).reduce((sum, val) => sum + val, 0)
    const todayDateKey = format(today, 'yyyy-MM-dd')

    const historicalData = getHistoricalData(
      projectSnapshots,
      chartStart,
      finalDays[finalDays.length - 1]
    )

    const actualDataSeries: (number | null)[] = finalDays.map((day, index) => {
      const dateKey = format(day, 'yyyy-MM-dd')

      if (historicalData.has(dateKey)) {
        return historicalData.get(dateKey)!
      }

      if (index <= todayIndex) {
        return null
      }

      return null
    })

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

        if (!isFuture) {
          const snapshot = projectSnapshots.find(s => s.taskId === task.id && s.date === dateKey)

          if (snapshot) {
            const resources = getTaskResources(task.id)
            const totalEffort = resources.reduce((sum, resource) => sum + resource.estimatedDays, 0)
            const theoreticalRemaining = totalEffort * (1 - snapshot.progress / 100)

            const increase = snapshot.remainingEstimate - theoreticalRemaining
            if (increase > 0) {
              scopeIncrease = increase
            }
          }
        }

        taskScopeIncreaseByDay[taskIndex].data.push(scopeIncrease)
      })
    })

    const plannedVelocity = calculatePlannedVelocity(
      projectResources.map(r => ({
        numberOfResources: r.numberOfResources,
        focusFactor: r.focusFactor
      }))
    )

    const { velocity: recentVelocity } = calculateRecentVelocity(projectSnapshots, 15)

    const velocityMetrics = projectSnapshots.length >= 2
      ? calculateVelocityMetrics(projectSnapshots, totalCurrentRemaining, plannedVelocity)
      : null

    let theoreticalProjectionSeries: (number | null)[] = finalDays.map((_day, index) => {
      if (index < todayIndex) return null

      const totalForDay = taskRemainingByDay.reduce((sum, taskData) => {
        return sum + (taskData.data[index] || 0)
      }, 0)

      return totalForDay
    })

    const todayHasSnapshots = validTasks.some(task => {
      const todaySnapshot = projectSnapshots.find(s => s.taskId === task.id && s.date === todayDateKey)
      return todaySnapshot !== undefined
    })

    let projectedFromActualSeries: (number | null)[] = []

    if (todayHasSnapshots) {
      const actualRemainingSimulation = new Map<string, number>()

      validTasks.forEach(task => {
        const todaySnapshot = projectSnapshots.find(s => s.taskId === task.id && s.date === todayDateKey)
        if (todaySnapshot) {
          actualRemainingSimulation.set(task.id, todaySnapshot.remainingEstimate)
        } else {
          const resources = getTaskResources(task.id)
          const totalEffort = resources.reduce((sum, resource) => sum + resource.estimatedDays, 0)
          actualRemainingSimulation.set(task.id, totalEffort * (1 - task.progress / 100))
        }
      })

      const actualSimulationCompletedTasks = new Set(completedTasks)

      projectedFromActualSeries = finalDays.map((date, index) => {
        if (index < todayIndex) return null

        const isWeekendDay = isWeekend(date)

        if (index === todayIndex) {
          return Array.from(actualRemainingSimulation.values()).reduce((sum, val) => sum + val, 0)
        }

        if (isWeekendDay) {
          return Array.from(actualRemainingSimulation.values()).reduce((sum, val) => sum + val, 0)
        }

        const workableTasks = validTasks.filter(task => {
          if (actualSimulationCompletedTasks.has(task.id)) return false
          const deps = taskDependencies.get(task.id) || []
          return deps.every(depId => actualSimulationCompletedTasks.has(depId))
        })

        const workDoneByTask = new Map<string, number>()

        resourceCapacity.forEach((capacity, resourceId) => {
          const tasksNeedingResource = workableTasks.filter(task => {
            const types = taskResourceTypes.get(task.id) || []
            return types.includes(resourceId) && (actualRemainingSimulation.get(task.id) || 0) > 0
          })

          if (tasksNeedingResource.length === 0) return

          const firstTask = tasksNeedingResource[0]
          const currentWork = workDoneByTask.get(firstTask.id) || 0
          workDoneByTask.set(firstTask.id, currentWork + capacity)
        })

        workableTasks.forEach(task => {
          const workDone = workDoneByTask.get(task.id) || 0
          const remaining = actualRemainingSimulation.get(task.id) || 0
          const newRemaining = Math.max(0, remaining - workDone)
          actualRemainingSimulation.set(task.id, newRemaining)

          if (newRemaining <= 0.01) {
            actualSimulationCompletedTasks.add(task.id)
          }
        })

        return Array.from(actualRemainingSimulation.values()).reduce((sum, val) => sum + val, 0)
      })
    } else {
      projectedFromActualSeries = finalDays.map(() => null)
    }

    let actualCompletionDayIndex = -1
    for (let i = todayIndex; i < projectedFromActualSeries.length; i++) {
      const remaining = projectedFromActualSeries[i]
      if (remaining !== null && remaining <= 0.01) {
        actualCompletionDayIndex = i
        break
      }
    }

    const latestCompletionDayIndex = Math.max(
      theoreticalCompletionDayIndex,
      actualCompletionDayIndex
    )

    if (latestCompletionDayIndex > -1) {
      const endIndex = Math.min(latestCompletionDayIndex + 5, allDays.length)
      finalDays = allDays.slice(0, endIndex)
      taskRemainingByDay.forEach(taskData => {
        taskData.data = taskData.data.slice(0, endIndex)
      })

      theoreticalProjectionSeries = theoreticalProjectionSeries.slice(0, endIndex)
      projectedFromActualSeries = projectedFromActualSeries.slice(0, endIndex)
    }

    const isDarkMode = document.documentElement.classList.contains('dark')
    const textColor = isDarkMode ? '#E8E8EA' : '#2E2E36'
    const gridColor = isDarkMode ? '#3D3D47' : '#E8E8EA'
    const backgroundColor = isDarkMode ? '#262629' : '#ffffff'

    const velocitySubtitle = recentVelocity > 0
      ? `Recent Velocity (15d): ${recentVelocity.toFixed(2)} p-d/day | Planned: ${plannedVelocity.toFixed(2)} p-d/day | ` +
        `Trend: ${velocityMetrics ? (velocityMetrics.velocityTrend === 'improving' ? '📈' : velocityMetrics.velocityTrend === 'declining' ? '📉' : '➡️') + ' ' + velocityMetrics.velocityTrend : '―'}`
      : `Planned Velocity: ${plannedVelocity.toFixed(2)} person-days/day (no actual data yet)`

    const option: echarts.EChartsOption = {
      backgroundColor: backgroundColor,
      title: [
        {
          text: `${projectTitle} - Burndown Chart (Expanded Daily View)`,
          left: 'center',
          top: 10,
          textStyle: {
            color: textColor,
            fontSize: 24,
            fontWeight: 600,
          },
        },
        {
          text: velocitySubtitle,
          left: 'center',
          bottom: 15,
          textStyle: {
            color: textColor,
            fontSize: 14,
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

          let dayOfWeek = ''
          if (dataIndex !== undefined && finalDays[dataIndex]) {
            dayOfWeek = format(finalDays[dataIndex], 'EEE')
          }

          let totalRemaining = 0
          let result = `<div style="padding: 8px; min-width: 200px;"><div style="font-weight: 600; margin-bottom: 8px;">${dayOfWeek ? `${dayOfWeek}, ` : ''}${date}</div>`

          const taskData = new Map<string, { baseValue: number; scopeValue: number; color: string }>()

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params.forEach((param: any) => {
            const value = param.value
            const name = param.seriesName
            const color = param.color

            if (value > 0) {
              totalRemaining += value

              if (name.includes('(Scope +)')) {
                const taskName = name.replace(' (Scope +)', '')
                const existing = taskData.get(taskName) || { baseValue: 0, scopeValue: 0, color }
                existing.scopeValue = value
                taskData.set(taskName, existing)
              } else {
                const existing = taskData.get(name) || { baseValue: 0, scopeValue: 0, color }
                existing.baseValue = value
                existing.color = color
                taskData.set(name, existing)
              }
            }
          })

          taskData.forEach((data, taskName) => {
            const total = data.baseValue + data.scopeValue
            const scopeIndicator = data.scopeValue > 0 ? ` (+${data.scopeValue.toFixed(1)})` : ''

            const task = validTasks.find(t => t.title === taskName)
            let resourceInfo = ''
            if (task) {
              const resources = getTaskResources(task.id)
              if (resources.length > 0) {
                const resourceGroups = new Map<string, { emoji: string; count: number }>()
                resources.forEach(resource => {
                  const existing = resourceGroups.get(resource.id) || {
                    emoji: getResourceIconEmoji(resource.icon),
                    count: 0
                  }
                  existing.count += resource.numberOfProfiles || 1
                  resourceGroups.set(resource.id, existing)
                })

                const resourceParts: string[] = []
                resourceGroups.forEach(({ emoji, count }) => {
                  resourceParts.push(`${emoji} ${count}x`)
                })
                resourceInfo = ` <span style="color: #9ca3af; font-size: 11px;">(${resourceParts.join(', ')})</span>`
              }
            }

            result += `
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 4px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="display: inline-block; width: 12px; height: 12px; background-color: ${data.color};"></span>
                  <span style="font-size: 12px; color: #374151;">${taskName}${resourceInfo}</span>
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
          'Past Projection',
          'Current Projection',
        ],
        top: 50,
        textStyle: {
          color: textColor,
          fontSize: 12,
        },
        type: 'scroll',
        pageIconColor: textColor,
        pageTextStyle: {
          color: textColor,
        },
      },
      grid: {
        left: '8%',
        right: '8%',
        top: 100,
        bottom: 100,
      },
      // Enable data zoom for better navigation
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: 0,
          start: 0,
          end: 100,
          bottom: 50,
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          start: 0,
          end: 100,
        },
      ],
      xAxis: {
        type: 'category',
        // Show ALL days with labels
        data: finalDays.map(d => format(d, 'MMM dd')),
        axisLabel: {
          color: textColor,
          rotate: 45,
          // Show every day for true daily granularity
          interval: 0,
          fontSize: 10,
        },
        axisLine: {
          lineStyle: {
            color: gridColor,
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: gridColor,
            type: 'dotted',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Remaining Effort (person-days)',
        nameLocation: 'middle',
        nameRotate: 90,
        nameGap: 60,
        nameTextStyle: {
          color: textColor,
          fontSize: 14,
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
        ...taskRemainingByDay.map(taskData => ({
          name: taskData.task.title,
          type: 'bar' as const,
          stack: 'total',
          data: taskData.data.map((value, index) => ({
            value,
            itemStyle: {
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
        ...taskScopeIncreaseByDay.map(taskData => ({
          name: `${taskData.task.title} (Scope +)`,
          type: 'bar' as const,
          stack: 'total',
          data: taskData.data.map((value, index) => ({
            value,
            itemStyle: {
              color: taskData.color,
              borderColor: '#ef4444',
              borderWidth: 2,
              borderType: 'solid' as const,
              opacity: index <= todayIndex ? 0.4 : 1,
            },
          })),
          emphasis: {
            focus: 'series' as const,
          },
        })),
        {
          name: 'Actual Progress',
          type: 'line' as const,
          data: actualDataSeries,
          lineStyle: {
            color: '#3b82f6',
            width: 3,
            type: 'solid',
          },
          itemStyle: {
            color: '#3b82f6',
          },
          symbol: 'circle',
          symbolSize: 6,
          smooth: false,
          z: 10,
          connectNulls: false,
        },
        {
          name: 'Past Projection',
          type: 'line' as const,
          data: theoreticalProjectionSeries,
          lineStyle: {
            color: '#10b981',
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
        {
          name: 'Current Projection',
          type: 'line' as const,
          data: projectedFromActualSeries,
          lineStyle: {
            color: '#f59e0b',
            width: 3,
            type: 'dashed',
          },
          itemStyle: {
            color: '#f59e0b',
          },
          symbol: 'circle',
          symbolSize: 4,
          smooth: true,
          z: 9,
          connectNulls: false,
        },
        {
          name: 'Markers',
          type: 'line' as const,
          data: [],
          markLine: {
            silent: false,
            symbol: ['none', 'none'],
            data: (() => {
              const iconSymbols: Record<string, string> = {
                flag: '🚩',
                star: '⭐',
                trophy: '🏆',
                target: '🎯',
                check: '✅',
                calendar: '📅',
                rocket: '🚀',
              }

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
                    return null
                  }

                  return { milestone, index }
                })
                .filter((item): item is { milestone: Milestone; index: number } => item !== null)

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

              if (completionDayIndex > -1) {
                allMarkers.push({
                  index: completionDayIndex,
                  type: 'complete'
                })
              }

              allMarkers.sort((a, b) => a.index - b.index)

              const proximityThreshold = 5
              const baseDistance = 5
              const distanceIncrement = 25

              let currentOffset = 0
              let previousIndex = -999

              return allMarkers.map((marker, i) => {
                if (i > 0 && (marker.index - previousIndex) < proximityThreshold) {
                  currentOffset += distanceIncrement
                } else {
                  currentOffset = 0
                }

                previousIndex = marker.index

                if (marker.type === 'today') {
                  return {
                    name: 'Today',
                    xAxis: marker.index,
                    label: {
                      show: true,
                      position: 'end' as const,
                      formatter: 'Today',
                      color: '#ef4444',
                      fontSize: 14,
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
                  return {
                    name: 'Project Complete',
                    xAxis: marker.index,
                    label: {
                      show: true,
                      position: 'end' as const,
                      formatter: '🎉 Project Complete',
                      color: '#10b981',
                      fontSize: 12,
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
                  const milestone = marker.milestone!
                  const normalizedIcon = (milestone.icon || '').trim().toLowerCase()
                  const iconSymbol = iconSymbols[normalizedIcon] || '📍'

                  return {
                    name: milestone.title,
                    xAxis: marker.index,
                    label: {
                      show: true,
                      position: 'end' as const,
                      formatter: `${iconSymbol} ${milestone.title}`,
                      color: milestone.color,
                      fontSize: 12,
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
      link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-burndown-chart-expanded.png`
      link.href = watermarkedUrl
      link.click()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-navy-800 rounded-lg shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-navy-200 dark:border-navy-700">
          <h2 className="text-xl font-bold text-navy-900 dark:text-white">
            Expanded Daily View - {projectTitle}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleExportPNG}
              className="p-2 text-navy-600 dark:text-navy-300 hover:text-salmon-600 dark:hover:text-salmon-500 transition-colors rounded-lg hover:bg-navy-100 dark:hover:bg-navy-700"
              title="Export as PNG"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-navy-400 hover:text-navy-600 dark:hover:text-navy-300 transition-colors rounded-lg hover:bg-navy-100 dark:hover:bg-navy-700"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chart Content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  )
}

export default ExpandedBurndownChart
