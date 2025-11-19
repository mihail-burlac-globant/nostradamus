import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import ChartsPage from './pages/ChartsPage'
import ProjectsPage from './pages/ProjectsPage'
import ResourcesPage from './pages/ResourcesPage'
import ConfigurationsPage from './pages/ConfigurationsPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-salmon-50 dark:bg-navy-900">
        <Header />

        <main>
          <Routes>
            <Route path="/" element={<ChartsPage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/configurations" element={<ConfigurationsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
