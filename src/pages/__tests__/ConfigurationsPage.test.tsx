import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ConfigurationsPage from '../ConfigurationsPage'

/**
 * Tests for ConfigurationsPage with tab navigation
 * Verifies that Resources are properly integrated as a tab
 */

// Mock database service to avoid WASM loading issues
vi.mock('../../services/database', () => ({
  initDatabase: vi.fn().mockResolvedValue(undefined),
  exportDatabaseToFile: vi.fn(),
  importDatabaseFromFile: vi.fn(),
  clearDatabase: vi.fn(),
}))

// Mock ResourcesManagement component
vi.mock('../../components/ResourcesManagement', () => ({
  default: () => <div data-testid="resources-management">Resources Management Component</div>
}))

// Mock entitiesStore
vi.mock('../../stores/entitiesStore', () => ({
  useEntitiesStore: vi.fn(() => ({
    isInitialized: true,
    initialize: vi.fn(),
    projects: [],
    tasks: [],
    resources: [],
    configurations: [],
    taskDependencies: [],
    taskResources: [],
    progressSnapshots: [],
    exportDatabase: vi.fn(),
    importDatabase: vi.fn(),
    clearAllData: vi.fn(),
    addConfiguration: vi.fn(),
    editConfiguration: vi.fn(),
    removeConfiguration: vi.fn(),
    loadConfigurations: vi.fn(),
  })),
}))

describe('ConfigurationsPage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    )
  }

  describe('Tab Navigation', () => {
    it('should render both tabs (Configurations and Resource Types)', () => {
      renderWithRouter(<ConfigurationsPage />)

      const tabs = screen.getAllByRole('button')
      const tabTexts = tabs.map(tab => tab.textContent)

      expect(tabTexts).toContain('Configurations')
      expect(tabTexts).toContain('Resource Types')
    })

    it('should default to Configurations tab', () => {
      renderWithRouter(<ConfigurationsPage />)

      // Resources component should not be rendered initially
      expect(screen.queryByTestId('resources-management')).not.toBeInTheDocument()
    })

    it('should switch to Resources tab when clicked', async () => {
      renderWithRouter(<ConfigurationsPage />)

      // Find and click Resources tab
      const buttons = screen.getAllByRole('button')
      const resourcesTab = buttons.find(btn => btn.textContent === 'Resource Types')

      expect(resourcesTab).toBeDefined()
      fireEvent.click(resourcesTab!)

      // Wait for Resources component to render
      await waitFor(() => {
        expect(screen.getByTestId('resources-management')).toBeInTheDocument()
      })
    })

    it('should switch back to Configurations tab', async () => {
      renderWithRouter(<ConfigurationsPage />)

      const buttons = screen.getAllByRole('button')
      const resourcesTab = buttons.find(btn => btn.textContent === 'Resource Types')
      const configurationsTab = buttons.find(btn => btn.textContent === 'Configurations')

      // Switch to Resources
      fireEvent.click(resourcesTab!)

      await waitFor(() => {
        expect(screen.getByTestId('resources-management')).toBeInTheDocument()
      })

      // Switch back to Configurations
      fireEvent.click(configurationsTab!)

      await waitFor(() => {
        expect(screen.queryByTestId('resources-management')).not.toBeInTheDocument()
      })
    })
  })

  describe('Tab State Persistence', () => {
    it('should save active tab to localStorage when switching tabs', async () => {
      renderWithRouter(<ConfigurationsPage />)

      // Initial state should be 'configurations'
      expect(localStorage.getItem('nostradamus_config_active_tab')).toBe('configurations')

      // Switch to Resources tab
      const buttons = screen.getAllByRole('button')
      const resourcesTab = buttons.find(btn => btn.textContent === 'Resource Types')
      fireEvent.click(resourcesTab!)

      // Wait for state update
      await waitFor(() => {
        expect(localStorage.getItem('nostradamus_config_active_tab')).toBe('resources')
      })
    })

    it('should restore last active tab from localStorage', () => {
      // Pre-set localStorage to 'resources'
      localStorage.setItem('nostradamus_config_active_tab', 'resources')

      renderWithRouter(<ConfigurationsPage />)

      // Should render Resources tab content
      expect(screen.getByTestId('resources-management')).toBeInTheDocument()
    })

    it('should default to configurations tab if localStorage has invalid value', () => {
      // Set invalid value in localStorage
      localStorage.setItem('nostradamus_config_active_tab', 'invalid-tab')

      renderWithRouter(<ConfigurationsPage />)

      // Should NOT render Resources tab content (default to configurations)
      expect(screen.queryByTestId('resources-management')).not.toBeInTheDocument()
    })
  })

  describe('Tab Styling', () => {
    it('should apply active styles to Configurations tab by default', () => {
      renderWithRouter(<ConfigurationsPage />)

      const buttons = screen.getAllByRole('button')
      const configurationsTab = buttons.find(btn => btn.textContent === 'Configurations')

      // Should have active tab classes
      expect(configurationsTab?.className).toContain('text-salmon-600')
      expect(configurationsTab?.className).toContain('border-salmon-600')
    })

    it('should apply active styles to Resources tab when selected', async () => {
      renderWithRouter(<ConfigurationsPage />)

      const buttons = screen.getAllByRole('button')
      const resourcesTab = buttons.find(btn => btn.textContent === 'Resource Types')

      fireEvent.click(resourcesTab!)

      await waitFor(() => {
        // Should have active tab classes
        expect(resourcesTab?.className).toContain('text-salmon-600')
        expect(resourcesTab?.className).toContain('border-salmon-600')
      })
    })

    it('should apply inactive styles to non-selected tab', () => {
      renderWithRouter(<ConfigurationsPage />)

      const buttons = screen.getAllByRole('button')
      const resourcesTab = buttons.find(btn => btn.textContent === 'Resource Types')

      // Should have inactive tab classes
      expect(resourcesTab?.className).toContain('text-navy-500')
      expect(resourcesTab?.className).toContain('border-transparent')
    })
  })

  describe('Resources Tab Integration', () => {
    it('should render ResourcesManagement component in Resources tab', async () => {
      renderWithRouter(<ConfigurationsPage />)

      // Switch to Resources tab
      const buttons = screen.getAllByRole('button')
      const resourcesTab = buttons.find(btn => btn.textContent === 'Resource Types')
      fireEvent.click(resourcesTab!)

      // Verify ResourcesManagement component is rendered
      await waitFor(() => {
        expect(screen.getByTestId('resources-management')).toBeInTheDocument()
      })
    })

    it('should only render one tab content at a time', async () => {
      renderWithRouter(<ConfigurationsPage />)

      // Initially only Configurations (Resources not rendered)
      expect(screen.queryByTestId('resources-management')).not.toBeInTheDocument()

      // Switch to Resources
      const buttons = screen.getAllByRole('button')
      const resourcesTab = buttons.find(btn => btn.textContent === 'Resource Types')
      fireEvent.click(resourcesTab!)

      await waitFor(() => {
        // Now only Resources
        expect(screen.getByTestId('resources-management')).toBeInTheDocument()
      })
    })
  })
})
