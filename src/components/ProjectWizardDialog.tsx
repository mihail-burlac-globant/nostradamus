import { useState, useEffect } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Project } from '../types/entities.types'
import { getIconById } from '../utils/resourceIcons'

interface ProjectWizardDialogProps {
  editingProject: Project | null
  onClose: () => void
  onSubmit: (data: ProjectFormData) => void
  errorMessage: string
}

export interface ProjectFormData {
  title: string
  description: string
  status: 'Active' | 'Archived'
  startDate: string
  configurationId: string | null
  resources: Array<{
    resourceId: string
    numberOfResources: number
    focusFactor: number
  }>
}

const ProjectWizardDialog = ({ editingProject, onClose, onSubmit, errorMessage }: ProjectWizardDialogProps) => {
  const {
    configurations,
    resources,
    getProjectConfigurations,
    getProjectResources,
    loadConfigurations,
    loadResources,
  } = useEntitiesStore()

  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    status: 'Active',
    startDate: '',
    configurationId: null,
    resources: [],
  })

  // Load configurations and resources when the dialog opens
  useEffect(() => {
    loadConfigurations()
    loadResources()
  }, [loadConfigurations, loadResources])

  // Initialize form data when editing a project
  useEffect(() => {
    if (editingProject) {
      const projectConfigs = getProjectConfigurations(editingProject.id)
      const projectResources = getProjectResources(editingProject.id)

      setFormData({
        title: editingProject.title,
        description: editingProject.description,
        status: editingProject.status,
        startDate: editingProject.startDate || '',
        configurationId: projectConfigs.length > 0 ? projectConfigs[0].id : null,
        resources: projectResources.map(r => ({
          resourceId: r.id,
          numberOfResources: r.numberOfResources,
          focusFactor: r.focusFactor,
        })),
      })
    } else {
      // For new projects, set default configuration and today's date
      const defaultConfig = configurations.find(c => c.key === 'default_config')
      const today = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
      setFormData({
        title: '',
        description: '',
        status: 'Active',
        startDate: today,
        configurationId: defaultConfig?.id || null,
        resources: [],
      })
    }
  }, [editingProject, configurations, getProjectConfigurations, getProjectResources])

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    onSubmit(formData)
  }

  const handleResourceToggle = (resourceId: string) => {
    const existingIndex = formData.resources.findIndex(r => r.resourceId === resourceId)

    if (existingIndex >= 0) {
      // Remove resource
      setFormData({
        ...formData,
        resources: formData.resources.filter((_, i) => i !== existingIndex),
      })
    } else {
      // Add resource with defaults
      const resource = resources.find(r => r.id === resourceId)
      setFormData({
        ...formData,
        resources: [
          ...formData.resources,
          {
            resourceId,
            numberOfResources: 1,
            focusFactor: resource?.defaultVelocity || 80,
          },
        ],
      })
    }
  }

  const handleResourceUpdate = (resourceId: string, field: 'numberOfResources' | 'focusFactor', value: number) => {
    setFormData({
      ...formData,
      resources: formData.resources.map(r =>
        r.resourceId === resourceId ? { ...r, [field]: value } : r
      ),
    })
  }

  const isStep1Valid = formData.title.trim() !== ''
  const canProceed = currentStep === 1 ? isStep1Valid : true

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-navy-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Steps */}
        <div className="p-6 border-b border-navy-100 dark:border-navy-700">
          <h2 className="text-xl font-semibold text-navy-900 dark:text-white mb-4">
            {editingProject ? 'Edit Project' : 'Create New Project'}
          </h2>

          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                      currentStep === step
                        ? 'border-salmon-600 bg-salmon-600 text-white'
                        : currentStep > step
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-navy-300 dark:border-navy-600 text-navy-400'
                    }`}
                  >
                    {currentStep > step ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{step}</span>
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      currentStep >= step
                        ? 'text-navy-900 dark:text-white'
                        : 'text-navy-400 dark:text-navy-500'
                    }`}
                  >
                    {step === 1 ? 'Basic Info' : step === 2 ? 'Configuration' : 'Resources'}
                  </span>
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step
                        ? 'bg-green-600'
                        : 'bg-navy-200 dark:bg-navy-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  placeholder="Enter project title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  placeholder="Enter project description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-navy-500 dark:text-navy-400">
                  Optional: Set the project start date for timeline calculations in charts
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Archived' })}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Configuration */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-3">
                  Project Configuration
                </label>
                <p className="text-sm text-navy-600 dark:text-navy-400 mb-4">
                  Select a configuration for your project. This defines sprint duration, velocity targets, and methodology.
                </p>

                {configurations.length === 0 ? (
                  <div className="text-center py-8 bg-navy-50 dark:bg-navy-900/30 rounded-lg">
                    <p className="text-sm text-navy-600 dark:text-navy-400">
                      No configurations available. Please create one in the Configurations page.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {configurations.map((config) => {
                      const configValue = JSON.parse(config.value)
                      const isSelected = formData.configurationId === config.id

                      return (
                        <div
                          key={config.id}
                          onClick={() => setFormData({ ...formData, configurationId: config.id })}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-salmon-600 bg-salmon-50 dark:bg-salmon-900/20'
                              : 'border-navy-200 dark:border-navy-700 hover:border-salmon-400 dark:hover:border-salmon-600'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-1">
                                {config.name}
                              </h3>
                              {config.description && (
                                <p className="text-sm text-navy-600 dark:text-navy-400 mb-2">
                                  {config.description}
                                </p>
                              )}
                              <div className="flex gap-4 text-xs text-navy-500 dark:text-navy-400">
                                <span>Sprint: {configValue.sprintDuration} days</span>
                                <span>Velocity: {configValue.velocityTarget}%</span>
                                <span>Method: {configValue.methodology}</span>
                              </div>
                            </div>
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'border-salmon-600 bg-salmon-600'
                                  : 'border-navy-300 dark:border-navy-600'
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Resources */}
          {currentStep === 3 && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Project Resources
                </label>
                <p className="text-sm text-navy-600 dark:text-navy-400 mb-3">
                  Select resources for your project and configure the number of resources and focus factor for each type.
                </p>

                {resources.filter(r => r.status === 'Active').length === 0 ? (
                  <div className="text-center py-6 bg-navy-50 dark:bg-navy-900/30 rounded-lg">
                    <p className="text-sm text-navy-600 dark:text-navy-400">
                      No active resources available. Please create resources in the Resources page.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resources
                      .filter(r => r.status === 'Active')
                      .sort((a, b) => {
                        // Sort assigned resources first
                        const aAssigned = formData.resources.some(r => r.resourceId === a.id)
                        const bAssigned = formData.resources.some(r => r.resourceId === b.id)
                        if (aAssigned && !bAssigned) return -1
                        if (!aAssigned && bAssigned) return 1
                        return a.title.localeCompare(b.title)
                      })
                      .map((resource) => {
                        const assignedResource = formData.resources.find(r => r.resourceId === resource.id)
                        const isSelected = !!assignedResource

                        return (
                          <div
                            key={resource.id}
                            className={`border rounded-lg transition-all ${
                              isSelected
                                ? 'border-salmon-600 bg-salmon-50 dark:bg-salmon-900/20'
                                : 'border-navy-200 dark:border-navy-700'
                            }`}
                          >
                            <div
                              className="px-3 py-2 cursor-pointer"
                              onClick={() => handleResourceToggle(resource.id)}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    isSelected
                                      ? 'border-salmon-600 bg-salmon-600'
                                      : 'border-navy-300 dark:border-navy-600'
                                  }`}
                                >
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const IconComponent = getIconById(resource.icon)
                                      return <IconComponent className="w-5 h-5 flex-shrink-0 text-navy-600 dark:text-navy-400" />
                                    })()}
                                    <div className="flex items-baseline gap-2 min-w-0">
                                      <h3 className="text-sm font-semibold text-navy-900 dark:text-white">
                                        {resource.title}
                                      </h3>
                                      {resource.description && (
                                        <p className="text-xs text-navy-500 dark:text-navy-400 truncate">
                                          {resource.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleResourceToggle(resource.id)
                                    }}
                                    className="flex-shrink-0 p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Remove resource"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>

                            {isSelected && assignedResource && (
                              <div className="px-3 pb-2 border-t border-navy-200 dark:border-navy-700 pt-2">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-navy-700 dark:text-navy-300 mb-1">
                                      Quantity
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={assignedResource.numberOfResources}
                                      onChange={(e) => handleResourceUpdate(
                                        resource.id,
                                        'numberOfResources',
                                        Math.max(1, parseInt(e.target.value) || 1)
                                      )}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1 text-sm border border-navy-200 dark:border-navy-700 rounded
                                               bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                                               focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-navy-700 dark:text-navy-300 mb-1">
                                      Focus (%)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={assignedResource.focusFactor}
                                      onChange={(e) => handleResourceUpdate(
                                        resource.id,
                                        'focusFactor',
                                        Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                                      )}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1 text-sm border border-navy-200 dark:border-navy-700 rounded
                                               bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                                               focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="p-6 border-t border-navy-100 dark:border-navy-700 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-navy-700 dark:text-navy-300
                     border border-navy-200 dark:border-navy-700
                     hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="px-6 py-2 text-sm font-medium text-navy-700 dark:text-navy-300
                         border border-navy-200 dark:border-navy-700
                         hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition-colors"
              >
                Previous
              </button>
            )}

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="px-6 py-2 text-sm font-medium text-white bg-salmon-600 hover:bg-salmon-700
                         rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed}
                className="px-6 py-2 text-sm font-medium text-white bg-salmon-600 hover:bg-salmon-700
                         rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingProject ? 'Save Changes' : 'Create Project'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectWizardDialog
