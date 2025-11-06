import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { useProjectStore } from '../../stores/projectStore'
import { format } from 'date-fns'

const GanttChart = () => {
  const { projectData } = useProjectStore()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || !projectData) return

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    // Prepare data for Gantt chart
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
            ? '#10b981'
            : task.status === 'in-progress'
            ? '#3b82f6'
            : task.status === 'blocked'
            ? '#ef4444'
            : '#94a3b8',
      },
    }))

    const option: echarts.EChartsOption = {
      tooltip: {
        formatter: (params: any) => {
          const task = projectData.tasks[params.dataIndex]
          return `
            <strong>${task.name}</strong><br/>
            Start: ${format(task.startDate, 'MMM dd, yyyy')}<br/>
            End: ${format(task.endDate, 'MMM dd, yyyy')}<br/>
            Progress: ${task.progress}%<br/>
            Status: ${task.status}<br/>
            ${task.assignee ? `Assignee: ${task.assignee}` : ''}
          `
        },
      },
      grid: {
        left: '15%',
        right: '5%',
        top: '10%',
        bottom: '10%',
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          formatter: (value: number) => format(new Date(value), 'MMM dd'),
        },
      },
      yAxis: {
        type: 'category',
        data: projectData.tasks.map((task) => task.name),
        axisLabel: {
          fontSize: 12,
        },
      },
      series: [
        {
          type: 'custom',
          renderItem: (params, api) => {
            const categoryIndex = api.value(0) as number
            const start = api.coord([api.value(1), categoryIndex])
            const end = api.coord([api.value(2), categoryIndex])
            const height = api.size!([0, 1])[1] * 0.6

            return {
              type: 'rect',
              shape: {
                x: start[0],
                y: start[1] - height / 2,
                width: end[0] - start[0],
                height: height,
              },
              style: api.style(),
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
          ]),
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
  }, [projectData])

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Gantt Chart
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Project timeline and task dependencies
        </p>
      </div>
      <div ref={chartRef} className="w-full h-[600px]" />
    </div>
  )
}

export default GanttChart
