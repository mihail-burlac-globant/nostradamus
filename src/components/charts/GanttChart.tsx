import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { Task, Milestone } from '../../types/entities.types'
import { format } from 'date-fns'

interface GanttChartProps {
  projectId: string
  projectTitle: string
  tasks: Task[]
  milestones?: Milestone[]
}

const GanttChart = ({ projectTitle, tasks, milestones = [] }: GanttChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || tasks.length === 0) return

    // Filter tasks that have both start and end dates
    const validTasks = tasks.filter(t => t.startDate && t.endDate)
    if (validTasks.length === 0) {
      // Show message if no tasks have dates
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

          return `
            <div style="padding: 8px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${task.title}</div>
              <div style="font-size: 12px; color: #666;">
                <div>Start: ${start}</div>
                <div>End: ${end}</div>
                <div>Duration: ${duration} days</div>
                <div>Status: ${task.status}</div>
              </div>
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

            // Get color from the data item using dataIndex
            const dataItem = chartData[params.dataIndex]
            const color = dataItem?.itemStyle?.color || '#B3B3BA'

            return {
              type: 'rect',
              shape: {
                x: start[0],
                y: start[1] - height / 2,
                width: end[0] - start[0],
                height: height,
              },
              style: {
                fill: color,
              },
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
                  position: 'insideEndTop',
                  formatter: 'Today',
                  color: '#ef4444',
                  fontSize: 12,
                  fontWeight: 'bold',
                },
                lineStyle: {
                  color: '#ef4444',
                  width: 3,
                  type: 'solid',
                },
              },
              // Milestone markers
              ...milestones.map(milestone => ({
                name: milestone.title,
                xAxis: new Date(milestone.date).getTime(),
                label: {
                  show: true,
                  position: 'insideEndTop',
                  formatter: milestone.title,
                  color: '#9333ea',
                  fontSize: 11,
                  fontWeight: 600,
                },
                lineStyle: {
                  color: '#9333ea',
                  width: 2,
                  type: 'dashed',
                },
              })),
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
  }, [projectTitle, tasks, milestones])

  // Show message if no tasks have dates
  const validTasks = tasks.filter(t => t.startDate && t.endDate)
  if (validTasks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-navy-300 dark:text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-navy-600 dark:text-navy-400 text-lg mb-2">No Task Dates Available</p>
          <p className="text-navy-500 dark:text-navy-500 text-sm">
            Tasks need start and end dates to display in the Gantt chart.
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

export default GanttChart
