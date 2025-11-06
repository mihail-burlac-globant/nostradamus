interface ChartControlsProps {
  activeChart: 'gantt' | 'burndown'
  onChartChange: (chart: 'gantt' | 'burndown') => void
}

const ChartControls = ({ activeChart, onChartChange }: ChartControlsProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between
                    bg-white dark:bg-navy-800 rounded-2xl shadow-soft p-6 gap-4 border border-navy-100 dark:border-navy-700">
      {/* Title */}
      <div>
        <h2 className="text-h4 font-serif text-navy-900 dark:text-white mb-1">
          Visualization
        </h2>
        <p className="text-body-sm text-navy-500 dark:text-navy-400">
          Select a chart type to analyze your project
        </p>
      </div>

      {/* Chart Type Selector */}
      <div className="inline-flex bg-navy-50 dark:bg-navy-900 rounded-xl p-1.5 gap-1">
        <button
          onClick={() => onChartChange('gantt')}
          className={`
            px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
            flex items-center gap-2.5
            ${
              activeChart === 'gantt'
                ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-500 shadow-soft'
                : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
            }
          `}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          <span>Gantt</span>
        </button>

        <button
          onClick={() => onChartChange('burndown')}
          className={`
            px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
            flex items-center gap-2.5
            ${
              activeChart === 'burndown'
                ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-500 shadow-soft'
                : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
            }
          `}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          <span>Burndown</span>
        </button>
      </div>
    </div>
  )
}

export default ChartControls
