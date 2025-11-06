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

  const handleExportPNG = () => {
    if (!chartInstance.current) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get chart image
    const chartImage = new Image()
    chartImage.src = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    })

    chartImage.onload = () => {
      canvas.width = chartImage.width
      canvas.height = chartImage.height + 60 // Extra space for watermark

      // Draw chart
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

        // Add text
        ctx.font = '14px Inter, sans-serif'
        ctx.fillStyle = '#5A5A66'
        ctx.fillText('Nostradamus — Project Intelligence', 80, watermarkY + 8)

        // Download
        const link = document.createElement('a')
        link.download = `burndown-chart-${format(new Date(), 'yyyy-MM-dd')}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
    }
  }

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
        textStyle: {
          fontFamily: 'Inter, sans-serif',
        },
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
          fontFamily: 'Inter, sans-serif',
        },
      },
      yAxis: {
        type: 'value',
        name: 'Work Remaining (%)',
        axisLabel: {
          formatter: '{value}%',
          fontFamily: 'Inter, sans-serif',
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
            color: '#B3B3BA',
            width: 2,
            type: 'dashed',
          },
          itemStyle: {
            color: '#B3B3BA',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(179, 179, 186, 0.2)' },
              { offset: 1, color: 'rgba(179, 179, 186, 0.05)' },
            ]),
          },
        },
        {
          name: 'Actual Remaining Work',
          type: 'line',
          data: actualWork,
          smooth: true,
          lineStyle: {
            color: '#FF9A66',
            width: 3,
          },
          itemStyle: {
            color: '#FF9A66',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255, 154, 102, 0.3)' },
              { offset: 1, color: 'rgba(255, 154, 102, 0.05)' },
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
        <div className="text-center space-y-3">
          <svg className="w-16 h-16 text-navy-300 dark:text-navy-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-body text-navy-600 dark:text-navy-400">
            No burndown data available
          </p>
          <p className="text-body-sm text-navy-500 dark:text-navy-500">
            Upload a project with time-based tasks to see the burndown chart
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header with Export Button */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-navy-100 dark:border-navy-700">
        <div>
          <h3 className="text-h3 font-serif text-navy-900 dark:text-white mb-2">
            Burndown Chart
          </h3>
          <p className="text-body-sm text-navy-600 dark:text-navy-400">
            Track work remaining over time and compare against ideal progress
          </p>
        </div>
        <button
          onClick={handleExportPNG}
          className="flex items-center gap-2 px-4 py-2.5 bg-salmon-600 hover:bg-salmon-700
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

      {/* Chart */}
      <div ref={chartRef} className="w-full h-[600px]" />

      {/* Insights */}
      <div className="flex flex-wrap gap-6 mt-6 pt-4 border-t border-navy-100 dark:border-navy-700">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-[#B3B3BA] rounded-full"></div>
          <div>
            <p className="text-xs font-medium text-navy-500 dark:text-navy-400 uppercase tracking-wide">Ideal</p>
            <p className="text-sm text-navy-700 dark:text-navy-300">Linear burndown</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-[#FF9A66] rounded-full"></div>
          <div>
            <p className="text-xs font-medium text-navy-500 dark:text-navy-400 uppercase tracking-wide">Actual</p>
            <p className="text-sm text-navy-700 dark:text-navy-300">Current progress</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BurndownChart
