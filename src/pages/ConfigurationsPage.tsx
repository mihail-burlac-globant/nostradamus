import { useState, useEffect } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Configuration } from '../types/entities.types'

const ConfigurationsPage = () => {
  const {
    configurations,
    isInitialized,
    initialize,
    addConfiguration,
    editConfiguration,
    removeConfiguration,
    loadConfigurations,
  } = useEntitiesStore()

  const [showConfigModal, setShowConfigModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState<Configuration | null>(null)
  const [configFormData, setConfigFormData] = useState({
    name: '',
    key: '',
    value: '',
    description: '',
    // Parsed config values
    sprintDuration: 14,
    velocityTarget: 80,
    methodology: 'Agile',
  })

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    } else {
      loadConfigurations()
    }
  }, [isInitialized, initialize, loadConfigurations])

  const openCreateConfigModal = () => {
    setEditingConfig(null)
    setConfigFormData({ name: '', key: '', value: '', description: '', sprintDuration: 14, velocityTarget: 80, methodology: 'Agile' })
    setShowConfigModal(true)
  }

  const openEditConfigModal = (config: Configuration) => {
    setEditingConfig(config)

    // Parse the JSON value
    let parsedConfig = { sprintDuration: 14, velocityTarget: 80, methodology: 'Agile' }
    try {
      if (config.value) {
        parsedConfig = JSON.parse(config.value)
      }
    } catch (e) {
      console.error('Failed to parse config value:', e)
    }

    setConfigFormData({
      name: config.name,
      key: config.key,
      value: config.value,
      description: config.description || '',
      sprintDuration: parsedConfig.sprintDuration || 14,
      velocityTarget: parsedConfig.velocityTarget || 80,
      methodology: parsedConfig.methodology || 'Agile',
    })
    setShowConfigModal(true)
  }

  const handleSaveConfig = () => {
    if (!configFormData.name.trim() || !configFormData.key.trim()) return

    // Build JSON value from form fields
    const configValue = JSON.stringify({
      sprintDuration: configFormData.sprintDuration,
      velocityTarget: configFormData.velocityTarget,
      methodology: configFormData.methodology,
    })

    const configData = {
      name: configFormData.name,
      key: configFormData.key,
      value: configValue,
      description: configFormData.description,
    }

    if (editingConfig) {
      editConfiguration(editingConfig.id, configData)
    } else {
      addConfiguration(configData)
    }

    setShowConfigModal(false)
    setConfigFormData({ name: '', key: '', value: '', description: '', sprintDuration: 14, velocityTarget: 80, methodology: 'Agile' })
    setEditingConfig(null)
  }

  const handleDeleteConfig = (configId: string) => {
    if (confirm('Are you sure you want to delete this configuration template?')) {
      removeConfiguration(configId)
    }
  }

  const closeModal = () => {
    setShowConfigModal(false)
    setConfigFormData({ name: '', key: '', value: '', description: '', sprintDuration: 14, velocityTarget: 80, methodology: 'Agile' })
    setEditingConfig(null)
  }

  return (
    <div className="container-wide section-spacing">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-serif text-navy-900 dark:text-white mb-2">
            Configuration Templates
          </h1>
          <p className="text-navy-600 dark:text-navy-400">
            Manage configuration templates for your projects
          </p>
        </div>
        <button
          onClick={openCreateConfigModal}
          className="flex items-center gap-2 px-6 py-3 text-sm font-medium
                   text-white bg-salmon-600 hover:bg-salmon-700
                   rounded-lg transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Configuration
        </button>
      </div>

      {/* Configurations List */}
      {configurations.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-navy-800 rounded-xl border border-navy-100 dark:border-navy-700">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-navy-300 dark:text-navy-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-medium text-navy-900 dark:text-white mb-2">
            No configuration templates
          </h3>
          <p className="text-navy-600 dark:text-navy-400">
            Get started by creating your first configuration template
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configurations.map((config) => {
            let parsedConfig = { sprintDuration: 14, velocityTarget: 80, methodology: 'Agile' }
            try {
              if (config.value) {
                parsedConfig = JSON.parse(config.value)
              }
            } catch (e) {
              console.error('Failed to parse config value:', e)
            }

            return (
              <div
                key={config.id}
                className="bg-white dark:bg-navy-800 rounded-xl border border-navy-100 dark:border-navy-700
                         hover:border-salmon-300 dark:hover:border-salmon-700 transition-all duration-200
                         overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-2 group-hover:text-salmon-600 dark:group-hover:text-salmon-400 transition-colors">
                        {config.name}
                      </h3>
                      <p className="text-xs font-mono bg-navy-100 dark:bg-navy-700 px-2 py-1 rounded inline-block text-navy-600 dark:text-navy-400">
                        {config.key}
                      </p>
                    </div>
                  </div>

                  {config.description && (
                    <p className="text-sm text-navy-600 dark:text-navy-400 mb-4">
                      {config.description}
                    </p>
                  )}

                  <div className="space-y-2 pt-4 border-t border-navy-100 dark:border-navy-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-navy-500 dark:text-navy-400">Sprint Duration:</span>
                      <span className="font-medium text-navy-900 dark:text-white">{parsedConfig.sprintDuration} days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-navy-500 dark:text-navy-400">Velocity Target:</span>
                      <span className="font-medium text-navy-900 dark:text-white">{parsedConfig.velocityTarget}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-navy-500 dark:text-navy-400">Methodology:</span>
                      <span className="font-medium text-navy-900 dark:text-white">{parsedConfig.methodology}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-navy-100 dark:border-navy-700 mt-4">
                    <button
                      onClick={() => openEditConfigModal(config)}
                      className="text-sm text-navy-600 dark:text-navy-400 hover:text-salmon-600 dark:hover:text-salmon-400"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
                      className="text-sm text-navy-600 dark:text-navy-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Configuration Create/Edit Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-navy-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white">
                {editingConfig ? 'Edit Configuration' : 'Create Configuration'}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={configFormData.name}
                  onChange={(e) => setConfigFormData({ ...configFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  placeholder="Agile Sprint Configuration"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={configFormData.key}
                  onChange={(e) => setConfigFormData({ ...configFormData, key: e.target.value })}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white font-mono
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  placeholder="agile_sprint_config"
                />
                <p className="mt-1 text-xs text-navy-500 dark:text-navy-400">
                  Unique identifier for this configuration (lowercase, use underscores)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                    Sprint Duration (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={configFormData.sprintDuration}
                    onChange={(e) => setConfigFormData({ ...configFormData, sprintDuration: parseInt(e.target.value) || 14 })}
                    className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                             bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                             focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    placeholder="14"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                    Velocity Target (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={configFormData.velocityTarget}
                      onChange={(e) => setConfigFormData({ ...configFormData, velocityTarget: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={configFormData.velocityTarget}
                      onChange={(e) => setConfigFormData({ ...configFormData, velocityTarget: parseInt(e.target.value) || 80 })}
                      className="w-16 px-2 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                               bg-white dark:bg-navy-900 text-navy-900 dark:text-white text-center
                               focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Methodology
                </label>
                <select
                  value={configFormData.methodology}
                  onChange={(e) => setConfigFormData({ ...configFormData, methodology: e.target.value })}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                >
                  <option value="Agile">Agile</option>
                  <option value="Scrum">Scrum</option>
                  <option value="Kanban">Kanban</option>
                  <option value="Design Thinking">Design Thinking</option>
                  <option value="Waterfall">Waterfall</option>
                  <option value="Lean">Lean</option>
                  <option value="XP">Extreme Programming (XP)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Description
                </label>
                <textarea
                  value={configFormData.description}
                  onChange={(e) => setConfigFormData({ ...configFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  placeholder="Description of this configuration"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-navy-100 dark:border-navy-700">
              <button
                onClick={closeModal}
                className="flex-1 px-6 py-2 text-sm font-medium text-navy-700 dark:text-navy-300
                         border border-navy-200 dark:border-navy-700
                         hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={!configFormData.name.trim() || !configFormData.key.trim()}
                className="flex-1 px-6 py-2 text-sm font-medium text-white bg-salmon-600 hover:bg-salmon-700
                         disabled:bg-navy-300 dark:disabled:bg-navy-600 disabled:cursor-not-allowed
                         rounded-lg transition-colors"
              >
                {editingConfig ? 'Save Changes' : 'Create Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConfigurationsPage
