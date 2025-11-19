import { useState, useEffect } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Project } from '../types/entities.types'

const ProjectsPage = () => {
  const {
    projects,
    isInitialized,
    initialize,
    loadProjects,
    addProject,
    editProject,
    removeProject,
    archiveProject,
    unarchiveProject,
    getProjectResources,
    getProjectConfigurations,
  } = useEntitiesStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [viewingProject, setViewingProject] = useState<Project | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Archived'>('all')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Active' as 'Active' | 'Archived',
  })

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  const filteredProjects = projects.filter((p) =>
    filterStatus === 'all' ? true : p.status === filterStatus
  )

  const handleCreateProject = () => {
    if (!formData.title.trim()) return

    // Check for duplicate title
    const duplicateExists = projects.some(
      (p) => p.title.toLowerCase() === formData.title.trim().toLowerCase()
    )

    if (duplicateExists) {
      setErrorMessage('A project with this name already exists. Please choose a different name.')
      return
    }

    addProject(formData)
    setFormData({ title: '', description: '', status: 'Active' })
    setErrorMessage('')
    setShowCreateModal(false)
  }

  const handleEditProject = () => {
    if (!editingProject || !formData.title.trim()) return

    // Check for duplicate title (excluding the current project being edited)
    const duplicateExists = projects.some(
      (p) => p.id !== editingProject.id && p.title.toLowerCase() === formData.title.trim().toLowerCase()
    )

    if (duplicateExists) {
      setErrorMessage('A project with this name already exists. Please choose a different name.')
      return
    }

    editProject(editingProject.id, formData)
    setEditingProject(null)
    setFormData({ title: '', description: '', status: 'Active' })
    setErrorMessage('')
  }

  const handleDeleteProject = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      removeProject(id)
    }
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setFormData({
      title: project.title,
      description: project.description,
      status: project.status,
    })
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingProject(null)
    setFormData({ title: '', description: '', status: 'Active' })
    setErrorMessage('')
  }

  const projectResources = viewingProject ? getProjectResources(viewingProject.id) : []
  const projectConfigs = viewingProject ? getProjectConfigurations(viewingProject.id) : []

  return (
    <div className="container-wide section-spacing">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-serif text-navy-900 dark:text-white mb-2">
            Projects
          </h1>
          <p className="text-navy-600 dark:text-navy-400">
            Manage your projects, resources, and configurations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 text-sm font-medium
                   text-white bg-salmon-600 hover:bg-salmon-700
                   rounded-lg transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Project
        </button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFilterStatus('all')
              loadProjects()
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterStatus === 'all'
                ? 'bg-salmon-100 text-salmon-700 dark:bg-salmon-900/30 dark:text-salmon-400'
                : 'bg-navy-50 text-navy-700 hover:bg-navy-100 dark:bg-navy-800 dark:text-navy-300'
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => {
              setFilterStatus('Active')
              loadProjects('Active')
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterStatus === 'Active'
                ? 'bg-salmon-100 text-salmon-700 dark:bg-salmon-900/30 dark:text-salmon-400'
                : 'bg-navy-50 text-navy-700 hover:bg-navy-100 dark:bg-navy-800 dark:text-navy-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => {
              setFilterStatus('Archived')
              loadProjects('Archived')
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterStatus === 'Archived'
                ? 'bg-salmon-100 text-salmon-700 dark:bg-salmon-900/30 dark:text-salmon-400'
                : 'bg-navy-50 text-navy-700 hover:bg-navy-100 dark:bg-navy-800 dark:text-navy-300'
            }`}
          >
            Archived
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex gap-1 bg-navy-50 dark:bg-navy-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('card')}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              viewMode === 'card'
                ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-400 shadow-sm'
                : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
            }`}
            title="Card view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-navy-700 text-salmon-600 dark:text-salmon-400 shadow-sm'
                : 'text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-navy-200'
            }`}
            title="List view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Projects Display */}
      {filteredProjects.length === 0 ? (
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
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="text-lg font-medium text-navy-900 dark:text-white mb-2">
            No projects found
          </h3>
          <p className="text-navy-600 dark:text-navy-400">
            Get started by creating your first project
          </p>
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-navy-800 rounded-xl border border-navy-100 dark:border-navy-700
                       hover:border-salmon-300 dark:hover:border-salmon-700 transition-all duration-200
                       overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-2 group-hover:text-salmon-600 dark:group-hover:text-salmon-400 transition-colors">
                      {project.title}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.status === 'Active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-navy-600 dark:text-navy-400 mb-4 line-clamp-2">
                  {project.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-navy-100 dark:border-navy-700">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingProject(project)}
                      className="text-sm text-navy-600 dark:text-navy-400 hover:text-salmon-600 dark:hover:text-salmon-400"
                      title="View details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditModal(project)}
                      className="text-sm text-navy-600 dark:text-navy-400 hover:text-salmon-600 dark:hover:text-salmon-400"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {project.status === 'Active' ? (
                      <button
                        onClick={() => archiveProject(project.id)}
                        className="text-sm text-navy-600 dark:text-navy-400 hover:text-yellow-600 dark:hover:text-yellow-400"
                        title="Archive"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => unarchiveProject(project.id)}
                        className="text-sm text-navy-600 dark:text-navy-400 hover:text-green-600 dark:hover:text-green-400"
                        title="Unarchive"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteProject(project.id)}
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
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-navy-100 dark:border-navy-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50 dark:bg-navy-900/50 border-b border-navy-100 dark:border-navy-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-navy-500 dark:text-navy-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-navy-500 dark:text-navy-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-navy-500 dark:text-navy-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-navy-500 dark:text-navy-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100 dark:divide-navy-700">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-navy-50 dark:hover:bg-navy-900/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-navy-900 dark:text-white">
                      {project.title}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-navy-600 dark:text-navy-400 line-clamp-2">
                      {project.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.status === 'Active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingProject(project)}
                        className="text-navy-600 dark:text-navy-400 hover:text-salmon-600 dark:hover:text-salmon-400"
                        title="View details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEditModal(project)}
                        className="text-navy-600 dark:text-navy-400 hover:text-salmon-600 dark:hover:text-salmon-400"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {project.status === 'Active' ? (
                        <button
                          onClick={() => archiveProject(project.id)}
                          className="text-navy-600 dark:text-navy-400 hover:text-yellow-600 dark:hover:text-yellow-400"
                          title="Archive"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => unarchiveProject(project.id)}
                          className="text-navy-600 dark:text-navy-400 hover:text-green-600 dark:hover:text-green-400"
                          title="Unarchive"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-navy-600 dark:text-navy-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingProject) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-navy-100 dark:border-navy-700">
              <h2 className="text-xl font-semibold text-navy-900 dark:text-white">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Title
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

            <div className="p-6 border-t border-navy-100 dark:border-navy-700 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2 text-sm font-medium text-navy-700 dark:text-navy-300
                         hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingProject ? handleEditProject : handleCreateProject}
                className="px-6 py-2 text-sm font-medium text-white bg-salmon-600 hover:bg-salmon-700
                         rounded-lg transition-colors"
              >
                {editingProject ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Project Details Modal */}
      {viewingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-navy-100 dark:border-navy-700">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-navy-900 dark:text-white mb-2">
                    {viewingProject.title}
                  </h2>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      viewingProject.status === 'Active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}
                  >
                    {viewingProject.status}
                  </span>
                </div>
                <button
                  onClick={() => setViewingProject(null)}
                  className="text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-navy-500 dark:text-navy-400 mb-2">Description</h3>
                <p className="text-navy-900 dark:text-white">{viewingProject.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-navy-500 dark:text-navy-400 mb-2">
                    Assigned Resources ({projectResources.length})
                  </h3>
                  {projectResources.length === 0 ? (
                    <p className="text-sm text-navy-600 dark:text-navy-400">No resources assigned</p>
                  ) : (
                    <ul className="space-y-2">
                      {projectResources.map((resource) => (
                        <li key={resource.id} className="text-sm text-navy-900 dark:text-white">
                          {resource.title} {resource.role && `(${resource.role})`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-navy-500 dark:text-navy-400 mb-2">
                    Configurations ({projectConfigs.length})
                  </h3>
                  {projectConfigs.length === 0 ? (
                    <p className="text-sm text-navy-600 dark:text-navy-400">No configurations applied</p>
                  ) : (
                    <ul className="space-y-2">
                      {projectConfigs.map((config) => (
                        <li key={config.id} className="text-sm text-navy-900 dark:text-white">
                          {config.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-navy-100 dark:border-navy-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-navy-500 dark:text-navy-400">Created:</span>
                    <span className="ml-2 text-navy-900 dark:text-white">
                      {new Date(viewingProject.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-navy-500 dark:text-navy-400">Updated:</span>
                    <span className="ml-2 text-navy-900 dark:text-white">
                      {new Date(viewingProject.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage
