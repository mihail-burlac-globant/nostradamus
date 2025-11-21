import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import type { Task, ProgressSnapshot } from '../../types/entities.types'
import { format, parseISO } from 'date-fns'
import { useEntitiesStore } from '../../stores/entitiesStore'

interface EstimateHistoryChartProps {
  projectId: string
  projectTitle: string
  tasks: Task[]
}

const EstimateHistoryChart = ({ projectId, projectTitle, tasks }: EstimateHistoryChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const { getTaskResources, progressSnapshots } = useEntitiesStore()
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!chartRef.current || tasks.length === 0) return

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    // Get snapshots for this project
    const projectSnapshots = progressSnapshots.filter(s => s.projectId === projectId)

    // Group snapshots by task
    const snapshotsByTask = new Map<string, ProgressSnapshot[]>()
    projectSnapshots.forEach(snapshot => {
      if (!snapshotsByTask.has(snapshot.taskId)) {
        snapshotsByTask.set(snapshot.taskId, [])
      }
      snapshotsByTask.get(snapshot.taskId)!.push(snapshot)
    })

    // Sort snapshots by date for each task
    snapshotsByTask.forEach((snapshots) => {
      snapshots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    })

    // Build series data for each task
    const allDates = new Set<string>()
    projectSnapshots.forEach(s => allDates.add(s.date))
    const sortedDates = Array.from(allDates).sort()

    // If no snapshots, show message
    if (sortedDates.length === 0) {
      const option: echarts.EChartsOption = {
        title: {
          text: 'No Progress Data Available',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 16,
          },
        },
      }
      chartInstance.current.setOption(option)
      return
    }

    // Filter tasks that have snapshots or are selected
    const tasksWithData = tasks.filter(task => {
      const hasSnapshots = snapshotsByTask.has(task.id)
      const isSelected = selectedTaskIds.size === 0 || selectedTaskIds.has(task.id)
      return hasSnapshots && isSelected
    })

    // Build series for each task
    const series = tasksWithData.map(task => {
      const snapshots = snapshotsByTask.get(task.id) || []

      // Create data points
      const data = sortedDates.map(date => {
        const snapshot = snapshots.find(s => s.date === date)
        return snapshot ? snapshot.remainingEstimate : null
      })

      // Calculate original estimate for reference
      const resources = getTaskResources(task.id)
      const originalEstimate = resources.reduce((sum, r) => sum + r.estimatedDays, 0)

      return {
        name: task.title,
        type: 'line' as const,
        data: data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: task.color,
        },
        itemStyle: {
          color: task.color,
        },
        connectNulls: false,
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              name: 'Original Estimate',
              yAxis: originalEstimate,
              lineStyle: {
                color: task.color,
                type: 'dashed' as const,
                width: 1,
                opacity: 0.4,
              },
              label: {
                show: false,
              },
            },
          ],
        },
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
        text: `${projectTitle} - Estimate History`,
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
          if (!params || params.length === 0) return ''

          const date = params[0].axisValue
          let result = `<div style="padding: 8px; min-width: 200px;"><div style="font-weight: 600; margin-bottom: 8px;">${date}</div>`

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params.forEach((param: any) => {
            if (param.value !== null) {
              result += `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 4px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; background-color: ${param.color};"></span>
                    <span style="font-size: 12px; color: #374151;">${param.seriesName}</span>
                  </div>
                  <span style="font-size: 12px; font-weight: 600; color: #1f2937;">
                    ${param.value.toFixed(1)} days
                  </span>
                </div>
              `
            }
          })

          result += `</div>`
          return result
        },
      },
      legend: {
        data: tasksWithData.map(t => t.title),
        top: 35,
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
        top: 90,
        bottom: 60,
      },
      xAxis: {
        type: 'category',
        data: sortedDates.map(d => format(parseISO(d), 'MMM dd')),
        axisLabel: {
          color: textColor,
          rotate: 45,
        },
        axisLine: {
          lineStyle: {
            color: gridColor,
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Remaining Estimate (person-days)',
        nameLocation: 'middle',
        nameRotate: 90,
        nameGap: 50,
        nameTextStyle: {
          color: textColor,
          fontSize: 12,
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
      series: series,
    }

    chartInstance.current.setOption(option)

    // Handle window resize
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [projectId, projectTitle, tasks, progressSnapshots, getTaskResources, selectedTaskIds])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  // Get tasks that have snapshot data
  const tasksWithSnapshots = tasks.filter(task => {
    return progressSnapshots.some(s => s.taskId === task.id && s.projectId === projectId)
  })

  const handleTaskToggle = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedTaskIds.size === tasksWithSnapshots.length) {
      setSelectedTaskIds(new Set())
    } else {
      setSelectedTaskIds(new Set(tasksWithSnapshots.map(t => t.id)))
    }
  }

  return (
    <div className="space-y-4">
      {/* Task Selector */}
      {tasksWithSnapshots.length > 0 && (
        <div className="bg-white dark:bg-navy-800 rounded-lg p-4 border border-navy-200 dark:border-navy-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-navy-700 dark:text-navy-300">
              Select Tasks to Display
            </h4>
            <button
              onClick={handleSelectAll}
              className="text-sm text-salmon-600 dark:text-salmon-400 hover:text-salmon-700 dark:hover:text-salmon-300 font-medium"
            >
              {selectedTaskIds.size === tasksWithSnapshots.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tasksWithSnapshots.map(task => (
              <button
                key={task.id}
                onClick={() => handleTaskToggle(task.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedTaskIds.size === 0 || selectedTaskIds.has(task.id)
                    ? 'bg-navy-100 dark:bg-navy-700 text-navy-900 dark:text-navy-100 border-2'
                    : 'bg-navy-50 dark:bg-navy-800 text-navy-500 dark:text-navy-400 border-2 border-transparent'
                }`}
                style={{
                  borderColor: (selectedTaskIds.size === 0 || selectedTaskIds.has(task.id)) ? task.color : 'transparent',
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: task.color }}
                />
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
        {tasksWithSnapshots.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-navy-400 dark:text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-navy-900 dark:text-navy-100">No Progress History</h3>
            <p className="mt-1 text-sm text-navy-500 dark:text-navy-400">
              Update task estimates on the Progress page to see history data here.
            </p>
          </div>
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: '500px' }} />
        )}
      </div>

      {/* Legend */}
      {tasksWithSnapshots.length > 0 && (
        <div className="bg-white dark:bg-navy-800 rounded-lg p-4 border border-navy-200 dark:border-navy-700">
          <div className="text-xs text-navy-600 dark:text-navy-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-navy-400 dark:bg-navy-600"></div>
                <span>Solid Line: Remaining Estimate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-navy-400 dark:border-navy-600"></div>
                <span>Dashed Line: Original Estimate</span>
              </div>
            </div>
            <p className="mt-2">
              Upward trends indicate scope increase, downward trends show progress or scope reduction.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default EstimateHistoryChart
