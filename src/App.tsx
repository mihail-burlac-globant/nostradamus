import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import HomePage from './pages/HomePage'
import ChartsPage from './pages/ChartsPage'
import ProjectsPage from './pages/ProjectsPage'
import TasksPage from './pages/TasksPage'
import ProgressPage from './pages/ProgressPage'
import EstimatesPage from './pages/EstimatesPage'
import ResourcesPage from './pages/ResourcesPage'
import ConfigurationsPage from './pages/ConfigurationsPage'
import SeedPage from './pages/SeedPage'
import { useThemeStore } from './stores/themeStore'

function App() {
  const { initializeTheme } = useThemeStore()

  useEffect(() => {
    initializeTheme()
  }, [initializeTheme])

  return (
    <Router>
      <div className="min-h-screen bg-salmon-50 dark:bg-gray-950 flex flex-col">
        <Header />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/estimates" element={<EstimatesPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/configurations" element={<ConfigurationsPage />} />
            <Route path="/seed" element={<SeedPage />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  )
}

export default App
