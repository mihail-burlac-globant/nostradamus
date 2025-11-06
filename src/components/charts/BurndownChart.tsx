import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { useProjectStore } from '../../stores/projectStore'
import { useBurndownData } from '../../hooks/useChartCalculations'
import { format } from 'date-fns'

const BurndownChart = () => {
  const { projectData } = useProjectStore()
  const burndownData = useBurndownData()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || !burndownData || burndownData.length === 0) return

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    const dates = burndownData.map((point) => format(point.date, 'MMM dd'))
    const idealWork = burndownData.map((point) => point.idealWork)
    const actualWork = burndownData.map((point) => point.remainingWork)

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let result = `<strong>${params[0].name}</strong><br/>`
          params.forEach((param: any) => {
            result += `${param.marker} ${param.seriesName}: ${param.value.toFixed(1)}%<br/>`
          })
          return result
        },
      },
      legend: {
        data: ['Ideal Burndown', 'Actual Remaining Work'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        top: '10%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          rotate: 45,
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Work Remaining (%)',
        axisLabel: {
          formatter: '{value}%',
        },
        min: 0,
        max: 100,
      },
      series: [
        {
          name: 'Ideal Burndown',
          type: 'line',
          data: idealWork,
          smooth: true,
          lineStyle: {
            color: '#94a3b8',
            width: 2,
            type: 'dashed',
          },
          itemStyle: {
            color: '#94a3b8',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(148, 163, 184, 0.2)' },
              { offset: 1, color: 'rgba(148, 163, 184, 0.05)' },
            ]),
          },
        },
        {
          name: 'Actual Remaining Work',
          type: 'line',
          data: actualWork,
          smooth: true,
          lineStyle: {
            color: '#3b82f6',
            width: 3,
          },
          itemStyle: {
            color: '#3b82f6',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ]),
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
  }, [burndownData])

  if (!burndownData || burndownData.length === 0) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">
          No burndown data available
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Burndown Chart
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Track project progress over time
        </p>
      </div>
      <div ref={chartRef} className="w-full h-[600px]" />
    </div>
  )
}

export default BurndownChart
