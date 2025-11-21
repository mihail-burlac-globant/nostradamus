import { useState, useEffect, useRef } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Project, Resource, Configuration } from '../types/entities.types'
import { downloadProjectExport, parseImportFile, importProject, type ProjectExport, type ImportProgress } from '../utils/projectImportExport'
import ProjectWizardDialog, { type ProjectFormData } from '../components/ProjectWizardDialog'

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
    assignConfigurationToProject,
    assignResourceToProject,
    removeConfigurationFromProject,
    removeResourceFromProject,
  } = useEntitiesStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [viewingProject, setViewingProject] = useState<Project | null>(null)
  const [projectResources, setProjectResources] = useState<(Resource & { numberOfResources: number; focusFactor: number })[]>([])
  const [projectConfigs, setProjectConfigs] = useState<Configuration[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Archived'>('all')
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    const saved = localStorage.getItem('nostradamus_projects_view_mode')
    return (saved === 'list' || saved === 'card') ? saved : 'card'
  })
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [importError, setImportError] = useState<string>('')
  const [importSuccess, setImportSuccess] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<ProjectExport | null>(null)
  const [importProjectName, setImportProjectName] = useState<string>('')
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  useEffect(() => {
    localStorage.setItem('nostradamus_projects_view_mode', viewMode)
  }, [viewMode])

  useEffect(() => {
    if (viewingProject) {
      const resources = getProjectResources(viewingProject.id)
      const configs = getProjectConfigurations(viewingProject.id)
      setProjectResources(resources)
      setProjectConfigs(configs)
    }
  }, [viewingProject, getProjectResources, getProjectConfigurations])

  const filteredProjects = projects.filter((p) =>
    filterStatus === 'all' ? true : p.status === filterStatus
  )

  // Get configuration summary for a project
  const getConfigSummary = (projectId: string): string => {
    const configs = getProjectConfigurations(projectId)
    if (configs.length === 0) return 'No configuration'
    if (configs.length === 1) return configs[0].name
    return `${configs.length} configurations`
  }

  const handleWizardSubmit = (formData: ProjectFormData) => {
    if (!formData.title.trim()) return

    if (editingProject) {
      // Editing existing project
      // Check for duplicate title (excluding the current project being edited)
      const duplicateExists = projects.some(
        (p) => p.id !== editingProject.id && p.title.toLowerCase() === formData.title.trim().toLowerCase()
      )

      if (duplicateExists) {
        setErrorMessage('A project with this name already exists. Please choose a different name.')
        return
      }

      // Update basic project info
      editProject(editingProject.id, {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        startDate: formData.startDate,
      })

      // Update configuration
      const currentConfigs = getProjectConfigurations(editingProject.id)
      currentConfigs.forEach(config => {
        removeConfigurationFromProject(editingProject.id, config.id)
      })
      if (formData.configurationId) {
        assignConfigurationToProject(editingProject.id, formData.configurationId)
      }

      // Update resources
      const currentResources = getProjectResources(editingProject.id)
      currentResources.forEach(resource => {
        removeResourceFromProject(editingProject.id, resource.id)
      })
      formData.resources.forEach(resource => {
        assignResourceToProject(
          editingProject.id,
          resource.resourceId,
          resource.numberOfResources,
          resource.focusFactor
        )
      })

      setEditingProject(null)
      setErrorMessage('')
    } else {
      // Creating new project
      // Check for duplicate title
      const duplicateExists = projects.some(
        (p) => p.title.toLowerCase() === formData.title.trim().toLowerCase()
      )

      if (duplicateExists) {
        setErrorMessage('A project with this name already exists. Please choose a different name.')
        return
      }

      // Create the project (returns the new project)
      const newProject = addProject({
        title: formData.title,
        description: formData.description,
        status: formData.status,
        startDate: formData.startDate,
      })

      // The store auto-assigns default configuration, so we need to replace it if different
      const currentConfigs = getProjectConfigurations(newProject.id)

      // Remove auto-assigned config if we have a specific one from the wizard
      if (formData.configurationId) {
        currentConfigs.forEach(config => {
          if (config.id !== formData.configurationId) {
            removeConfigurationFromProject(newProject.id, config.id)
          }
        })
        // Assign the selected configuration (if not already assigned)
        if (!currentConfigs.some(c => c.id === formData.configurationId)) {
          assignConfigurationToProject(newProject.id, formData.configurationId)
        }
      }

      // Assign resources
      formData.resources.forEach(resource => {
        assignResourceToProject(
          newProject.id,
          resource.resourceId,
          resource.numberOfResources,
          resource.focusFactor
        )
      })

      setShowCreateModal(false)
      setErrorMessage('')
    }
  }

  const handleDeleteProject = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      removeProject(id)
    }
  }

  const handleExportProject = (project: Project) => {
    try {
      downloadProjectExport(project.id, project.title)
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleImportClick = () => {
    setImportError('')
    setImportSuccess('')
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportError('')
    setImportSuccess('')

    try {
      // Parse and validate the file
      const data = await parseImportFile(file)

      // Show import dialog with project info
      setPendingImportData(data)
      setImportProjectName(data.project.title)
      setShowImportDialog(true)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to parse import file')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleExecuteImport = () => {
    if (!pendingImportData) return

    setIsImporting(true)
    setImportProgress(null)

    try {
      importProject(
        pendingImportData,
        importProjectName,
        (progress) => {
          setImportProgress(progress)
        }
      )

      setImportSuccess(`Project "${importProjectName}" imported successfully!`)
      loadProjects()
      setShowImportDialog(false)
      setPendingImportData(null)
      setImportProjectName('')
      setImportProgress(null)
      setTimeout(() => setImportSuccess(''), 5000)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import project')
      setShowImportDialog(false)
      setPendingImportData(null)
      setImportProjectName('')
      setImportProgress(null)
    } finally {
      setIsImporting(false)
    }
  }

  const handleCancelImport = () => {
    setShowImportDialog(false)
    setPendingImportData(null)
    setImportProjectName('')
    setImportProgress(null)
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setErrorMessage('')
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingProject(null)
    setErrorMessage('')
  }

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
        <div className="flex items-center gap-3">
          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium
                     text-navy-700 dark:text-navy-300 bg-white dark:bg-navy-800
                     border border-navy-200 dark:border-navy-700
                     hover:bg-navy-50 dark:hover:bg-navy-700
                     rounded-lg transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Project
          </button>
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
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Import Error/Success Messages */}
      {importError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-200">{importError}</p>
            </div>
            <button
              onClick={() => setImportError('')}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {importSuccess && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-green-800 dark:text-green-200">{importSuccess}</p>
            </div>
            <button
              onClick={() => setImportSuccess('')}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
                    <button
                      onClick={() => handleExportProject(project)}
                      className="text-sm text-navy-600 dark:text-navy-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title="Export project data"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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
                  Configuration
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
                    <div className="text-sm text-navy-600 dark:text-navy-400">
                      {getConfigSummary(project.id)}
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
                      <button
                        onClick={() => handleExportProject(project)}
                        className="text-navy-600 dark:text-navy-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Export project data"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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

      {/* Create/Edit Wizard Modal */}
      {(showCreateModal || editingProject) && (
        <ProjectWizardDialog
          editingProject={editingProject}
          onClose={closeModal}
          onSubmit={handleWizardSubmit}
          errorMessage={errorMessage}
        />
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
                        <li key={resource.id} className="text-sm">
                          <div className="text-navy-900 dark:text-white font-medium">{resource.title}</div>
                          <div className="text-xs text-navy-600 dark:text-navy-400">
                            {resource.numberOfResources} resource{resource.numberOfResources > 1 ? 's' : ''} • {resource.focusFactor}% focus
                          </div>
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

      {/* Import Project Dialog */}
      {showImportDialog && pendingImportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-navy-100 dark:border-navy-700">
              <h2 className="text-xl font-semibold text-navy-900 dark:text-white">
                Import Project
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Project Info */}
              <div className="bg-navy-50 dark:bg-navy-900/30 rounded-lg p-4">
                <h3 className="text-sm font-medium text-navy-700 dark:text-navy-300 mb-3">
                  Project Contents
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-navy-600 dark:text-navy-400">
                      {pendingImportData.tasks.length} task{pendingImportData.tasks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-navy-600 dark:text-navy-400">
                      {pendingImportData.projectResources.length} resource{pendingImportData.projectResources.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                    <span className="text-navy-600 dark:text-navy-400">
                      {pendingImportData.milestones.length} milestone{pendingImportData.milestones.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-navy-600 dark:text-navy-400">
                      {pendingImportData.progressSnapshots.length} snapshot{pendingImportData.progressSnapshots.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Project Name Input */}
              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={importProjectName}
                  onChange={(e) => setImportProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  placeholder="Enter project name"
                  disabled={isImporting}
                />
                <p className="mt-1 text-xs text-navy-500 dark:text-navy-400">
                  You can customize the project name or keep the original
                </p>
              </div>

              {/* Import Progress */}
              {importProgress && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {importProgress.stage}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                    Step {importProgress.current} of {importProgress.total}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-navy-100 dark:border-navy-700 flex justify-end gap-3">
              <button
                onClick={handleCancelImport}
                disabled={isImporting}
                className="px-6 py-2 text-sm font-medium text-navy-700 dark:text-navy-300
                         hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={isImporting || !importProjectName.trim()}
                className="px-6 py-2 text-sm font-medium text-white bg-salmon-600 hover:bg-salmon-700
                         rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Importing...' : 'Import Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage
