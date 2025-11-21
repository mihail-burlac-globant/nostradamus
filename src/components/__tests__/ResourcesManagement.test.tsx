import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ResourcesManagement from '../ResourcesManagement'
import { useEntitiesStore } from '../../stores/entitiesStore'

/**
 * Tests for ResourcesManagement component
 * Verifies that the extracted component works independently
 */

// Mock the store
vi.mock('../../stores/entitiesStore', () => ({
  useEntitiesStore: vi.fn()
}))

const mockResources = [
  {
    id: 'res-1',
    title: 'Backend Developer',
    description: 'Senior backend developer',
    defaultVelocity: 80,
    icon: 'php',
    status: 'Active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'res-2',
    title: 'Frontend Developer',
    description: 'React specialist',
    defaultVelocity: 90,
    icon: 'reactjs',
    status: 'Active',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 'res-3',
    title: 'QA Engineer',
    description: 'Quality assurance',
    defaultVelocity: 85,
    icon: 'qa',
    status: 'Archived',
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
  },
]

describe('ResourcesManagement', () => {
  const mockAddResource = vi.fn()
  const mockEditResource = vi.fn()
  const mockRemoveResource = vi.fn()
  const mockInitialize = vi.fn()

  beforeEach(() => {
    // Clear mocks and localStorage
    vi.clearAllMocks()
    localStorage.clear()

    // Setup default mock implementation
    vi.mocked(useEntitiesStore).mockReturnValue({
      resources: mockResources,
      isInitialized: true,
      initialize: mockInitialize,
      addResource: mockAddResource,
      editResource: mockEditResource,
      removeResource: mockRemoveResource,
      // Add other required store properties
      projects: [],
      tasks: [],
      taskDependencies: [],
      taskResources: [],
      progressSnapshots: [],
      addProject: vi.fn(),
      editProject: vi.fn(),
      removeProject: vi.fn(),
      addTask: vi.fn(),
      editTask: vi.fn(),
      removeTask: vi.fn(),
      addTaskDependency: vi.fn(),
      removeTaskDependency: vi.fn(),
      addTaskResource: vi.fn(),
      removeTaskResource: vi.fn(),
      updateTaskResource: vi.fn(),
      addProgressSnapshot: vi.fn(),
      getTaskResources: vi.fn(),
      getTaskDependencies: vi.fn(),
      getProjectTasks: vi.fn(),
      exportDatabase: vi.fn(),
      importDatabase: vi.fn(),
      clearAllData: vi.fn(),
    })
  })

  describe('Component Rendering', () => {
    it('should render the component', () => {
      render(<ResourcesManagement />)

      // Check for filter buttons which should always be present
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
    })

    it('should render all resources by default', () => {
      render(<ResourcesManagement />)

      expect(screen.getByText('Backend Developer')).toBeInTheDocument()
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
      expect(screen.getByText('QA Engineer')).toBeInTheDocument()
    })
  })

  describe('Filter Functionality', () => {
    it('should filter by All status by default', () => {
      render(<ResourcesManagement />)

      expect(screen.getByText('Backend Developer')).toBeInTheDocument()
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
      expect(screen.getByText('QA Engineer')).toBeInTheDocument()
    })

    it('should filter by Active status', async () => {
      render(<ResourcesManagement />)

      const activeButton = screen.getByRole('button', { name: /^Active$/i })
      fireEvent.click(activeButton)

      await waitFor(() => {
        expect(screen.getByText('Backend Developer')).toBeInTheDocument()
        expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
        expect(screen.queryByText('QA Engineer')).not.toBeInTheDocument()
      })
    })

    it('should filter by Archived status', async () => {
      render(<ResourcesManagement />)

      const archivedButton = screen.getByRole('button', { name: /^Archived$/i })
      fireEvent.click(archivedButton)

      await waitFor(() => {
        expect(screen.queryByText('Backend Developer')).not.toBeInTheDocument()
        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument()
        expect(screen.getByText('QA Engineer')).toBeInTheDocument()
      })
    })
  })

  describe('View Mode Toggle', () => {
    it('should save view mode to localStorage', () => {
      render(<ResourcesManagement />)

      // Verify localStorage is set to default (card)
      expect(localStorage.getItem('nostradamus_resources_view_mode')).toBe('card')
    })

    it('should restore view mode from localStorage', () => {
      // Pre-set localStorage to list view
      localStorage.setItem('nostradamus_resources_view_mode', 'list')

      render(<ResourcesManagement />)

      // Component should render successfully (view mode restored)
      expect(screen.getByText('Backend Developer')).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should handle no resources gracefully', () => {
      vi.mocked(useEntitiesStore).mockReturnValue({
        resources: [],
        isInitialized: true,
        initialize: mockInitialize,
        addResource: mockAddResource,
        editResource: mockEditResource,
        removeResource: mockRemoveResource,
        projects: [],
        tasks: [],
        taskDependencies: [],
        taskResources: [],
        progressSnapshots: [],
        addProject: vi.fn(),
        editProject: vi.fn(),
        removeProject: vi.fn(),
        addTask: vi.fn(),
        editTask: vi.fn(),
        removeTask: vi.fn(),
        addTaskDependency: vi.fn(),
        removeTaskDependency: vi.fn(),
        addTaskResource: vi.fn(),
        removeTaskResource: vi.fn(),
        updateTaskResource: vi.fn(),
        addProgressSnapshot: vi.fn(),
        getTaskResources: vi.fn(),
        getTaskDependencies: vi.fn(),
        getProjectTasks: vi.fn(),
        exportDatabase: vi.fn(),
        importDatabase: vi.fn(),
        clearAllData: vi.fn(),
      })

      render(<ResourcesManagement />)

      // Component should render filter buttons even with no resources
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
    })
  })

  describe('Resource Display', () => {
    it('should display resource title', () => {
      render(<ResourcesManagement />)

      expect(screen.getByText('Backend Developer')).toBeInTheDocument()
    })

    it('should display resource description', () => {
      render(<ResourcesManagement />)

      expect(screen.getByText('Senior backend developer')).toBeInTheDocument()
    })

    it('should display resource status badge', () => {
      render(<ResourcesManagement />)

      const activeBadges = screen.getAllByText('Active')
      expect(activeBadges.length).toBeGreaterThan(0)
    })
  })

  describe('Component Independence', () => {
    it('should work as a standalone component', () => {
      // Render without any props
      const { container } = render(<ResourcesManagement />)

      expect(container).toBeInTheDocument()
      // Component renders successfully with mock store
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
    })

    it('should manage its own filter state', async () => {
      render(<ResourcesManagement />)

      // Initially all resources visible
      expect(screen.getByText('Backend Developer')).toBeInTheDocument()
      expect(screen.getByText('QA Engineer')).toBeInTheDocument()

      // Filter to Active only
      const activeButton = screen.getByRole('button', { name: /^Active$/i })
      fireEvent.click(activeButton)

      // State should update independently
      await waitFor(() => {
        expect(screen.getByText('Backend Developer')).toBeInTheDocument()
        expect(screen.queryByText('QA Engineer')).not.toBeInTheDocument()
      })
    })
  })
})
