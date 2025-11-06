import { useState } from 'react'
import Header from './components/layout/Header'
import CSVUploader from './components/upload/CSVUploader'
import GanttChart from './components/charts/GanttChart'
import BurndownChart from './components/charts/BurndownChart'
import ChartControls from './components/controls/ChartControls'
import { useProjectStore } from './stores/projectStore'

type ChartType = 'gantt' | 'burndown'

function App() {
  const [activeChart, setActiveChart] = useState<ChartType>('gantt')
  const { projectData } = useProjectStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {!projectData ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                  Welcome to Nostradamus
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Upload your CSV file to visualize project data with Gantt and Burndown charts
                </p>
              </div>
              <CSVUploader />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <ChartControls
              activeChart={activeChart}
              onChartChange={setActiveChart}
            />

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 transition-all duration-300">
              {activeChart === 'gantt' ? (
                <GanttChart />
              ) : (
                <BurndownChart />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
