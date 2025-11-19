import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import ChartsPage from './pages/ChartsPage'
import ProjectsPage from './pages/ProjectsPage'
import TasksPage from './pages/TasksPage'
import ResourcesPage from './pages/ResourcesPage'
import ConfigurationsPage from './pages/ConfigurationsPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-salmon-50 dark:bg-navy-900 flex flex-col">
        <Header />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ChartsPage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/configurations" element={<ConfigurationsPage />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  )
}

export default App
