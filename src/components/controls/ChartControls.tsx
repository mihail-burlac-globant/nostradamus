interface ChartControlsProps {
  activeChart: 'gantt' | 'burndown'
  onChartChange: (chart: 'gantt' | 'burndown') => void
}

const ChartControls = ({ activeChart, onChartChange }: ChartControlsProps) => {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
      <div className="flex items-center space-x-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Chart View
        </h2>
      </div>

      <div className="flex space-x-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
        <button
          onClick={() => onChartChange('gantt')}
          className={`
            px-4 py-2 rounded-md font-medium text-sm transition-all duration-200
            ${
              activeChart === 'gantt'
                ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }
          `}
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            <span>Gantt Chart</span>
          </div>
        </button>

        <button
          onClick={() => onChartChange('burndown')}
          className={`
            px-4 py-2 rounded-md font-medium text-sm transition-all duration-200
            ${
              activeChart === 'burndown'
                ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }
          `}
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
            <span>Burndown Chart</span>
          </div>
        </button>
      </div>
    </div>
  )
}

export default ChartControls
