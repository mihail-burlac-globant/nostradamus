import { useEffect, useRef, useMemo } from 'react'
import * as echarts from 'echarts'
import type { Task, Resource } from '../../types/entities.types'
import { format, parseISO } from 'date-fns'
import { useEntitiesStore } from '../../stores/entitiesStore'
import { getResourceIconEmoji } from '../../utils/resourceIconEmojis'

interface FocusFactorHistoryChartProps {
  projectId: string
  projectTitle: string
  tasks: Task[]
}

const FocusFactorHistoryChart = ({ projectId, projectTitle, tasks }: FocusFactorHistoryChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const { getTaskResources, progressSnapshots, resources } = useEntitiesStore()

  // Collect all focus factor data
  const focusFactorData = useMemo(() => {
    const projectSnapshots = progressSnapshots.filter(s => s.projectId === projectId)

    // Get all unique dates
    const allDates = new Set<string>()
    projectSnapshots.forEach(s => allDates.add(s.date))
    const sortedDates = Array.from(allDates).sort()

    // Get all unique resources used in this project
    const projectResources = new Map<string, Resource>()
    tasks.forEach(task => {
      const taskRes = getTaskResources(task.id)
      taskRes.forEach(tr => {
        const resource = resources.find(r => r.id === tr.id)
        if (resource && !projectResources.has(resource.id)) {
          projectResources.set(resource.id, resource)
        }
      })
    })

    // Build series data for each resource
    const seriesData = new Map<string, Array<{ date: string; value: number; taskTitle: string }>>()

    projectSnapshots.forEach(snapshot => {
      if (!snapshot.focusFactors) return

      const task = tasks.find(t => t.id === snapshot.taskId)
      if (!task) return

      Object.entries(snapshot.focusFactors).forEach(([resourceId, focusFactor]) => {
        if (!seriesData.has(resourceId)) {
          seriesData.set(resourceId, [])
        }
        seriesData.get(resourceId)!.push({
          date: snapshot.date,
          value: focusFactor,
          taskTitle: task.title,
        })
      })
    })

    return {
      sortedDates,
      seriesData,
      projectResources: Array.from(projectResources.values()),
    }
  }, [projectId, tasks, progressSnapshots, getTaskResources, resources])

  useEffect(() => {
    if (!chartRef.current || focusFactorData.sortedDates.length === 0) return

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    // Build series for each resource
    const series = focusFactorData.projectResources.map(resource => {
      const data = focusFactorData.sortedDates.map(date => {
        const dataPoints = focusFactorData.seriesData.get(resource.id) || []
        const point = dataPoints.find(d => d.date === date)
        return point ? point.value : null
      })

      // Generate color based on resource icon or use default
      const colors: Record<string, string> = {
        php: '#777BB4',
        typescript: '#3178C6',
        reactjs: '#61DAFB',
        ios: '#000000',
        android: '#3DDC84',
        qa: '#FF6B6B',
        devops: '#FF9900',
        designer: '#FF3366',
        pm: '#9B59B6',
        generic: '#6C757D',
      }
      const color = colors[resource.icon || 'generic'] || '#6C757D'

      return {
        name: resource.title,
        type: 'line' as const,
        data: data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: color,
        },
        itemStyle: {
          color: color,
        },
        connectNulls: false,
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              name: 'Default Velocity',
              yAxis: resource.defaultVelocity,
              lineStyle: {
                color: color,
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
        text: `${projectTitle} - Focus Factor History`,
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
                    ${param.value.toFixed(0)}%
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
        data: focusFactorData.projectResources.map(r => r.title),
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
        data: focusFactorData.sortedDates.map(d => format(parseISO(d), 'MMM dd')),
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
        name: 'Focus Factor (%)',
        nameLocation: 'middle',
        nameRotate: 90,
        nameGap: 50,
        min: 0,
        max: 100,
        nameTextStyle: {
          color: textColor,
          fontSize: 12,
        },
        axisLabel: {
          color: textColor,
          formatter: '{value}%',
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
  }, [focusFactorData, projectTitle])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="bg-white dark:bg-navy-800 rounded-lg shadow-md p-6">
        {focusFactorData.sortedDates.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-navy-400 dark:text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-navy-900 dark:text-navy-100">No Focus Factor History</h3>
            <p className="mt-1 text-sm text-navy-500 dark:text-navy-400 max-w-md mx-auto">
              Focus factor tracking will be available once the database service is updated to capture focus factors during progress updates.
              The visualization is ready and waiting for data.
            </p>
          </div>
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: '500px' }} />
        )}
      </div>

      {/* Resource Summary */}
      {focusFactorData.projectResources.length > 0 && (
        <div className="bg-white dark:bg-navy-800 rounded-lg p-6 border border-navy-200 dark:border-navy-700">
          <h3 className="text-lg font-semibold text-navy-900 dark:text-navy-100 mb-4">
            Resource Types in Project
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {focusFactorData.projectResources.map(resource => {
              const dataPoints = focusFactorData.seriesData.get(resource.id) || []
              const avgFocusFactor = dataPoints.length > 0
                ? dataPoints.reduce((sum, d) => sum + d.value, 0) / dataPoints.length
                : resource.defaultVelocity

              return (
                <div key={resource.id} className="bg-navy-50 dark:bg-navy-900 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getResourceIconEmoji(resource.icon || 'generic')}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-navy-900 dark:text-navy-100">
                        {resource.title}
                      </div>
                      <div className="text-xs text-navy-600 dark:text-navy-400">
                        Default: {resource.defaultVelocity}%
                      </div>
                    </div>
                  </div>
                  {dataPoints.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-navy-600 dark:text-navy-400 mb-1">
                        Average Focus Factor
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-navy-200 dark:bg-navy-700 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${avgFocusFactor}%` }}
                          />
                        </div>
                        <div className="text-sm font-bold text-navy-900 dark:text-navy-100 min-w-[45px] text-right">
                          {avgFocusFactor.toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-xs text-navy-500 dark:text-navy-500 mt-1">
                        Based on {dataPoints.length} data point{dataPoints.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white dark:bg-navy-800 rounded-lg p-4 border border-navy-200 dark:border-navy-700">
        <div className="text-xs text-navy-600 dark:text-navy-400">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-navy-400 dark:bg-navy-600"></div>
              <span>Solid Line: Actual Focus Factor</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-t-2 border-dashed border-navy-400 dark:border-navy-600"></div>
              <span>Dashed Line: Default Velocity</span>
            </div>
          </div>
          <p className="mt-2">
            Focus factor represents the percentage of time available for productive work (e.g., 80% = 6.4 hours per 8-hour day).
            Changes in focus factor affect task duration and project timeline.
          </p>
        </div>
      </div>
    </div>
  )
}

export default FocusFactorHistoryChart
