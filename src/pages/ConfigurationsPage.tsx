import { useState, useEffect } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Project, Resource } from '../types/entities.types'

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
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    resourceId: '',
    numberOfResources: 1,
    focusFactor: 80,
  })

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  useEffect(() => {
    if (selectedProject) {
      loadProjectResources()
    }
  }, [selectedProject])

  const loadProjectResources = () => {
    if (selectedProject) {
      const resources = getProjectResources(selectedProject.id)
      setProjectResources(resources)
    }
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
  }

  const handleAddResource = () => {
    if (!selectedProject || !formData.resourceId) return

    assignResourceToProject(
      selectedProject.id,
      formData.resourceId,
      formData.numberOfResources,
      formData.focusFactor
    )

    loadProjectResources()
    setFormData({ resourceId: '', numberOfResources: 1, focusFactor: 80 })
    setShowAddModal(false)
  }

  const handleEditResource = () => {
    if (!selectedProject || !editingResourceId) return

    assignResourceToProject(
      selectedProject.id,
      editingResourceId,
      formData.numberOfResources,
      formData.focusFactor
    )

    loadProjectResources()
    setEditingResourceId(null)
    setFormData({ resourceId: '', numberOfResources: 1, focusFactor: 80 })
  }

  const handleRemoveResource = (resourceId: string) => {
    if (!selectedProject) return
    if (confirm('Are you sure you want to remove this resource allocation?')) {
      removeResourceFromProject(selectedProject.id, resourceId)
      loadProjectResources()
    }
  }

  const openEditModal = (resource: Resource & { numberOfResources: number; focusFactor: number }) => {
    setEditingResourceId(resource.id)
    setFormData({
      resourceId: resource.id,
      numberOfResources: resource.numberOfResources,
      focusFactor: resource.focusFactor,
    })
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingResourceId(null)
    setFormData({ resourceId: '', numberOfResources: 1, focusFactor: 80 })
  }

  const availableResources = resources.filter(
    (r) => !projectResources.some((pr) => pr.id === r.id)
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
            <div className="bg-white dark:bg-navy-800 rounded-xl border border-navy-100 dark:border-navy-700">
              <div className="p-6 border-b border-navy-100 dark:border-navy-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-navy-900 dark:text-white">
                      {selectedProject.title}
                    </h2>
                    <p className="text-sm text-navy-600 dark:text-navy-400 mt-1">
                      {selectedProject.description}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    disabled={availableResources.length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                             text-white bg-salmon-600 hover:bg-salmon-700
                             disabled:bg-navy-300 disabled:cursor-not-allowed
                             rounded-lg transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Resource
                  </button>
                </div>
              </div>

              <div className="p-6">
                {projectResources.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-12 h-12 mx-auto mb-4 text-navy-300 dark:text-navy-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-navy-900 dark:text-white mb-2">
                      No Resources Assigned
                    </h3>
                    <p className="text-navy-600 dark:text-navy-400">
                      Add resource allocations to this project
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectResources.map((resource) => (
                      <div
                        key={resource.id}
                        className="border border-navy-100 dark:border-navy-700 rounded-lg p-4
                                 hover:border-salmon-300 dark:hover:border-salmon-700 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-1">
                              {resource.title}
                            </h3>
                            <p className="text-sm text-navy-600 dark:text-navy-400">
                              {resource.description}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => openEditModal(resource)}
                              className="text-navy-600 dark:text-navy-400 hover:text-salmon-600 dark:hover:text-salmon-400"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRemoveResource(resource.id)}
                              className="text-navy-600 dark:text-navy-400 hover:text-red-600 dark:hover:text-red-400"
                              title="Remove"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-navy-500 dark:text-navy-400 mb-1">Number of Resources</div>
                            <div className="text-2xl font-bold text-salmon-600 dark:text-salmon-400">
                              {resource.numberOfResources}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-navy-500 dark:text-navy-400 mb-1">Focus Factor</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-navy-100 dark:bg-navy-700 rounded-full h-2">
                                <div
                                  className="bg-salmon-600 h-2 rounded-full transition-all"
                                  style={{ width: `${resource.focusFactor}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-navy-900 dark:text-white">
                                {resource.focusFactor}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingResourceId) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-navy-100 dark:border-navy-700">
              <h2 className="text-xl font-semibold text-navy-900 dark:text-white">
                {editingResourceId ? 'Edit Resource Allocation' : 'Add Resource Allocation'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {!editingResourceId && (
                <div>
                  <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                    Resource Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.resourceId}
                    onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
                    className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                             bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                             focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  >
                    <option value="">Select a resource type</option>
                    {availableResources.map((resource) => (
                      <option key={resource.id} value={resource.id}>
                        {resource.title} - {resource.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Number of Resources <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.numberOfResources}
                  onChange={(e) => setFormData({ ...formData, numberOfResources: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  placeholder="Enter number of resources"
                />
                <p className="mt-1 text-xs text-navy-500 dark:text-navy-400">
                  How many resources of this type are allocated to the project
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Focus Factor (%) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.focusFactor}
                    onChange={(e) => setFormData({ ...formData, focusFactor: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.focusFactor}
                    onChange={(e) => setFormData({ ...formData, focusFactor: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                             bg-white dark:bg-navy-900 text-navy-900 dark:text-white text-center
                             focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  />
                  <span className="text-sm text-navy-600 dark:text-navy-400">%</span>
                </div>
                <p className="mt-1 text-xs text-navy-500 dark:text-navy-400">
                  Project-specific focus factor (overrides default velocity)
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-navy-100 dark:border-navy-700 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2 text-sm font-medium text-navy-700 dark:text-navy-300
                         hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingResourceId ? handleEditResource : handleAddResource}
                disabled={!editingResourceId && !formData.resourceId}
                className="px-6 py-2 text-sm font-medium text-white bg-salmon-600 hover:bg-salmon-700
                         disabled:bg-navy-300 disabled:cursor-not-allowed
                         rounded-lg transition-colors"
              >
                {editingResourceId ? 'Save Changes' : 'Add Resource'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConfigurationsPage
