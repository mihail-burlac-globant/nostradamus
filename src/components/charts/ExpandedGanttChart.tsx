import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { Task, Milestone } from '../../types/entities.types'
import { format, isWeekend, addDays } from 'date-fns'
import { useEntitiesStore } from '../../stores/entitiesStore'
import { getResourceIconEmoji } from '../../utils/resourceIconEmojis'
import { addWatermarkToChart } from '../../utils/chartWatermark'

interface ExpandedGanttChartProps {
  projectId: string
  projectTitle: string
  projectStartDate?: string
  tasks: Task[]
  milestones?: Milestone[]
  onClose: () => void
}

const ExpandedGanttChart = ({
  projectId,
  projectTitle,
  projectStartDate,
  tasks,
  milestones = [],
  onClose
}: ExpandedGanttChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const { getTaskResources, getTaskDependencies, getProjectResources, progressSnapshots } = useEntitiesStore()

  useEffect(() => {
    if (!chartRef.current || tasks.length === 0) return

    const addWorkingDays = (startDate: Date, workingDays: number): Date => {
      let result = new Date(startDate)
      let daysAdded = 0

      while (daysAdded < workingDays) {
        result = addDays(result, 1)
        if (!isWeekend(result)) {
          daysAdded++
        }
      }

      return result
    }

    const skipToNextWeekday = (date: Date): Date => {
      let result = new Date(date)
      while (isWeekend(result)) {
        result = addDays(result, 1)
      }
      return result
    }

    const countWorkingDays = (startDate: Date, endDate: Date): number => {
      let count = 0
      let current = new Date(startDate)
      while (current < endDate) {
        if (!isWeekend(current)) {
          count++
        }
        current = addDays(current, 1)
      }
      return count
    }

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
        earliestStart = skipToNextWeekday(earliestStart)
      }

      const today = new Date()
      const taskSnapshots = progressSnapshots
        .filter(s => s.taskId === task.id && new Date(s.date) <= today)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const todaySnapshot = taskSnapshots.length > 0 ? taskSnapshots[0] : undefined

      if (todaySnapshot && todaySnapshot.progress > 0 && todaySnapshot.remainingEstimate > 0) {
        const todayAsStart = skipToNextWeekday(today)
        earliestStart = new Date(Math.max(earliestStart.getTime(), todayAsStart.getTime()))
      }

      const resources = getTaskResources(task.id)
      const projectResources = getProjectResources(projectId)
      const resourceDurations: number[] = []

      if (todaySnapshot && todaySnapshot.remainingEstimate > 0) {
        const remainingEstimate = todaySnapshot.remainingEstimate

        const totalEffort = resources.reduce((sum, resource) => {
          const numberOfProfiles = resource.numberOfProfiles || 1
          const projectResource = projectResources.find(pr => pr.id === resource.id)
          const focusFactor = (resource.focusFactor || projectResource?.focusFactor || 100) / 100
          return sum + (numberOfProfiles * focusFactor)
        }, 0)

        const duration = totalEffort > 0 ? remainingEstimate / totalEffort : remainingEstimate
        resourceDurations.push(duration)
      } else {
        resources.forEach(taskResource => {
          const workDays = taskResource.estimatedDays
          const numberOfProfiles = taskResource.numberOfProfiles || 1
          const projectResource = projectResources.find(pr => pr.id === taskResource.id)
          const focusFactor = (taskResource.focusFactor || projectResource?.focusFactor || 100) / 100
          const duration = workDays / (numberOfProfiles * focusFactor)
          resourceDurations.push(duration)
        })
      }

      const durationDays = resourceDurations.length > 0
        ? Math.ceil(Math.max(...resourceDurations))
        : 1

      const endDate = addWorkingDays(earliestStart, durationDays)

      const result = { start: earliestStart, end: endDate }
      taskDateMap.set(task.id, result)
      return result
    }

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

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    const taskScopeInfo = new Map<string, { hasScopeIncrease: boolean; scopeIncreaseDays: number }>()
    const todayDate = new Date()

    validTasks.forEach(task => {
      const taskSnapshots = progressSnapshots
        .filter(s => s.taskId === task.id && new Date(s.date) <= todayDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const latestSnapshot = taskSnapshots.length > 0 ? taskSnapshots[0] : undefined

      if (latestSnapshot) {
        const resources = getTaskResources(task.id)
        const totalEffort = resources.reduce((sum, resource) => sum + resource.estimatedDays, 0)
        const theoreticalRemaining = totalEffort * (1 - latestSnapshot.progress / 100)
        const scopeIncrease = latestSnapshot.remainingEstimate - theoreticalRemaining

        if (scopeIncrease > 0) {
          taskScopeInfo.set(task.id, {
            hasScopeIncrease: true,
            scopeIncreaseDays: scopeIncrease
          })
        }
      }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const chartData = validTasks.map((task) => {
      const startDate = new Date(task.startDate!)
      let endDate = new Date(task.endDate!)

      const scopeInfo = taskScopeInfo.get(task.id)
      if (scopeInfo?.hasScopeIncrease) {
        endDate = addWorkingDays(endDate, Math.ceil(scopeInfo.scopeIncreaseDays))
      }

      const taskEndDate = new Date(task.endDate!)
      taskEndDate.setHours(0, 0, 0, 0)
      const isPast = taskEndDate < today

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
        name: task.title,
        value: [
          startDate.getTime(),
          endDate.getTime(),
          0,
        ],
        itemStyle: {
          color: color,
        },
        scopeInfo: scopeInfo,
        isPast: isPast,
      }
    })

    const allDates = validTasks.flatMap(t => [
      new Date(t.startDate!).getTime(),
      new Date(t.endDate!).getTime()
    ])
    const minDate = new Date(Math.min(...allDates))
    const maxDate = new Date(Math.max(...allDates))

    const isDarkMode = document.documentElement.classList.contains('dark')
    const textColor = isDarkMode ? '#E8E8EA' : '#2E2E36'
    const gridColor = isDarkMode ? '#3D3D47' : '#E8E8EA'
    const backgroundColor = isDarkMode ? '#262629' : '#ffffff'

    const option: echarts.EChartsOption = {
      backgroundColor: backgroundColor,
      title: {
        text: `${projectTitle} - Gantt Chart (Expanded Daily View)`,
        left: 'center',
        top: 10,
        textStyle: {
          color: textColor,
          fontSize: 24,
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
          const duration = countWorkingDays(startDate, endDate)

          const taskResources = getTaskResources(task.id)
          const totalEffort = taskResources.reduce((sum, resource) => sum + resource.estimatedDays, 0)

          const resourcesHtml = taskResources.length > 0
            ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <div style="font-weight: 600; margin-bottom: 4px; color: #374151;">Resources:</div>
                ${taskResources.map(resource => {
                  const numberOfProfiles = resource.numberOfProfiles || 1
                  const multiplier = numberOfProfiles > 1 ? `${numberOfProfiles}x ` : ''
                  const iconEmoji = getResourceIconEmoji(resource.icon)
                  return `
                    <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                      <span style="color: #6b7280;">${iconEmoji} ${multiplier}${resource.title}</span>
                      <span style="color: #9ca3af; font-size: 11px;">${resource.estimatedDays}d @ ${resource.focusFactor}%</span>
                    </div>
                  `
                }).join('')}
              </div>`
            : ''

          return `
            <div style="padding: 8px; min-width: 200px;">
              <div style="font-weight: 600; margin-bottom: 8px; color: #111827;">${task.title}</div>
              <div style="font-size: 12px; color: #6b7280;">
                <div style="margin-bottom: 2px;">Start: <strong>${start}</strong></div>
                <div style="margin-bottom: 2px;">End: <strong>${end}</strong></div>
                <div style="margin-bottom: 2px;">Duration: <strong>${duration} working days</strong></div>
                <div style="margin-bottom: 2px;">Effort: <strong>${totalEffort} person-days</strong></div>
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
        right: '8%',
        top: 80,
        bottom: 120,
      },
      // Enable data zoom for better navigation
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: 0,
          start: 0,
          end: 100,
          bottom: 60,
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          start: 0,
          end: 100,
        },
      ],
      xAxis: {
        type: 'time',
        min: minDate.getTime(),
        max: maxDate.getTime(),
        axisLabel: {
          // Show daily labels
          formatter: (value: number) => {
            const date = new Date(value)
            return format(date, 'EEE MMM dd')
          },
          color: textColor,
          rotate: 45,
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
        // Set to show daily intervals
        minInterval: 3600 * 1000 * 24, // 1 day in milliseconds
      },
      yAxis: {
        type: 'category',
        data: validTasks.map(t => t.title),
        axisLabel: {
          color: textColor,
          formatter: (value: string) => {
            return value.length > 40 ? value.substring(0, 40) + '...' : value
          },
          fontSize: 11,
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

            const dataItem = chartData[params.dataIndex]
            const task = validTasks[params.dataIndex]
            const color = dataItem?.itemStyle?.color || '#B3B3BA'
            const progress = task.progress / 100
            const scopeInfo = dataItem?.scopeInfo
            const isPast = dataItem?.isPast || false

            const totalWidth = end[0] - start[0]
            const completedWidth = totalWidth * progress

            let baseWidth = totalWidth
            let scopeIncreaseWidth = 0

            if (scopeInfo?.hasScopeIncrease) {
              const originalEndDate = new Date(task.endDate!)
              const originalEndCoord = api.coord([originalEndDate.getTime(), categoryIndex])
              baseWidth = originalEndCoord[0] - start[0]
              scopeIncreaseWidth = totalWidth - baseWidth
            }

            // Apply opacity: future = 1.0 (full color), past = 0.3 (dimmed)
            const taskOpacity = isPast ? 0.3 : 1.0

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const children: any[] = [
              // Background bar (remaining work) - base portion
              {
                type: 'rect',
                shape: {
                  x: start[0],
                  y: start[1] - height / 2,
                  width: baseWidth,
                  height: height,
                },
                style: {
                  fill: color,
                  opacity: taskOpacity * 0.4, // Lighter shade for remaining work
                },
              },
            ]

            // Add completed work with striped pattern
            if (progress > 0 && completedWidth > 0) {
              // Base rectangle for completed portion (lighter background)
              children.push({
                type: 'rect',
                shape: {
                  x: start[0],
                  y: start[1] - height / 2,
                  width: completedWidth,
                  height: height,
                },
                style: {
                  fill: color,
                  opacity: taskOpacity * 0.5, // Base for completed work
                },
              })

              // Add diagonal stripes for completed portion
              const stripeWidth = 4 // Width of each stripe
              const stripeSpacing = 8 // Space between stripes
              const stripeAngle = 45 // Degrees

              // Calculate how many stripes we need
              const totalDistance = completedWidth + height // Account for diagonal
              const numStripes = Math.ceil(totalDistance / stripeSpacing)

              for (let i = 0; i < numStripes; i++) {
                const offsetX = i * stripeSpacing - height // Start offset

                children.push({
                  type: 'polygon',
                  shape: {
                    points: [
                      [start[0] + offsetX, start[1] + height / 2],
                      [start[0] + offsetX + stripeWidth, start[1] + height / 2],
                      [start[0] + offsetX + height + stripeWidth, start[1] - height / 2],
                      [start[0] + offsetX + height, start[1] - height / 2],
                    ]
                  },
                  style: {
                    fill: color,
                    opacity: taskOpacity, // Full taskOpacity for stripes
                  },
                  // Clip to completed width
                  clipPath: {
                    type: 'rect',
                    shape: {
                      x: start[0],
                      y: start[1] - height / 2,
                      width: completedWidth,
                      height: height,
                    }
                  }
                })
              }
            }

            if (scopeInfo?.hasScopeIncrease && scopeIncreaseWidth > 0) {
              children.push(
                {
                  type: 'rect',
                  shape: {
                    x: start[0] + baseWidth,
                    y: start[1] - height / 2,
                    width: scopeIncreaseWidth,
                    height: height,
                  },
                  style: {
                    fill: color,
                    opacity: taskOpacity * 0.2,
                  },
                },
                {
                  type: 'rect',
                  shape: {
                    x: start[0] + baseWidth,
                    y: start[1] - height / 2,
                    width: scopeIncreaseWidth,
                    height: height,
                  },
                  style: {
                    fill: 'transparent',
                    stroke: '#ef4444',
                    lineWidth: 2,
                    opacity: taskOpacity,
                  },
                }
              )
            }

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
                  opacity: 1.0,
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
              const iconSymbols: Record<string, string> = {
                flag: '🚩',
                star: '⭐',
                trophy: '🏆',
                target: '🎯',
                check: '✅',
                calendar: '📅',
                rocket: '🚀',
              }

              const todayTime = new Date().setHours(0, 0, 0, 0)

              const filteredMilestones = milestones
                .filter(milestone => {
                  const milestoneDate = new Date(milestone.date)
                  return milestoneDate >= minDate && milestoneDate <= maxDate
                })

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

              allMarkers.sort((a, b) => a.time - b.time)

              const proximityThresholdMs = 5 * 24 * 60 * 60 * 1000
              const baseDistance = 5
              const distanceIncrement = 25

              let currentOffset = 0
              let previousTime = 0

              return allMarkers.map((marker, index) => {
                if (index > 0 && (marker.time - previousTime) < proximityThresholdMs) {
                  currentOffset += distanceIncrement
                } else {
                  currentOffset = 0
                }

                previousTime = marker.time

                if (marker.isToday) {
                  return {
                    name: 'Today',
                    xAxis: marker.time,
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
                } else {
                  const milestone = marker.milestone!
                  const normalizedIcon = (milestone.icon || '').trim().toLowerCase()
                  const iconSymbol = iconSymbols[normalizedIcon] || '📍'

                  return {
                    name: milestone.title,
                    xAxis: marker.time,
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
  }, [projectId, projectTitle, projectStartDate, tasks, milestones, getTaskResources, getTaskDependencies, getProjectResources, progressSnapshots])

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
      link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-gantt-chart-expanded.png`
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

export default ExpandedGanttChart
