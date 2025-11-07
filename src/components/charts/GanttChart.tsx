import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { useProjectStore } from '../../stores/projectStore'
import { format, getWeek, startOfWeek, addWeeks, isBefore } from 'date-fns'

type XAxisFormat = 'day' | 'week' | 'month'

const GanttChart = () => {
  const { projectData } = useProjectStore()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [xAxisFormat, setXAxisFormat] = useState<XAxisFormat>('day')

  const handleExportPNG = () => {
    if (!chartInstance.current) return

    // Save current options
    const currentOptions = chartInstance.current.getOption()

    // Force dark text colors for export on white background
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xAxis = currentOptions.xAxis as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yAxis = currentOptions.yAxis as any

    const exportOptions = {
      ...currentOptions,
      xAxis: {
        ...xAxis,
        axisLabel: {
          ...xAxis?.axisLabel,
          color: '#2E2E36',
        },
        axisLine: {
          lineStyle: {
            color: '#D1D1D5',
          },
        },
      },
      yAxis: {
        ...yAxis,
        axisLabel: {
          ...yAxis?.axisLabel,
          color: '#2E2E36',
        },
        axisLine: {
          lineStyle: {
            color: '#D1D1D5',
          },
        },
      },
    }

    // Apply export-friendly options temporarily
    chartInstance.current.setOption(exportOptions)

    // Small delay to ensure rendering is complete
    setTimeout(() => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx || !chartInstance.current) return

      // Get chart image with white background
      const chartImage = new Image()
      chartImage.src = chartInstance.current.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      })

      chartImage.onload = () => {
        canvas.width = chartImage.width
        canvas.height = chartImage.height + 60 // Extra space for watermark

        // Draw white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(chartImage, 0, 0)

        // Draw watermark
        const watermarkY = canvas.height - 35

        // Load logo
        const logo = new Image()
        logo.src = '/logo.svg'
        logo.onload = () => {
          ctx.drawImage(logo, 40, watermarkY - 10, 30, 30)

          // Add text with dark color
          ctx.font = '14px Inter, sans-serif'
          ctx.fillStyle = '#2E2E36'
          ctx.fillText('Nostradamus — Project Intelligence', 80, watermarkY + 8)

          // Download
          const link = document.createElement('a')
          link.download = `gantt-chart-${format(new Date(), 'yyyy-MM-dd')}.png`
          link.href = canvas.toDataURL('image/png')
          link.click()

          // Restore original options after export
          if (chartInstance.current) {
            chartInstance.current.setOption(currentOptions)
          }
        }

        logo.onerror = () => {
          // If logo fails to load, still download without it
          const link = document.createElement('a')
          link.download = `gantt-chart-${format(new Date(), 'yyyy-MM-dd')}.png`
          link.href = canvas.toDataURL('image/png')
          link.click()

          // Restore original options
          if (chartInstance.current) {
            chartInstance.current.setOption(currentOptions)
          }
        }
      }
    }, 100)
  }

  useEffect(() => {
    if (!chartRef.current || !projectData) return

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    // Prepare data for Gantt chart with premium colors
    const tasks = projectData.tasks.map((task) => ({
      name: task.name,
      value: [
        task.startDate.getTime(),
        task.endDate.getTime(),
        task.progress,
      ],
      itemStyle: {
        color:
          task.status === 'completed'
            ? '#2DD4BF' // Teal for completed
            : task.status === 'in-progress'
            ? '#FF9A66' // Salmon for in-progress
            : task.status === 'blocked'
            ? '#FF7C7C' // Coral for blocked
            : '#B3B3BA', // Navy gray for not started
      },
    }))

    // Detect dark mode
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const textColor = isDarkMode ? '#E8E8EA' : '#2E2E36'

    // Calculate label interval based on project duration and format
    const projectDuration = Math.ceil(
      (projectData.endDate.getTime() - projectData.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Calculate time intervals in milliseconds
    const DAY_MS = 24 * 60 * 60 * 1000
    const WEEK_MS = 7 * DAY_MS
    const MONTH_MS = 30 * DAY_MS // Approximate

    // Maximum number of labels that fit comfortably on screen (rotated at 45 degrees)
    const MAX_LABELS = 40

    // For week view: Calculate ALL weeks between first and last task, then select which to display
    const selectedWeeksSet = new Set<string>() // Store as "YYYY-Wnn" format for uniqueness
    if (xAxisFormat === 'week') {
      // Find actual project start and end from tasks
      const projectStart = projectData.startDate
      const projectEnd = projectData.endDate

      // Calculate all week starts (Mondays) in the period
      const allWeeks: Date[] = []
      let currentWeek = startOfWeek(projectStart, { weekStartsOn: 1 })

      while (isBefore(currentWeek, projectEnd) || currentWeek.getTime() === projectEnd.getTime()) {
        allWeeks.push(new Date(currentWeek))
        currentWeek = addWeeks(currentWeek, 1)
      }

      // If we have ≤40 weeks: select all
      // If we have >40 weeks: select 40 distributed equally
      let selectedWeeks: Date[]
      if (allWeeks.length <= MAX_LABELS) {
        selectedWeeks = allWeeks
      } else {
        selectedWeeks = []
        const step = allWeeks.length / MAX_LABELS
        for (let i = 0; i < MAX_LABELS; i++) {
          const index = Math.floor(i * step)
          selectedWeeks.push(allWeeks[index])
        }
      }

      // Store selected weeks in Set for fast lookup (format: "YYYY-Wnn")
      selectedWeeks.forEach(week => {
        const key = `${format(week, 'yyyy')}-W${getWeek(week)}`
        selectedWeeksSet.add(key)
      })
    }

    // Determine axis configuration based on format
    let minInterval: number | undefined
    let maxInterval: number | undefined
    let splitNumber: number | undefined

    if (xAxisFormat === 'month') {
      minInterval = MONTH_MS
      maxInterval = undefined
      splitNumber = undefined
    } else if (xAxisFormat === 'week') {
      // Generate enough ticks to cover all weeks
      minInterval = WEEK_MS
      maxInterval = WEEK_MS
      splitNumber = undefined
    } else { // day
      minInterval = DAY_MS
      maxInterval = undefined
      splitNumber = Math.min(projectDuration, MAX_LABELS)
    }

    // X-axis formatter based on selected format
    const getXAxisFormatter = (value: number) => {
      const date = new Date(value)
      switch (xAxisFormat) {
        case 'month':
          return format(date, 'MMM yyyy')
        case 'week': {
          // Only show label if this week is in our selected set
          const key = `${format(date, 'yyyy')}-W${getWeek(date)}`
          if (selectedWeeksSet.has(key)) {
            return `W${getWeek(date)}`
          }
          return '' // Hide this label
        }
        case 'day':
        default:
          return format(date, 'MMM dd')
      }
    }

    // Helper function to truncate and wrap task names
    const formatTaskName = (name: string, maxLength: number = 30) => {
      if (name.length <= maxLength) return name
      // Truncate with ellipsis
      return name.substring(0, maxLength) + '...'
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const task = projectData.tasks[params.dataIndex]
          let tooltip = `<strong>${task.name}</strong><br/>`
          tooltip += `Start: ${format(task.startDate, 'MMM dd, yyyy')}<br/>`
          tooltip += `End: ${format(task.endDate, 'MMM dd, yyyy')}<br/>`
          tooltip += `Progress: ${task.progress}%<br/>`
          tooltip += `Status: ${task.status}<br/>`

          if (task.assignee) {
            tooltip += `Assignee: ${task.assignee}<br/>`
          }
          if (task.profile_type) {
            tooltip += `Profile: ${task.profile_type}<br/>`
          }
          if (task.remaining_estimate_hours !== undefined) {
            tooltip += `Remaining: ${task.remaining_estimate_hours}h<br/>`
          }
          if (task.dependency) {
            tooltip += `Depends on: ${task.dependency}<br/>`
          }

          return tooltip
        },
      },
      grid: {
        left: '15%',
        right: '5%',
        top: '10%',
        bottom: '15%', // More space for rotated labels
      },
      xAxis: {
        type: 'time',
        minInterval: minInterval,
        maxInterval: maxInterval,
        splitNumber: splitNumber,
        axisLabel: {
          formatter: getXAxisFormatter,
          color: textColor,
          fontFamily: 'Inter, sans-serif',
          rotate: 45,
          fontSize: 10,
          margin: 8,
        } as any,
        axisLine: {
          lineStyle: {
            color: isDarkMode ? '#5A5A66' : '#D1D1D5',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: projectData.tasks.map((task) => formatTaskName(task.name)),
        axisLabel: {
          fontSize: 11,
          color: textColor,
          fontFamily: 'Inter, sans-serif',
          width: 120,
          overflow: 'truncate',
          ellipsis: '...',
        } as any, // ECharts supports these properties but TypeScript doesn't recognize them
        axisLine: {
          lineStyle: {
            color: isDarkMode ? '#5A5A66' : '#D1D1D5',
          },
        },
      },
      series: [
        {
          type: 'custom',
          renderItem: (params, api) => {
            const categoryIndex = api.value(0) as number
            const start = api.coord([api.value(1), categoryIndex])
            const end = api.coord([api.value(2), categoryIndex])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const height = (api.size!([0, 1]) as any)[1] * 0.6
            const progress = api.value(3) as number

            const totalWidth = end[0] - start[0]
            const completedWidth = totalWidth * (progress / 100)

            // Get the base color for this task
            const task = projectData.tasks[params.dataIndex!]
            let baseColor = '#B3B3BA' // Default for not started
            if (task.status === 'completed') baseColor = '#2DD4BF'
            else if (task.status === 'in-progress') baseColor = '#FF9A66'
            else if (task.status === 'blocked') baseColor = '#FF7C7C'

            // Create stacked bar with completed and remaining portions
            const rectY = start[1] - height / 2

            return {
              type: 'group',
              children: [
                // Remaining portion (background - lighter/semi-transparent)
                {
                  type: 'rect',
                  shape: {
                    x: start[0],
                    y: rectY,
                    width: totalWidth,
                    height: height,
                  },
                  style: {
                    fill: baseColor,
                    opacity: 0.25,
                  },
                },
                // Completed portion (foreground - solid)
                {
                  type: 'rect',
                  shape: {
                    x: start[0],
                    y: rectY,
                    width: completedWidth,
                    height: height,
                  },
                  style: {
                    fill: baseColor,
                    opacity: 1,
                  },
                },
                // Border for the entire bar
                {
                  type: 'rect',
                  shape: {
                    x: start[0],
                    y: rectY,
                    width: totalWidth,
                    height: height,
                  },
                  style: {
                    fill: 'transparent',
                    stroke: baseColor,
                    lineWidth: 1,
                  },
                },
              ],
            }
          },
          encode: {
            x: [1, 2],
            y: 0,
          },
          data: tasks.map((task, index) => [
            index,
            task.value[0],
            task.value[1],
            task.value[2], // progress
          ]),
          markLine: {
            symbol: 'none',
            silent: false,
            animation: false,
            label: {
              formatter: 'Today',
              position: 'insideEndTop',
              color: textColor,
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              fontWeight: 'bold',
            },
            lineStyle: {
              color: '#FF9A66',
              width: 2,
              type: 'solid',
            },
            data: [
              {
                xAxis: new Date().getTime(),
              },
            ],
          },
        },
      ],
    }

    chartInstance.current.setOption(option)

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [projectData, xAxisFormat])

  return (
    <div className="w-full">
      {/* Header with Export Button */}
      <div className="flex items-start justify-between mb-3 pb-3 border-b border-navy-100 dark:border-navy-700">
        <div>
          <h3 className="text-h3 font-serif text-navy-900 dark:text-white mb-1">
            Gantt Chart
          </h3>
          <p className="text-body-sm text-navy-600 dark:text-navy-400">
            Project timeline visualization with task dependencies and progress
          </p>
        </div>
        <button
          onClick={handleExportPNG}
          className="flex items-center gap-2 px-4 py-2 bg-salmon-600 hover:bg-salmon-700
                   text-white font-medium text-sm rounded-lg transition-all duration-200
                   shadow-soft hover:shadow-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export PNG
        </button>
      </div>

      {/* X-Axis Format Selector */}
      <div className="flex items-center gap-2 mb-3">
        <label className="text-sm font-medium text-navy-700 dark:text-navy-300">
          Timeline View:
        </label>
        <div className="flex gap-1 bg-navy-100 dark:bg-navy-800 rounded-lg p-1">
          <button
            onClick={() => setXAxisFormat('day')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              xAxisFormat === 'day'
                ? 'bg-salmon-600 text-white shadow-sm'
                : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-white'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setXAxisFormat('week')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              xAxisFormat === 'week'
                ? 'bg-salmon-600 text-white shadow-sm'
                : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-white'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setXAxisFormat('month')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              xAxisFormat === 'month'
                ? 'bg-salmon-600 text-white shadow-sm'
                : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-white'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="w-full h-[calc(100vh-420px)] min-h-[400px]" />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-navy-100 dark:border-navy-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#FF9A66]"></div>
          <span className="text-sm text-navy-600 dark:text-navy-400">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#2DD4BF]"></div>
          <span className="text-sm text-navy-600 dark:text-navy-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#FF7C7C]"></div>
          <span className="text-sm text-navy-600 dark:text-navy-400">Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#B3B3BA]"></div>
          <span className="text-sm text-navy-600 dark:text-navy-400">Not Started</span>
        </div>
      </div>
    </div>
  )
}

export default GanttChart
