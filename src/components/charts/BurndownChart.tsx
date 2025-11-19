import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { Task, Milestone } from '../../types/entities.types'
import { format, eachDayOfInterval, isAfter, subDays, startOfDay } from 'date-fns'
import { useEntitiesStore } from '../../stores/entitiesStore'

interface BurndownChartProps {
  projectId: string
  projectTitle: string
  tasks: Task[]
  milestones?: Milestone[]
}

const BurndownChart = ({ projectId, projectTitle, tasks, milestones = [] }: BurndownChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const { getTaskResources, getProjectResources } = useEntitiesStore()

  useEffect(() => {
    if (!chartRef.current || tasks.length === 0) return

    console.log('📈 BurndownChart received milestones:', milestones)

    // Filter tasks that have dates
    const validTasks = tasks.filter(t => t.startDate && t.endDate)
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

    // Calculate project bounds
    const allDates = validTasks.flatMap(t => [
      new Date(t.startDate!),
      new Date(t.endDate!)
    ])
    const projectEnd = new Date(Math.max(...allDates.map(d => d.getTime())))

    // Show last 5 days + future (from today - 5 days to projectEnd)
    const today = startOfDay(new Date())
    const fiveDaysAgo = subDays(today, 5)
    const chartStart = fiveDaysAgo
    const chartEnd = projectEnd

    // Generate days for the burndown chart (last 5 days + future)
    const allDays = eachDayOfInterval({ start: chartStart, end: chartEnd })

    // Get project resources to calculate daily capacity
    const projectResources = getProjectResources(projectId)

    // Task colors (consistent color per task)
    const taskColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#AAB7B8',
      '#EC7063', '#48C9B0', '#5DADE2', '#F5B041', '#AF7AC5'
    ]

    // Calculate initial effort for each task
    const taskInitialEffort = new Map<string, number>()
    validTasks.forEach(task => {
      const resources = getTaskResources(task.id)
      const effort = resources.reduce((sum, resource) => {
        return sum + (resource.estimatedDays * (resource.focusFactor / 100))
      }, 0)
      taskInitialEffort.set(task.id, effort)
    })

    // Calculate remaining effort for each task on each day
    const taskRemainingByDay = validTasks.map(task => {
      const initialEffort = taskInitialEffort.get(task.id) || 0
      const taskResources = getTaskResources(task.id)
      const taskStart = new Date(task.startDate!)
      const taskEnd = new Date(task.endDate!)

      return {
        task,
        color: taskColors[validTasks.indexOf(task) % taskColors.length],
        data: allDays.map((date) => {
          const isPast = !isAfter(date, today)

          // If task is done, remaining effort is 0
          if (task.status === 'Done') {
            const doneDate = new Date(task.endDate!)
            return date >= doneDate ? 0 : initialEffort
          }

          // For past dates, if task hasn't started or is in progress, show initial effort
          if (isPast) {
            return initialEffort
          }

          // For future dates, project burndown based on resource capacity
          // Only burn down if the task is active on this date
          if (date < taskStart || date > taskEnd) {
            return initialEffort // Not started yet or already finished
          }

          // Calculate daily capacity for this task from project resources
          const dailyCapacity = taskResources.reduce((sum, taskResource) => {
            // Find the project resource to get numberOfResources
            const projectResource = projectResources.find(pr => pr.id === taskResource.id)
            const numberOfResources = projectResource?.numberOfResources || 1
            const focusFactor = projectResource?.focusFactor || 100

            // Daily capacity = numberOfResources * (focusFactor / 100)
            return sum + (numberOfResources * (focusFactor / 100))
          }, 0)

          // Calculate days elapsed since today
          const daysFromToday = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          const workDone = daysFromToday * dailyCapacity

          return Math.max(0, initialEffort - workDone)
        })
      }
    })

    // Detect dark mode
    const isDarkMode = document.documentElement.classList.contains('dark')
    const textColor = isDarkMode ? '#E8E8EA' : '#2E2E36'
    const gridColor = isDarkMode ? '#3D3D47' : '#E8E8EA'
    const backgroundColor = isDarkMode ? '#262629' : '#ffffff'

    const option: echarts.EChartsOption = {
      backgroundColor: backgroundColor,
      title: {
        text: `${projectTitle} - Burndown Chart`,
        left: 'center',
        textStyle: {
          color: textColor,
          fontSize: 18,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (params: any) {
          const date = params[0]?.axisValue || ''
          let totalRemaining = 0
          let result = `<div style="padding: 8px; min-width: 200px;"><div style="font-weight: 600; margin-bottom: 8px;">${date}</div>`

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params.forEach((param: any) => {
            const value = param.value
            if (value > 0) {
              totalRemaining += value
              const color = param.color
              const name = param.seriesName
              result += `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 4px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; background-color: ${color};"></span>
                    <span style="font-size: 12px; color: #374151;">${name}</span>
                  </div>
                  <span style="font-size: 12px; font-weight: 600; color: #1f2937;">${value.toFixed(1)}d</span>
                </div>
              `
            }
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
        data: taskRemainingByDay.map(t => t.task.title),
        top: 40,
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
        data: allDays.map(d => format(d, 'MMM dd')),
        axisLabel: {
          color: textColor,
          rotate: 45,
          interval: Math.floor(allDays.length / 10), // Show ~10 labels
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
          data: taskData.data,
          itemStyle: {
            color: taskData.color,
          },
          emphasis: {
            focus: 'series' as const,
          },
        })),
        // Add "Today" and milestone markers using a dummy line series
        {
          name: 'Markers',
          type: 'line' as const,
          data: [], // No data, just markers
          markLine: {
            silent: false,
            symbol: ['none', 'none'],
            data: [
              // Today marker
              {
                name: 'Today',
                xAxis: allDays.findIndex(day => format(day, 'MMM dd') === format(today, 'MMM dd')),
                label: {
                  show: true,
                  position: 'insideEndTop' as const,
                  formatter: 'Today',
                  color: '#ef4444',
                  fontSize: 12,
                  fontWeight: 'bold' as const,
                },
                lineStyle: {
                  color: '#ef4444',
                  width: 3,
                  type: 'solid' as const,
                },
              },
              // Milestone markers
              ...milestones.map(milestone => {
                const milestoneDate = new Date(milestone.date)
                const dateStr = format(milestoneDate, 'MMM dd')
                const index = allDays.findIndex(day => format(day, 'MMM dd') === dateStr)
                return {
                  name: milestone.title,
                  xAxis: index >= 0 ? index : dateStr,
                  label: {
                    show: true,
                    position: 'insideEndTop' as const,
                    formatter: milestone.title,
                    color: '#9333ea',
                    fontSize: 11,
                    fontWeight: 600 as const,
                  },
                  lineStyle: {
                    color: '#9333ea',
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
  }, [projectId, projectTitle, tasks, milestones, getTaskResources, getProjectResources])

  // Show message if no tasks have dates
  const validTasks = tasks.filter(t => t.startDate && t.endDate)
  if (validTasks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-navy-300 dark:text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-navy-600 dark:text-navy-400 text-lg mb-2">No Task Dates Available</p>
          <p className="text-navy-500 dark:text-navy-500 text-sm">
            Tasks need start and end dates to display in the Burndown chart.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div ref={chartRef} style={{ width: '100%', height: '500px' }} />
    </div>
  )
}

export default BurndownChart
