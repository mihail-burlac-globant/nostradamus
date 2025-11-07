import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { useProjectStore } from '../../stores/projectStore'
import { useBurndownData, useBurndownByProfileData } from '../../hooks/useChartCalculations'
import { format } from 'date-fns'

const BurndownChart = () => {
  const { projectData } = useProjectStore()
  const burndownData = useBurndownData()
  const burndownByProfileData = useBurndownByProfileData()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  const handleExportPNG = () => {
    if (!chartInstance.current) return

    // Save current options
    const currentOptions = chartInstance.current.getOption()

    // Force dark text colors for export on white background
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xAxis = currentOptions.xAxis as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yAxis = currentOptions.yAxis as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legend = currentOptions.legend as any

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
        nameTextStyle: {
          color: '#2E2E36',
        },
        axisLine: {
          lineStyle: {
            color: '#D1D1D5',
          },
        },
        splitLine: {
          lineStyle: {
            color: '#E8E8EA',
          },
        },
      },
      legend: {
        ...legend,
        textStyle: {
          ...legend?.textStyle,
          color: '#2E2E36',
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
          link.download = `burndown-chart-${format(new Date(), 'yyyy-MM-dd')}.png`
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
          link.download = `burndown-chart-${format(new Date(), 'yyyy-MM-dd')}.png`
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
    if (!chartRef.current || !burndownData || burndownData.length === 0) return

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    const dates = burndownData.map((point) => format(point.date, 'MMM dd'))
    const idealWork = burndownData.map((point) => point.idealWork)
    const actualWork = burndownData.map((point) => point.remainingWork)

    // Calculate total hours for tooltip display
    const totalHours = projectData?.tasks.reduce((sum, task) => {
      return sum + (task.remaining_estimate_hours || 0)
    }, 0) || 0

    // Find today's date index
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayFormatted = format(today, 'MMM dd')

    // Extract unique profile types and prepare data for stacked areas
    const profileTypes = new Set<string>()
    burndownByProfileData.forEach((point) => {
      Object.keys(point.profileBreakdown).forEach((profile) => profileTypes.add(profile))
    })
    const profileTypesArray = Array.from(profileTypes).sort()

    // Color palette for profile types
    const profileColors = [
      '#FF9A66', // Salmon
      '#2DD4BF', // Teal
      '#A78BFA', // Purple
      '#F472B6', // Pink
      '#FBBF24', // Amber
      '#34D399', // Emerald
      '#60A5FA', // Blue
      '#FB923C', // Orange
    ]

    // Detect dark mode
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          let result = `<strong>${params[0].name}</strong><br/>`
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params.forEach((param: any) => {
            const hours = param.value.toFixed(1)
            result += `${param.marker} ${param.seriesName}: ${hours}h<br/>`
          })
          return result
        },
      },
      legend: {
        data: [...profileTypesArray, 'Ideal Burndown', 'Actual Remaining Work'],
        bottom: 0,
        textStyle: {
          fontFamily: 'Inter, sans-serif',
          color: isDarkMode ? '#E8E8EA' : '#2E2E36',
          fontSize: 13,
        },
        type: 'scroll',
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
          color: isDarkMode ? '#E8E8EA' : '#2E2E36',
          interval: dates.length > 30 ? Math.floor(dates.length / 20) : dates.length > 14 ? 1 : 0,
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode ? '#5A5A66' : '#D1D1D5',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Hours Remaining',
        nameTextStyle: {
          color: isDarkMode ? '#E8E8EA' : '#2E2E36',
          fontFamily: 'Inter, sans-serif',
        },
        axisLabel: {
          formatter: '{value}h',
          fontFamily: 'Inter, sans-serif',
          color: isDarkMode ? '#E8E8EA' : '#2E2E36',
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode ? '#5A5A66' : '#D1D1D5',
          },
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode ? '#3D3D47' : '#E8E8EA',
          },
        },
        min: 0,
      },
      series: [
        // Stacked area charts for each profile type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(profileTypesArray.map((profileType, index) => ({
          name: profileType,
          type: 'line',
          stack: 'profile',
          data: burndownByProfileData.map((point) => point.profileBreakdown[profileType] || 0),
          smooth: true,
          lineStyle: {
            width: 0,
          },
          showSymbol: false,
          areaStyle: {
            color: profileColors[index % profileColors.length],
            opacity: 0.7,
          },
          emphasis: {
            focus: 'series',
          },
        })) as any),
        // Ideal burndown line (converted to hours)
        {
          name: 'Ideal Burndown',
          type: 'line',
          data: idealWork.map((percent) => (percent / 100) * totalHours),
          smooth: true,
          lineStyle: {
            color: '#5A5A66',
            width: 2,
            type: 'dashed',
          },
          itemStyle: {
            color: '#5A5A66',
          },
          showSymbol: false,
          z: 10,
        },
        // Actual remaining work line with today marker
        {
          name: 'Actual Remaining Work',
          type: 'line',
          data: actualWork.map((percent) => (percent / 100) * totalHours),
          smooth: true,
          lineStyle: {
            color: '#1A1A1D',
            width: 3,
          },
          itemStyle: {
            color: '#1A1A1D',
          },
          showSymbol: false,
          z: 10,
          markLine: {
            symbol: 'none',
            silent: false,
            animation: false,
            label: {
              formatter: 'Today',
              position: 'insideEndTop',
              color: isDarkMode ? '#E8E8EA' : '#2E2E36',
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
                xAxis: todayFormatted,
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
  }, [burndownData, burndownByProfileData, projectData])

  if (!burndownData || burndownData.length === 0) {
    return (
      <div className="w-full h-[calc(100vh-420px)] min-h-[400px] flex items-center justify-center">
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
      <div className="flex items-start justify-between mb-3 pb-3 border-b border-navy-100 dark:border-navy-700">
        <div>
          <h3 className="text-h3 font-serif text-navy-900 dark:text-white mb-1">
            Burndown Chart
          </h3>
          <p className="text-body-sm text-navy-600 dark:text-navy-400">
            Track work remaining over time and compare against ideal progress
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

      {/* Chart */}
      <div ref={chartRef} className="w-full h-[calc(100vh-420px)] min-h-[400px]" />

      {/* Insights */}
      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-navy-100 dark:border-navy-700">
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
