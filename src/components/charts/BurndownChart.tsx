import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { Task, Milestone } from '../../types/entities.types'
import { format, eachDayOfInterval, isAfter, subWeeks, startOfDay } from 'date-fns'

interface BurndownChartProps {
  projectId: string
  projectTitle: string
  tasks: Task[]
  milestones?: Milestone[]
}

const BurndownChart = ({ projectTitle, tasks, milestones = [] }: BurndownChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || tasks.length === 0) return

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

    // Show last 2 weeks + future (from today to projectEnd)
    const today = startOfDay(new Date())
    const twoWeeksAgo = subWeeks(today, 2)
    const chartStart = twoWeeksAgo
    const chartEnd = projectEnd

    // Generate days for the burndown chart (last 2 weeks + future)
    const allDays = eachDayOfInterval({ start: chartStart, end: chartEnd })

    // Calculate total work (number of tasks)
    const totalTasks = validTasks.length

    // Calculate ideal burndown (linear)
    const idealData = allDays.map((date, index) => {
      const progress = index / (allDays.length - 1)
      const remaining = totalTasks * (1 - progress)
      return {
        date: format(date, 'MMM dd'),
        value: Math.max(0, remaining),
      }
    })

    // Calculate actual burndown (based on task completion)
    const actualData = allDays.map((date) => {
      // Count tasks that are NOT done and have started by this date
      const remaining = validTasks.filter(task => {
        const taskStart = new Date(task.startDate!)
        // Task has started and is not done
        return !isAfter(taskStart, date) && task.status !== 'Done'
      }).length

      return {
        date: format(date, 'MMM dd'),
        value: remaining,
      }
    })

    // Detect dark mode
    const isDarkMode = document.documentElement.classList.contains('dark')
    const textColor = isDarkMode ? '#E8E8EA' : '#2E2E36'
    const gridColor = isDarkMode ? '#3D3D47' : '#E8E8EA'

    const option: echarts.EChartsOption = {
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
          type: 'cross',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (params: any) {
          const date = params[0].axisValue
          let result = `<div style="padding: 8px;"><div style="font-weight: 600; margin-bottom: 4px;">${date}</div>`

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params.forEach((param: any) => {
            const color = param.color
            const name = param.seriesName
            const value = param.value.toFixed(1)
            result += `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color};"></span>
                <span style="font-size: 12px;">${name}: ${value} tasks</span>
              </div>
            `
          })

          result += '</div>'
          return result
        },
      },
      legend: {
        data: ['Ideal Burndown', 'Actual Progress'],
        top: 40,
        textStyle: {
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
        data: idealData.map(d => d.date),
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
        name: 'Remaining Tasks',
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
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: 'Ideal Burndown',
          type: 'line',
          data: idealData.map(d => d.value),
          smooth: false,
          lineStyle: {
            color: '#94a3b8',
            width: 2,
            type: 'dashed',
          },
          itemStyle: {
            color: '#94a3b8',
          },
          symbol: 'none',
        },
        {
          name: 'Actual Progress',
          type: 'line',
          data: actualData.map(d => d.value),
          smooth: true,
          lineStyle: {
            color: '#E8845C',
            width: 3,
          },
          itemStyle: {
            color: '#E8845C',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(232, 132, 92, 0.3)' },
              { offset: 1, color: 'rgba(232, 132, 92, 0.05)' },
            ]),
          },
          symbol: 'circle',
          symbolSize: 6,
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
              ...milestones.map(milestone => {
                const milestoneDate = new Date(milestone.date)
                const dateStr = format(milestoneDate, 'MMM dd')
                const index = allDays.findIndex(day => format(day, 'MMM dd') === dateStr)
                return {
                  name: milestone.title,
                  xAxis: index >= 0 ? index : dateStr,
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
  }, [projectTitle, tasks, milestones])

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
