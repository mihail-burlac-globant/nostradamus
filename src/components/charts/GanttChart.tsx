import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { Task, Milestone } from '../../types/entities.types'
import { format } from 'date-fns'
import { useEntitiesStore } from '../../stores/entitiesStore'

interface GanttChartProps {
  projectId: string
  projectTitle: string
  projectStartDate?: string
  tasks: Task[]
  milestones?: Milestone[]
}

const GanttChart = ({ projectTitle, projectStartDate, tasks, milestones = [] }: GanttChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const { getTaskResources, getTaskDependencies } = useEntitiesStore()

  useEffect(() => {
    if (!chartRef.current || tasks.length === 0) return

    console.log('📊 GanttChart received milestones:', milestones)
    // Debug: Log each milestone's icon value
    milestones.forEach(m => {
      console.log(`  Milestone "${m.title}": icon="${m.icon}", color="${m.color}"`)
    })

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

      // Calculate duration from resource estimates
      const resources = getTaskResources(task.id)
      const totalDays = resources.reduce((sum, r) => sum + (r.estimatedDays * (r.focusFactor / 100)), 0)
      const durationDays = totalDays > 0 ? Math.ceil(totalDays) : 1

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

    // Convert tasks to chart format
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

    // Calculate project bounds
    const allDates = validTasks.flatMap(t => [
      new Date(t.startDate!).getTime(),
      new Date(t.endDate!).getTime()
    ])
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
          const start = format(new Date(params.value[0]), 'MMM dd, yyyy')
          const end = format(new Date(params.value[1]), 'MMM dd, yyyy')
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
          formatter: (value: number) => format(new Date(value), 'MMM dd'),
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
            data: [
              // Today marker
              {
                name: 'Today',
                xAxis: new Date().setHours(0, 0, 0, 0),
                label: {
                  show: true,
                  position: 'end' as const,
                  formatter: 'Today',
                  color: '#ef4444',
                  fontSize: 12,
                  fontWeight: 'bold' as const,
                  distance: 5,
                  rotate: 0,
                },
                lineStyle: {
                  color: '#ef4444',
                  width: 3,
                  type: 'solid' as const,
                },
              },
              // Milestone markers (only show those within the visible date range)
              ...milestones
                .filter(milestone => {
                  const milestoneDate = new Date(milestone.date)
                  return milestoneDate >= minDate && milestoneDate <= maxDate
                })
                .map(milestone => {
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
                  // Normalize icon name (trim, lowercase) for case-insensitive matching
                  const normalizedIcon = (milestone.icon || '').trim().toLowerCase()
                  const iconSymbol = iconSymbols[normalizedIcon] || '📍'

                  // Debug: Log if icon is not found
                  if (!iconSymbols[normalizedIcon]) {
                    console.warn(`⚠️ Unknown milestone icon "${milestone.icon}" for milestone "${milestone.title}". Using fallback.`)
                  }

                  return {
                    name: milestone.title,
                    xAxis: new Date(milestone.date).getTime(),
                    label: {
                      show: true,
                      position: 'end' as const,
                      formatter: `${iconSymbol} ${milestone.title}`,
                      color: milestone.color,
                      fontSize: 11,
                      fontWeight: 600 as const,
                      distance: 5,
                      rotate: 0,
                    },
                    lineStyle: {
                      color: milestone.color,
                      width: 2,
                      type: 'dashed' as const,
                    },
                  }
                }),
            ],
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
  }, [projectTitle, projectStartDate, tasks, milestones, getTaskResources, getTaskDependencies])

  const handleExportPNG = () => {
    if (chartInstance.current) {
      const url = chartInstance.current.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
      })

      const link = document.createElement('a')
      link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-gantt-chart.png`
      link.href = url
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

export default GanttChart
