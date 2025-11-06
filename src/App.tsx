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
    <div className="min-h-screen bg-salmon-50 dark:bg-navy-900">
      <Header />

      <main className="container-wide section-spacing">
        {!projectData ? (
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-3xl">
              {/* Hero Section */}
              <div className="text-center mb-12 space-y-6">
                <div className="inline-block mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-salmon-100 dark:bg-salmon-900/20
                                rounded-full text-sm font-medium text-salmon-800 dark:text-salmon-400 border border-salmon-200 dark:border-salmon-800">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Professional Project Intelligence
                  </div>
                </div>

                <h2 className="text-h1 font-serif text-navy-900 dark:text-white">
                  Visualize Your Project's{' '}
                  <span className="text-gradient-salmon">Future</span>
                </h2>

                <p className="text-body-lg text-navy-600 dark:text-navy-300 max-w-2xl mx-auto leading-relaxed">
                  Transform your project data into actionable insights with elegant Gantt charts
                  and burndown analysis. Upload a CSV and let Nostradamus illuminate the path ahead.
                </p>
              </div>

              {/* Uploader */}
              <CSVUploader />

              {/* Features */}
              <div className="grid grid-cols-3 gap-6 mt-12 text-center">
                <div>
                  <div className="text-2xl font-serif font-bold text-salmon-600 dark:text-salmon-500 mb-1">
                    No Setup
                  </div>
                  <p className="text-sm text-navy-600 dark:text-navy-400">
                    Just upload & visualize
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-serif font-bold text-salmon-600 dark:text-salmon-500 mb-1">
                    100% Private
                  </div>
                  <p className="text-sm text-navy-600 dark:text-navy-400">
                    All data stays local
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-serif font-bold text-salmon-600 dark:text-salmon-500 mb-1">
                    Instant Insights
                  </div>
                  <p className="text-sm text-navy-600 dark:text-navy-400">
                    Real-time projections
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ChartControls
              activeChart={activeChart}
              onChartChange={setActiveChart}
            />

            <div className="card-hover">
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
