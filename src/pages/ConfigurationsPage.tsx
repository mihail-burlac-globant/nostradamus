import { useState, useEffect, useCallback } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Project, Resource } from '../types/entities.types'

interface ResourceAllocation {
  resourceId: string
  numberOfResources: number
  focusFactor: number
}

const ConfigurationsPage = () => {
  const {
    projects,
    resources,
    isInitialized,
    initialize,
    getProjectResources,
    assignResourceToProject,
    removeResourceFromProject,
  } = useEntitiesStore()

  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectResources, setProjectResources] = useState<(Resource & { numberOfResources: number; focusFactor: number })[]>([])
  const [pendingAllocations, setPendingAllocations] = useState<Map<string, ResourceAllocation>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  const loadProjectResources = useCallback(() => {
    if (selectedProject) {
      const resources = getProjectResources(selectedProject.id)
      setProjectResources(resources)
      setPendingAllocations(new Map())
      setHasChanges(false)
    }
  }, [selectedProject, getProjectResources])

  useEffect(() => {
    if (selectedProject) {
      loadProjectResources()
    }
  }, [selectedProject, loadProjectResources])

  const handleSelectProject = (project: Project) => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Do you want to discard them?')) {
        return
      }
    }
    setSelectedProject(project)
  }

  const handleResourceChange = (resourceId: string, field: 'numberOfResources' | 'focusFactor', value: number) => {
    const newAllocations = new Map(pendingAllocations)
    const current = newAllocations.get(resourceId) || {
      resourceId,
      numberOfResources: 1,
      focusFactor: 80,
    }

    newAllocations.set(resourceId, { ...current, [field]: value })
    setPendingAllocations(newAllocations)
    setHasChanges(true)
  }

  const handleRemovePending = (resourceId: string) => {
    const newAllocations = new Map(pendingAllocations)
    newAllocations.delete(resourceId)
    setPendingAllocations(newAllocations)
    setHasChanges(newAllocations.size > 0)
  }

  const handleSaveAll = () => {
    if (!selectedProject || pendingAllocations.size === 0) return

    // Add all pending allocations
    pendingAllocations.forEach((allocation) => {
      assignResourceToProject(
        selectedProject.id,
        allocation.resourceId,
        allocation.numberOfResources,
        allocation.focusFactor
      )
    })

    loadProjectResources()
  }

  const handleRemoveExisting = (resourceId: string) => {
    if (!selectedProject) return
    if (confirm('Are you sure you want to remove this resource allocation?')) {
      removeResourceFromProject(selectedProject.id, resourceId)
      loadProjectResources()
    }
  }

  const handleEditExisting = (resource: Resource & { numberOfResources: number; focusFactor: number }) => {
    if (!selectedProject) return

    const newAllocations = new Map(pendingAllocations)
    newAllocations.set(resource.id, {
      resourceId: resource.id,
      numberOfResources: resource.numberOfResources,
      focusFactor: resource.focusFactor,
    })

    // Remove from existing to allow editing
    removeResourceFromProject(selectedProject.id, resource.id)

    // Reload and set as pending
    const updatedResources = projectResources.filter(r => r.id !== resource.id)
    setProjectResources(updatedResources)
    setPendingAllocations(newAllocations)
    setHasChanges(true)
  }

  const availableResources = resources.filter(
    (r) => !projectResources.some((pr) => pr.id === r.id) && !pendingAllocations.has(r.id)
  )

  return (
    <div className="container-wide section-spacing">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-h1 font-serif text-navy-900 dark:text-white mb-2">
          Project Configurations
        </h1>
        <p className="text-navy-600 dark:text-navy-400">
          Configure resource allocations and focus factors for your projects
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-navy-800 rounded-xl border border-navy-100 dark:border-navy-700 p-4">
            <h2 className="text-lg font-semibold text-navy-900 dark:text-white mb-4">Projects</h2>
            {projects.filter((p) => p.status === 'Active').length === 0 ? (
              <p className="text-sm text-navy-600 dark:text-navy-400">No active projects</p>
            ) : (
              <div className="space-y-2">
                {projects
                  .filter((p) => p.status === 'Active')
                  .map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedProject?.id === project.id
                          ? 'bg-salmon-100 dark:bg-salmon-900/30 text-salmon-700 dark:text-salmon-400'
                          : 'hover:bg-navy-50 dark:hover:bg-navy-700 text-navy-700 dark:text-navy-300'
                      }`}
                    >
                      <div className="font-medium">{project.title}</div>
                      <div className="text-xs opacity-75 line-clamp-1">{project.description}</div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Resource Configuration */}
        <div className="lg:col-span-2">
          {!selectedProject ? (
            <div className="bg-white dark:bg-navy-800 rounded-xl border border-navy-100 dark:border-navy-700 p-8 text-center">
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
                Select a Project
              </h3>
              <p className="text-navy-600 dark:text-navy-400">
                Choose a project from the list to configure its resources
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Project Header */}
              <div className="bg-white dark:bg-navy-800 rounded-xl border border-navy-100 dark:border-navy-700 p-6">
                <h2 className="text-xl font-semibold text-navy-900 dark:text-white">
                  {selectedProject.title}
                </h2>
                <p className="text-sm text-navy-600 dark:text-navy-400 mt-1">
                  {selectedProject.description}
                </p>
              </div>

              {/* Currently Assigned Resources */}
              {projectResources.length > 0 && (
                <div className="bg-white dark:bg-navy-800 rounded-xl border border-navy-100 dark:border-navy-700 p-6">
                  <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4">
                    Assigned Resources ({projectResources.length})
                  </h3>
                  <div className="space-y-3">
                    {projectResources.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center gap-4 p-4 border border-navy-100 dark:border-navy-700 rounded-lg
                                 hover:border-salmon-300 dark:hover:border-salmon-700 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-navy-900 dark:text-white">{resource.title}</div>
                          <div className="text-sm text-navy-600 dark:text-navy-400">{resource.description}</div>
                        </div>
                        <div className="text-center px-4 border-l border-navy-200 dark:border-navy-700">
                          <div className="text-xs text-navy-500 dark:text-navy-400">Count</div>
                          <div className="text-lg font-bold text-salmon-600 dark:text-salmon-400">
                            {resource.numberOfResources}
                          </div>
                        </div>
                        <div className="text-center px-4 border-l border-navy-200 dark:border-navy-700">
                          <div className="text-xs text-navy-500 dark:text-navy-400">Focus</div>
                          <div className="text-lg font-bold text-salmon-600 dark:text-salmon-400">
                            {resource.focusFactor}%
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditExisting(resource)}
                            className="p-2 text-navy-600 dark:text-navy-400 hover:text-salmon-600 dark:hover:text-salmon-400"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveExisting(resource.id)}
                            className="p-2 text-navy-600 dark:text-navy-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Remove"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Resources Interface */}
              <div className="bg-white dark:bg-navy-800 rounded-xl border border-navy-100 dark:border-navy-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-navy-900 dark:text-white">
                    Add Resources
                  </h3>
                  {hasChanges && (
                    <div className="flex gap-2">
                      <button
                        onClick={loadProjectResources}
                        className="px-4 py-2 text-sm font-medium text-navy-700 dark:text-navy-300
                                 hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveAll}
                        className="px-4 py-2 text-sm font-medium text-white bg-salmon-600 hover:bg-salmon-700
                                 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save All ({pendingAllocations.size})
                      </button>
                    </div>
                  )}
                </div>

                {/* Pending Allocations */}
                {pendingAllocations.size > 0 && (
                  <div className="mb-6 space-y-3">
                    <div className="text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                      Pending Allocations:
                    </div>
                    {Array.from(pendingAllocations.entries()).map(([resourceId, allocation]) => {
                      const resource = resources.find((r) => r.id === resourceId)
                      if (!resource) return null

                      return (
                        <div
                          key={resourceId}
                          className="p-4 bg-salmon-50 dark:bg-salmon-900/20 border border-salmon-200 dark:border-salmon-800 rounded-lg"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <div className="font-semibold text-navy-900 dark:text-white mb-3">
                                {resource.title}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-navy-600 dark:text-navy-400 mb-1">
                                    Number of Resources
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={allocation.numberOfResources}
                                    onChange={(e) =>
                                      handleResourceChange(resourceId, 'numberOfResources', parseInt(e.target.value) || 1)
                                    }
                                    className="w-full px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                                             bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                                             focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-navy-600 dark:text-navy-400 mb-1">
                                    Focus Factor (%)
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      step="5"
                                      value={allocation.focusFactor}
                                      onChange={(e) =>
                                        handleResourceChange(resourceId, 'focusFactor', parseInt(e.target.value))
                                      }
                                      className="flex-1"
                                    />
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={allocation.focusFactor}
                                      onChange={(e) =>
                                        handleResourceChange(resourceId, 'focusFactor', parseInt(e.target.value) || 0)
                                      }
                                      className="w-16 px-2 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                                               bg-white dark:bg-navy-900 text-navy-900 dark:text-white text-center
                                               focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemovePending(resourceId)}
                              className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              title="Remove"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Available Resources */}
                {availableResources.length === 0 ? (
                  <div className="text-center py-8 text-navy-500 dark:text-navy-400">
                    {resources.length === 0 ? (
                      <p>No resources available. Create resources first.</p>
                    ) : (
                      <p>All resources have been assigned to this project.</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium text-navy-700 dark:text-navy-300 mb-3">
                      Available Resources:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableResources.map((resource) => (
                        <button
                          key={resource.id}
                          onClick={() =>
                            handleResourceChange(resource.id, 'numberOfResources', 1)
                          }
                          className="text-left p-4 border border-navy-200 dark:border-navy-700 rounded-lg
                                   hover:border-salmon-300 dark:hover:border-salmon-700 hover:bg-salmon-50 dark:hover:bg-salmon-900/10
                                   transition-colors group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-navy-900 dark:text-white group-hover:text-salmon-700 dark:group-hover:text-salmon-400 transition-colors">
                                {resource.title}
                              </div>
                              <div className="text-sm text-navy-600 dark:text-navy-400 line-clamp-2 mt-1">
                                {resource.description}
                              </div>
                            </div>
                            <svg
                              className="w-5 h-5 text-navy-400 dark:text-navy-500 group-hover:text-salmon-600 dark:group-hover:text-salmon-400 flex-shrink-0 ml-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConfigurationsPage
