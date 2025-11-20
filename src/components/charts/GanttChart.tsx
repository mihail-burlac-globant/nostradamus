import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import type { Task, Milestone } from '../../types/entities.types'
import { format, isWeekend, addDays, getWeek, getYear } from 'date-fns'
import { useEntitiesStore } from '../../stores/entitiesStore'
import { addWatermarkToChart } from '../../utils/chartWatermark'

type TimeView = 'day' | 'week' | 'month'

interface GanttChartProps {
  projectId: string
  projectTitle: string
  projectStartDate?: string
  tasks: Task[]
  milestones?: Milestone[]
}

const GanttChart = ({ projectId, projectTitle, projectStartDate, tasks, milestones = [] }: GanttChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const { getTaskResources, getTaskDependencies, getProjectResources, progressSnapshots } = useEntitiesStore()
  const [timeView, setTimeView] = useState<TimeView>('day')

  useEffect(() => {
    if (!chartRef.current || tasks.length === 0) return

    console.log('📊 GanttChart received milestones:', milestones)
    // Debug: Log each milestone's icon value
    milestones.forEach(m => {
      console.log(`  Milestone "${m.title}": icon="${m.icon}", color="${m.color}"`)
    })

    // Helper function to add working days (excluding weekends)
    const addWorkingDays = (startDate: Date, workingDays: number): Date => {
      let result = new Date(startDate)
      let daysAdded = 0

      while (daysAdded < workingDays) {
        result = addDays(result, 1)
        // Only count weekdays
        if (!isWeekend(result)) {
          daysAdded++
        }
      }

      return result
    }

    // Helper function to skip to next weekday if date is on weekend
    const skipToNextWeekday = (date: Date): Date => {
      let result = new Date(date)
      while (isWeekend(result)) {
        result = addDays(result, 1)
      }
      return result
    }

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
        // Skip to next working day after dependency completes
        earliestStart = addWorkingDays(earliestStart, 1)
      } else {
        // No dependencies - use task start date or project start date
        if (task.startDate) {
          earliestStart = new Date(task.startDate)
        } else if (projectStartDate) {
          earliestStart = new Date(projectStartDate)
        } else {
          earliestStart = new Date() // Fallback to today
        }
        // Make sure start date is not on a weekend
        earliestStart = skipToNextWeekday(earliestStart)
      }

      // Calculate duration based on original estimates
      const resources = getTaskResources(task.id)
      const projectResources = getProjectResources(projectId)

      // For each resource type, calculate how long it takes considering team size
      const resourceDurations: number[] = []

      // Always use original estimates from task resources for the main plan
      resources.forEach(taskResource => {
        // Person-days of work needed
        const workDays = taskResource.estimatedDays

        // Number of profiles assigned to work on this task (from task resource, not project max)
        const numberOfProfiles = taskResource.numberOfProfiles || 1
        // Priority: task-specific focus factor, or fallback to project resource focus factor
        const projectResource = projectResources.find(pr => pr.id === taskResource.id)
        const focusFactor = (taskResource.focusFactor || projectResource?.focusFactor || 100) / 100 // Convert to decimal (80% = 0.8)

        // Duration = workDays / (numberOfProfiles * focusFactor)
        const duration = workDays / (numberOfProfiles * focusFactor)
        resourceDurations.push(duration)
      })

      // Task duration is the longest duration among all resource types (they work in parallel)
      const durationDays = resourceDurations.length > 0
        ? Math.ceil(Math.max(...resourceDurations))
        : 1

      // Calculate end date using working days (excluding weekends)
      const endDate = addWorkingDays(earliestStart, durationDays)

      const result = { start: earliestStart, end: endDate }
      taskDateMap.set(task.id, result)
      return result
    }

    // Calculate dates for all tasks using original estimates (the plan)
    const taskDateMap = new Map<string, { start: Date; end: Date }>()
    const validTasks = tasks.map(task => {
      const dates = calculateTaskDates(task, taskDateMap)
      return {
        ...task,
        startDate: dates.start.toISOString().split('T')[0],
        endDate: dates.end.toISOString().split('T')[0]
      }
    })

    // Calculate projected dates for tasks with today's remaining estimates (the reality)
    const today = format(new Date(), 'yyyy-MM-dd')
    const projectedTaskDateMap = new Map<string, { start: Date; end: Date }>()
    const projectedTasks = tasks
      .filter(task => {
        // Only include tasks that have a snapshot for today
        const todaySnapshot = progressSnapshots.find(
          s => s.taskId === task.id && s.date === today
        )
        return todaySnapshot !== undefined
      })
      .map(task => {
        // Get today's snapshot
        const todaySnapshot = progressSnapshots.find(
          s => s.taskId === task.id && s.date === today
        )!

        // Calculate projected dates using remaining estimate from today's snapshot
        const dependencies = getTaskDependencies(task.id)
        let earliestStart: Date

        if (dependencies.length > 0) {
          // Use projected dates for dependencies if available, otherwise use plan dates
          const dependencyEndDates = dependencies.map(dep => {
            const projectedDep = projectedTaskDateMap.get(dep.id)
            if (projectedDep) {
              return projectedDep.end
            }
            const planDep = taskDateMap.get(dep.id)
            return planDep ? planDep.end : new Date()
          })
          earliestStart = new Date(Math.max(...dependencyEndDates.map(d => d.getTime())))
          earliestStart = addWorkingDays(earliestStart, 1)
        } else {
          // Start from today or task's original start date, whichever is later
          const taskStart = task.startDate ? new Date(task.startDate) : new Date()
          const now = new Date()
          earliestStart = taskStart > now ? taskStart : now
          earliestStart = skipToNextWeekday(earliestStart)
        }

        // Calculate duration using today's remaining estimate
        const resources = getTaskResources(task.id)
        const projectResources = getProjectResources(projectId)
        const resourceDurations: number[] = []

        resources.forEach(taskResource => {
          const numberOfProfiles = taskResource.numberOfProfiles || 1
          const projectResource = projectResources.find(pr => pr.id === taskResource.id)
          const focusFactor = (taskResource.focusFactor || projectResource?.focusFactor || 100) / 100
          const duration = todaySnapshot.remainingEstimate / (numberOfProfiles * focusFactor)
          resourceDurations.push(duration)
        })

        const durationDays = resourceDurations.length > 0
          ? Math.ceil(Math.max(...resourceDurations))
          : 1

        const endDate = addWorkingDays(earliestStart, durationDays)
        const result = { start: earliestStart, end: endDate }
        projectedTaskDateMap.set(task.id, result)

        return {
          ...task,
          startDate: earliestStart.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      })

    if (validTasks.length === 0) {
      // Show message if no tasks
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

    // Create a lookup map for projected tasks to match them with plan tasks
    const projectedTaskMap = new Map<string, typeof projectedTasks[0]>()
    projectedTasks.forEach(task => {
      projectedTaskMap.set(task.id, task)
    })

    // Convert plan tasks to chart format
    const chartData = validTasks.map((task) => {
      const startDate = new Date(task.startDate!)
      const endDate = new Date(task.endDate!)

      // Determine color based on status
      let color = '#B3B3BA' // Default gray for Todo
      if (task.status === 'Done') {
        color = '#10b981' // Green
      } else if (task.status === 'In Progress') {
        color = '#f59e0b' // Amber
      }

      // Use custom color if provided
      if (task.color) {
        color = task.color
      }

      return {
        name: task.title,
        value: [
          startDate.getTime(),
          endDate.getTime(),
          0, // progress placeholder
        ],
        itemStyle: {
          color: color,
        },
      }
    })

    // Convert projected tasks to chart format
    const projectedChartData = projectedTasks.map((task) => {
      const startDate = new Date(task.startDate!)
      const endDate = new Date(task.endDate!)

      // Use same color as plan but with reduced opacity
      let color = '#B3B3BA'
      if (task.status === 'Done') {
        color = '#10b981'
      } else if (task.status === 'In Progress') {
        color = '#f59e0b'
      }
      if (task.color) {
        color = task.color
      }

      return {
        name: task.title + ' (Projected)',
        value: [
          startDate.getTime(),
          endDate.getTime(),
          0,
        ],
        itemStyle: {
          color: color,
          opacity: 0.4,
          borderColor: color,
          borderWidth: 2,
          borderType: 'dashed',
        },
      }
    })

    // Calculate project bounds including projected tasks
    const allDates = [
      ...validTasks.flatMap(t => [
        new Date(t.startDate!).getTime(),
        new Date(t.endDate!).getTime()
      ]),
      ...projectedTasks.flatMap(t => [
        new Date(t.startDate!).getTime(),
        new Date(t.endDate!).getTime()
      ])
    ]
    const minDate = new Date(Math.min(...allDates))
    const maxDate = new Date(Math.max(...allDates))

    // Detect dark mode
    const isDarkMode = document.documentElement.classList.contains('dark')
    const textColor = isDarkMode ? '#E8E8EA' : '#2E2E36'
    const gridColor = isDarkMode ? '#3D3D47' : '#E8E8EA'
    const backgroundColor = isDarkMode ? '#262629' : '#ffffff'

    const option: echarts.EChartsOption = {
      backgroundColor: backgroundColor,
      title: {
        text: `${projectTitle} - Gantt Chart`,
        left: 'center',
        textStyle: {
          color: textColor,
          fontSize: 18,
          fontWeight: 600,
        },
      },
      tooltip: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (params: any) {
          const task = validTasks[params.dataIndex]
          const startDate = new Date(params.value[0])
          const endDate = new Date(params.value[1])
          const start = format(startDate, 'EEE, MMM dd, yyyy')
          const end = format(endDate, 'EEE, MMM dd, yyyy')
          const duration = Math.ceil((params.value[1] - params.value[0]) / (1000 * 60 * 60 * 24))

          // Get resources for this task
          const taskResources = getTaskResources(task.id)
          const resourcesHtml = taskResources.length > 0
            ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <div style="font-weight: 600; margin-bottom: 4px; color: #374151;">Resources:</div>
                ${taskResources.map(resource => `
                  <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                    <span style="color: #6b7280;">• ${resource.title}</span>
                    <span style="color: #9ca3af; font-size: 11px;">${resource.estimatedDays}d @ ${resource.focusFactor}%</span>
                  </div>
                `).join('')}
              </div>`
            : ''

          return `
            <div style="padding: 8px; min-width: 200px;">
              <div style="font-weight: 600; margin-bottom: 8px; color: #111827;">${task.title}</div>
              <div style="font-size: 12px; color: #6b7280;">
                <div style="margin-bottom: 2px;">Start: <strong>${start}</strong></div>
                <div style="margin-bottom: 2px;">End: <strong>${end}</strong></div>
                <div style="margin-bottom: 2px;">Duration: <strong>${duration} days</strong></div>
                <div style="margin-bottom: 2px;">Status: <strong style="color: ${task.status === 'Done' ? '#10b981' : task.status === 'In Progress' ? '#f59e0b' : '#6b7280'};">${task.status}</strong></div>
                <div>Progress: <strong style="color: #3b82f6;">${task.progress}%</strong></div>
              </div>
              ${resourcesHtml}
            </div>
          `
        },
      },
      grid: {
        left: '15%',
        right: '10%',
        top: 80,
        bottom: 60,
      },
      xAxis: {
        type: 'time',
        min: minDate.getTime(),
        max: maxDate.getTime(),
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value)

            if (timeView === 'month') {
              // Month view: Show "MMM 'YY" format
              return format(date, "MMM ''yy")
            } else if (timeView === 'week') {
              // Week view: Show week numbers
              const weekNum = getWeek(date, { weekStartsOn: 1 }) // ISO week (Monday start)
              const year = getYear(date)
              // Show year if we cross year boundaries
              const showYear = getYear(minDate) !== getYear(maxDate)
              return showYear ? `W${weekNum} '${year.toString().slice(-2)}` : `W${weekNum}`
            } else {
              // Day view: Show weekday and date (e.g., "Mon Jan 15")
              return format(date, 'EEE MMM dd')
            }
          },
          color: textColor,
          rotate: 45,
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
            type: 'dashed',
          },
        },
        // Control split intervals based on view
        splitNumber: timeView === 'day' ? undefined : timeView === 'week' ? 10 : 6,
        // Set minimum interval for better zoom control
        minInterval: timeView === 'day' ? 3600 * 1000 * 24 : // 1 day
                     timeView === 'week' ? 3600 * 1000 * 24 * 7 : // 1 week
                     3600 * 1000 * 24 * 30, // ~1 month
      },
      yAxis: {
        type: 'category',
        data: validTasks.map(t => t.title),
        axisLabel: {
          color: textColor,
          formatter: (value: string) => {
            // Truncate long task names
            return value.length > 30 ? value.substring(0, 30) + '...' : value
          },
        },
        axisLine: {
          lineStyle: {
            color: gridColor,
          },
        },
      },
      series: [
        {
          type: 'custom',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          renderItem: (params: any, api: any) => {
            const categoryIndex = api.value(2)
            const start = api.coord([api.value(0), categoryIndex])
            const end = api.coord([api.value(1), categoryIndex])
            const height = api.size([0, 1])[1] * 0.6

            // Get color and progress from the data item
            const dataItem = chartData[params.dataIndex]
            const task = validTasks[params.dataIndex]
            const color = dataItem?.itemStyle?.color || '#B3B3BA'
            const progress = task.progress / 100

            const totalWidth = end[0] - start[0]
            const completedWidth = totalWidth * progress

            // Create group of shapes to show progress
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const children: any[] = [
              // Background bar (remaining work) with reduced opacity
              {
                type: 'rect',
                shape: {
                  x: start[0],
                  y: start[1] - height / 2,
                  width: totalWidth,
                  height: height,
                },
                style: {
                  fill: color,
                  opacity: 0.3,
                },
              },
              // Foreground bar (completed work) with full opacity
              {
                type: 'rect',
                shape: {
                  x: start[0],
                  y: start[1] - height / 2,
                  width: completedWidth,
                  height: height,
                },
                style: {
                  fill: color,
                  opacity: 1,
                },
              },
            ]

            // Add progress text only if progress > 0 and < 100
            if (progress > 0 && progress < 1) {
              children.push({
                type: 'text',
                style: {
                  x: start[0] + totalWidth / 2,
                  y: start[1],
                  text: `${task.progress}%`,
                  textAlign: 'center',
                  textVerticalAlign: 'middle',
                  fill: '#fff',
                  fontSize: 11,
                  fontWeight: 'bold',
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowBlur: 2,
                },
              })
            }

            return {
              type: 'group',
              children,
            }
          },
          encode: {
            x: [0, 1],
            y: 2,
          },
          data: chartData.map((item, index) => ({
            ...item,
            value: [item.value[0], item.value[1], index],
          })),
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

              // Create all markers including Today
              const todayTime = new Date().setHours(0, 0, 0, 0)

              // Filter milestones within date range
              const filteredMilestones = milestones
                .filter(milestone => {
                  const milestoneDate = new Date(milestone.date)
                  return milestoneDate >= minDate && milestoneDate <= maxDate
                })

              // Create marker objects with time for sorting
              const allMarkers: Array<{
                time: number
                isToday: boolean
                milestone?: Milestone
              }> = [
                { time: todayTime, isToday: true },
                ...filteredMilestones.map(m => ({
                  time: new Date(m.date).getTime(),
                  isToday: false,
                  milestone: m
                }))
              ]

              // Sort all markers by time
              allMarkers.sort((a, b) => a.time - b.time)

              // Calculate stair-step offsets for overlapping labels
              const proximityThresholdMs = 5 * 24 * 60 * 60 * 1000 // 5 days in milliseconds
              const baseDistance = 5
              const distanceIncrement = 20 // pixels to offset each overlapping label

              let currentOffset = 0
              let previousTime = 0

              return allMarkers.map((marker, index) => {
                // Check if this marker is close to the previous one
                if (index > 0 && (marker.time - previousTime) < proximityThresholdMs) {
                  // Increment offset for overlapping marker
                  currentOffset += distanceIncrement
                } else {
                  // Reset offset for well-separated markers
                  currentOffset = 0
                }

                previousTime = marker.time

                if (marker.isToday) {
                  // Today marker
                  return {
                    name: 'Today',
                    xAxis: marker.time,
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
                    xAxis: marker.time,
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
        // Second series: Projected tasks based on today's remaining estimates
        {
          type: 'custom',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          renderItem: (params: any, api: any) => {
            // Find the corresponding task index in validTasks
            const projectedTask = projectedTasks[params.dataIndex]
            const taskIndex = validTasks.findIndex(t => t.id === projectedTask.id)

            const categoryIndex = taskIndex // Use same Y position as the plan task
            const start = api.coord([api.value(0), categoryIndex])
            const end = api.coord([api.value(1), categoryIndex])
            const height = api.size([0, 1])[1] * 0.4 // Slightly smaller height

            const dataItem = projectedChartData[params.dataIndex]
            const color = dataItem?.itemStyle?.borderColor || '#B3B3BA'

            const totalWidth = end[0] - start[0]

            // Create dashed border rectangle for projection
            return {
              type: 'rect',
              shape: {
                x: start[0],
                y: start[1] - height / 2,
                width: totalWidth,
                height: height,
              },
              style: {
                fill: color,
                opacity: 0.2,
                stroke: color,
                lineWidth: 2,
                lineDash: [5, 5],
              },
            }
          },
          encode: {
            x: [0, 1],
            y: 2,
          },
          data: projectedChartData.map((item, index) => {
            // Find the corresponding task index in validTasks
            const projectedTask = projectedTasks[index]
            const taskIndex = validTasks.findIndex(t => t.id === projectedTask.id)
            return {
              ...item,
              value: [item.value[0], item.value[1], taskIndex],
            }
          }),
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
  }, [projectId, projectTitle, projectStartDate, tasks, milestones, getTaskResources, getTaskDependencies, getProjectResources, progressSnapshots, timeView])

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
      link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-gantt-chart.png`
      link.href = watermarkedUrl
      link.click()
    }
  }

  return (
    <div className="w-full relative">
      {/* Time View Selector */}
      <div className="absolute top-2 left-2 z-10 flex gap-1 bg-white dark:bg-navy-700 rounded-lg shadow-md border border-navy-200 dark:border-navy-600 p-1">
        <button
          onClick={() => setTimeView('day')}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
            timeView === 'day'
              ? 'bg-salmon-600 text-white shadow-sm'
              : 'text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-600'
          }`}
          title="Day view"
        >
          Day
        </button>
        <button
          onClick={() => setTimeView('week')}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
            timeView === 'week'
              ? 'bg-salmon-600 text-white shadow-sm'
              : 'text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-600'
          }`}
          title="Week view"
        >
          Week
        </button>
        <button
          onClick={() => setTimeView('month')}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
            timeView === 'month'
              ? 'bg-salmon-600 text-white shadow-sm'
              : 'text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-600'
          }`}
          title="Month view"
        >
          Month
        </button>
      </div>

      {/* Export Button */}
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

export default GanttChart
