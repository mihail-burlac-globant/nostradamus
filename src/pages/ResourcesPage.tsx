import { useState, useEffect } from 'react'
import { useEntitiesStore } from '../stores/entitiesStore'
import type { Resource } from '../types/entities.types'
import { RESOURCE_ICONS, getIconById } from '../utils/resourceIcons'

const ResourcesPage = () => {
  const {
    resources,
    isInitialized,
    initialize,
    addResource,
    editResource,
    removeResource,
  } = useEntitiesStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Archived'>('all')
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    const saved = localStorage.getItem('nostradamus_resources_view_mode')
    return (saved === 'list' || saved === 'card') ? saved : 'card'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    defaultVelocity: 80,
    icon: 'generic',
    status: 'Active' as 'Active' | 'Archived',
  })

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  useEffect(() => {
    localStorage.setItem('nostradamus_resources_view_mode', viewMode)
  }, [viewMode])

  const filteredResources = resources.filter((r) => {
    const matchesStatus = filterStatus === 'all' ? true : r.status === filterStatus
    const matchesSearch = searchQuery === '' ? true :
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const handleCreateResource = () => {
    if (!formData.title.trim()) return

    // Check for duplicate title
    const duplicateExists = resources.some(
      (r) => r.title.toLowerCase() === formData.title.trim().toLowerCase()
    )

    if (duplicateExists) {
      setErrorMessage('A resource type with this name already exists. Please choose a different name.')
      return
    }

    addResource(formData)
    setFormData({ title: '', description: '', defaultVelocity: 80, icon: 'generic', status: 'Active' })
    setErrorMessage('')
    setShowCreateModal(false)
  }

  const handleEditResource = () => {
    if (!editingResource || !formData.title.trim()) return

    // Check for duplicate title (excluding the current resource being edited)
    const duplicateExists = resources.some(
      (r) => r.id !== editingResource.id && r.title.toLowerCase() === formData.title.trim().toLowerCase()
    )

    if (duplicateExists) {
      setErrorMessage('A resource type with this name already exists. Please choose a different name.')
      return
    }

    editResource(editingResource.id, formData)
    setEditingResource(null)
    setFormData({ title: '', description: '', defaultVelocity: 80, icon: 'generic', status: 'Active' })
    setErrorMessage('')
  }

  const handleDeleteResource = (id: string) => {
    if (confirm('Are you sure you want to delete this resource type?')) {
      removeResource(id)
    }
  }

  const openEditModal = (resource: Resource) => {
    setEditingResource(resource)
    setFormData({
      title: resource.title,
      description: resource.description,
      defaultVelocity: resource.defaultVelocity,
      icon: resource.icon || 'generic',
      status: resource.status,
    })
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingResource(null)
    setFormData({ title: '', description: '', defaultVelocity: 80, icon: 'generic', status: 'Active' })
    setErrorMessage('')
  }

  return (
    <div className="container-wide section-spacing">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-serif text-navy-900 dark:text-white mb-2">
            Resource Types
          </h1>
          <p className="text-navy-600 dark:text-navy-400">
            Manage resource types like PHP, TypeScript, ReactJS, iOS, etc.
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
          Add Resource Type
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or description..."
            className="w-full px-4 py-2.5 pl-10 border border-navy-200 dark:border-navy-700 rounded-lg
                     bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                     focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400 dark:text-navy-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterStatus === 'all'
                ? 'bg-salmon-100 text-salmon-700 dark:bg-salmon-900/30 dark:text-salmon-400'
                : 'bg-navy-50 text-navy-700 hover:bg-navy-100 dark:bg-navy-800 dark:text-navy-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('Active')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterStatus === 'Active'
                ? 'bg-salmon-100 text-salmon-700 dark:bg-salmon-900/30 dark:text-salmon-400'
                : 'bg-navy-50 text-navy-700 hover:bg-navy-100 dark:bg-navy-800 dark:text-navy-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterStatus('Archived')}
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

      {/* Resources Display */}
      {filteredResources.length === 0 ? (
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
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <h3 className="text-lg font-medium text-navy-900 dark:text-white mb-2">
            No resource types found
          </h3>
          <p className="text-navy-600 dark:text-navy-400">
            Add your first resource type like PHP, TypeScript, or ReactJS
          </p>
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <div
              key={resource.id}
              className="bg-white dark:bg-navy-800 rounded-xl border border-navy-100 dark:border-navy-700
                       hover:border-salmon-300 dark:hover:border-salmon-700 transition-all duration-200
                       overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {(() => {
                        const IconComponent = getIconById(resource.icon || 'generic')
                        return <IconComponent className="w-8 h-8 text-salmon-600 dark:text-salmon-400" />
                      })()}
                      <h3 className="text-lg font-semibold text-navy-900 dark:text-white group-hover:text-salmon-600 dark:group-hover:text-salmon-400 transition-colors">
                        {resource.title}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        resource.status === 'Active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}
                    >
                      {resource.status}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-navy-600 dark:text-navy-400 mb-4 line-clamp-2">
                  {resource.description}
                </p>

                <div className="mb-4">
                  <div className="text-xs text-navy-500 dark:text-navy-400 mb-1">Default Velocity</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-navy-100 dark:bg-navy-700 rounded-full h-2">
                      <div
                        className="bg-salmon-600 h-2 rounded-full transition-all"
                        style={{ width: `${resource.defaultVelocity}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-navy-900 dark:text-white">
                      {resource.defaultVelocity}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-navy-100 dark:border-navy-700">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(resource)}
                      className="text-sm text-navy-600 dark:text-navy-400 hover:text-salmon-600 dark:hover:text-salmon-400"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteResource(resource.id)}
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
                  Resource Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-navy-500 dark:text-navy-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-navy-500 dark:text-navy-400 uppercase tracking-wider">
                  Default Velocity
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
              {filteredResources.map((resource) => (
                <tr key={resource.id} className="hover:bg-navy-50 dark:hover:bg-navy-900/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const IconComponent = getIconById(resource.icon || 'generic')
                        return <IconComponent className="w-6 h-6 text-salmon-600 dark:text-salmon-400" />
                      })()}
                      <div className="text-sm font-medium text-navy-900 dark:text-white">
                        {resource.title}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-navy-600 dark:text-navy-400 line-clamp-2">
                      {resource.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-navy-100 dark:bg-navy-700 rounded-full h-2">
                        <div
                          className="bg-salmon-600 h-2 rounded-full transition-all"
                          style={{ width: `${resource.defaultVelocity}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-navy-900 dark:text-white">
                        {resource.defaultVelocity}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        resource.status === 'Active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}
                    >
                      {resource.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
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
                        onClick={() => handleDeleteResource(resource.id)}
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
      {(showCreateModal || editingResource) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-navy-100 dark:border-navy-700">
              <h2 className="text-xl font-semibold text-navy-900 dark:text-white">
                {editingResource ? 'Edit Resource Type' : 'Add New Resource Type'}
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
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  placeholder="e.g., PHP, TypeScript, ReactJS, iOS"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                           bg-white dark:bg-navy-900 text-navy-900 dark:text-white
                           focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  placeholder="Describe this resource type"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Icon <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-2 border border-navy-200 dark:border-navy-700 rounded-lg bg-white dark:bg-navy-900">
                  {RESOURCE_ICONS.map((icon) => {
                    const IconComponent = icon.component
                    const isSelected = formData.icon === icon.id
                    return (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: icon.id })}
                        className={`p-3 rounded-lg border-2 transition-all hover:scale-110 ${
                          isSelected
                            ? 'border-salmon-600 dark:border-salmon-400 bg-salmon-50 dark:bg-salmon-900/20'
                            : 'border-navy-200 dark:border-navy-700 hover:border-salmon-300 dark:hover:border-salmon-600'
                        }`}
                        title={icon.name}
                      >
                        <IconComponent className={`w-6 h-6 ${
                          isSelected
                            ? 'text-salmon-600 dark:text-salmon-400'
                            : 'text-navy-600 dark:text-navy-400'
                        }`} />
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1 text-xs text-navy-500 dark:text-navy-400">
                  Select an icon that represents this resource type
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-2">
                  Default Velocity (Focus Factor %) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.defaultVelocity}
                    onChange={(e) => setFormData({ ...formData, defaultVelocity: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.defaultVelocity}
                    onChange={(e) => setFormData({ ...formData, defaultVelocity: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border border-navy-200 dark:border-navy-700 rounded-lg
                             bg-white dark:bg-navy-900 text-navy-900 dark:text-white text-center
                             focus:ring-2 focus:ring-salmon-500 focus:border-transparent"
                  />
                  <span className="text-sm text-navy-600 dark:text-navy-400">%</span>
                </div>
                <p className="mt-1 text-xs text-navy-500 dark:text-navy-400">
                  Typical velocity for this resource type (0-100%)
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

            <div className="p-6 border-t border-navy-100 dark:border-navy-700 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2 text-sm font-medium text-navy-700 dark:text-navy-300
                         hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingResource ? handleEditResource : handleCreateResource}
                className="px-6 py-2 text-sm font-medium text-white bg-salmon-600 hover:bg-salmon-700
                         rounded-lg transition-colors"
              >
                {editingResource ? 'Save Changes' : 'Add Resource Type'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResourcesPage
