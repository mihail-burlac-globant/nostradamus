import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { seedDatabase } from '../utils/seed'
import { useEntitiesStore } from '../stores/entitiesStore'
import { clearDatabase } from '../services/database'

const SeedPage = () => {
  const navigate = useNavigate()
  const { initialize } = useEntitiesStore()
  const [status, setStatus] = useState<'idle' | 'seeding' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSeed = async () => {
    setStatus('seeding')
    setMessage('Initializing database...')

    try {
      // Initialize database first
      await initialize()

      setMessage('Clearing existing data...')
      // Clear existing data
      clearDatabase()

      setMessage('Seeding database with sample data...')
      // Run seed
      seedDatabase()

      // Reload store with new data
      await initialize()

      setStatus('success')
      setMessage('Database seeded successfully! Redirecting to projects page...')

      // Redirect to projects page after 2 seconds
      setTimeout(() => {
        navigate('/projects')
      }, 2000)
    } catch (error) {
      setStatus('error')
      setMessage(`Error seeding database: ${(error as Error).message}`)
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-salmon-50 dark:from-gray-950 dark:to-gray-900 p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white dark:bg-navy-800 rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-navy-800 dark:text-navy-100 mb-4">
          Database Seeding
        </h1>

        <div className="mb-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 dark:text-yellow-300 font-semibold mb-2">
              ⚠️ Warning
            </p>
            <p className="text-yellow-700 dark:text-yellow-400 text-sm">
              This will clear all existing data and populate the database with sample data.
              This action cannot be undone.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-blue-800 dark:text-blue-300 font-semibold mb-2">
              📦 What will be created:
            </p>
            <ul className="text-blue-700 dark:text-blue-400 text-sm space-y-1">
              <li>• 2 Sample Projects (E-Commerce Platform, Mobile App Redesign)</li>
              <li>• 4 Resource Types (React Dev, Node.js Dev, UX Designer, QA Engineer)</li>
              <li>• 2 Configurations (Agile Sprint, Design Sprint)</li>
              <li>• 55 Tasks spanning 6 months (30 for E-Commerce, 25 for Mobile App)</li>
              <li>• 11 Milestones marking key project phases (6 for E-Commerce, 5 for Mobile App)</li>
              <li>• Tasks with realistic dates starting from 1 week ago</li>
              <li>• Resource assignments and task dependencies</li>
              <li>• Automatic status based on dates (Done/In Progress/Todo)</li>
            </ul>
          </div>
        </div>

        {status !== 'idle' && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              status === 'seeding'
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                : status === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            <p
              className={`font-medium ${
                status === 'seeding'
                  ? 'text-blue-800 dark:text-blue-300'
                  : status === 'success'
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              }`}
            >
              {message}
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleSeed}
            disabled={status === 'seeding'}
            className="flex-1 px-6 py-3 bg-salmon-600 hover:bg-salmon-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {status === 'seeding' ? 'Seeding Database...' : '🌱 Seed Database'}
          </button>

          <button
            onClick={() => navigate('/')}
            className="flex-1 px-6 py-3 bg-navy-200 hover:bg-navy-300 dark:bg-navy-700 dark:hover:bg-navy-600 text-navy-800 dark:text-navy-100 rounded-lg font-medium transition-all duration-200"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-navy-200 dark:border-navy-700">
          <p className="text-sm text-navy-600 dark:text-navy-400">
            💡 <strong>Tip:</strong> You can also seed the database programmatically by running{' '}
            <code className="px-2 py-1 bg-navy-100 dark:bg-navy-900 rounded text-navy-800 dark:text-navy-200">
              import {'{'} seedDatabase {'}'} from './utils/seed'
            </code>{' '}
            in your code.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SeedPage
