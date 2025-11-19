import {
  createProject,
  createResource,
  createConfiguration,
  createTask,
  assignResourceToProject,
  assignConfigurationToProject,
  assignResourceToTask,
  addTaskDependency,
} from '../services/database'

// Helper function to add days to a date
const addDays = (date: Date, days: number): string => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result.toISOString().split('T')[0]
}

// Helper to get random item from array
const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// Helper to get random number in range
const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const seedDatabase = (): void => {
  console.log('🌱 Starting database seeding...')

  try {
    const today = new Date()
    const projectStart = addDays(today, -7) // Projects started 1 week ago

    // Create Projects
    console.log('Creating projects...')
    const project1 = createProject({
      title: 'E-Commerce Platform',
      description: 'Building a modern e-commerce platform with React and Node.js',
      status: 'Active',
      startDate: projectStart,
    })

    const project2 = createProject({
      title: 'Mobile App Redesign',
      description: 'Redesigning the mobile application for better UX',
      status: 'Active',
      startDate: projectStart,
    })

    // Create Resources
    console.log('Creating resources...')
    const reactDev = createResource({
      title: 'React Developer',
      description: 'Senior React developer with 5+ years experience',
      defaultVelocity: 85,
      icon: 'react',
      status: 'Active',
    })

    const nodeDev = createResource({
      title: 'Node.js Developer',
      description: 'Backend developer specializing in Node.js',
      defaultVelocity: 80,
      icon: 'nodejs',
      status: 'Active',
    })

    const uxDesigner = createResource({
      title: 'UX Designer',
      description: 'User experience designer',
      defaultVelocity: 75,
      icon: 'design',
      status: 'Active',
    })

    const qaEngineer = createResource({
      title: 'QA Engineer',
      description: 'Quality assurance specialist',
      defaultVelocity: 90,
      icon: 'testing',
      status: 'Active',
    })

    // Create Configurations
    console.log('Creating configurations...')
    const config1 = createConfiguration({
      name: 'Agile Sprint Configuration',
      key: 'agile_sprint_config',
      value: JSON.stringify({
        sprintDuration: 14,
        velocityTarget: 85,
        methodology: 'Scrum',
      }),
      description: 'Standard agile sprint configuration',
    })

    const config2 = createConfiguration({
      name: 'Design Sprint Configuration',
      key: 'design_sprint_config',
      value: JSON.stringify({
        sprintDuration: 10,
        velocityTarget: 75,
        methodology: 'Design Thinking',
      }),
      description: 'Design-focused sprint configuration',
    })

    // Assign Resources to Projects
    console.log('Assigning resources to projects...')
    assignResourceToProject(project1.id, reactDev.id, 2, 85)
    assignResourceToProject(project1.id, nodeDev.id, 2, 80)
    assignResourceToProject(project1.id, qaEngineer.id, 1, 90)

    assignResourceToProject(project2.id, uxDesigner.id, 2, 75)
    assignResourceToProject(project2.id, reactDev.id, 1, 85)

    // Assign Configurations to Projects (ONE per project)
    console.log('Assigning configurations to projects...')
    assignConfigurationToProject(project1.id, config1.id)
    assignConfigurationToProject(project2.id, config2.id)

    // Task colors
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

    // Task statuses with realistic distribution
    const getStatus = (dayOffset: number): 'Done' | 'In Progress' | 'Todo' => {
      if (dayOffset < -7) return 'Done'
      if (dayOffset < 7) return 'In Progress'
      return 'Todo'
    }

    // Create Tasks for Project 1: E-Commerce Platform (30 tasks over 6 months)
    console.log('Creating tasks for E-Commerce Platform...')

    const project1Tasks = [
      // Planning & Setup Phase (Weeks 1-2)
      { title: 'Project kickoff and requirements gathering', description: 'Define project scope, gather requirements, and establish success metrics', duration: 3 },
      { title: 'Technical architecture design', description: 'Design system architecture, database schema, and API structure', duration: 4 },
      { title: 'Development environment setup', description: 'Configure development, staging, and production environments', duration: 2 },
      { title: 'Git repository and CI/CD pipeline setup', description: 'Set up version control, branch strategy, and automated deployments', duration: 3 },
      { title: 'Database design and modeling', description: 'Create database schema, relationships, and migration scripts', duration: 4 },

      // Authentication & User Management (Weeks 3-4)
      { title: 'User authentication system', description: 'Implement JWT-based authentication with refresh tokens', duration: 5 },
      { title: 'User registration and email verification', description: 'Build signup flow with email confirmation', duration: 4 },
      { title: 'Password reset functionality', description: 'Implement forgot password and reset password features', duration: 3 },
      { title: 'User profile management', description: 'Create user profile CRUD operations and UI', duration: 4 },
      { title: 'Role-based access control (RBAC)', description: 'Implement admin, customer, and vendor roles with permissions', duration: 5 },

      // Product Catalog (Weeks 5-8)
      { title: 'Product data model implementation', description: 'Create product schema with variants, pricing, and inventory', duration: 4 },
      { title: 'Product listing page', description: 'Build responsive product grid with filtering and sorting', duration: 5 },
      { title: 'Product detail page', description: 'Create detailed product view with image gallery and reviews', duration: 4 },
      { title: 'Product search functionality', description: 'Implement full-text search with Elasticsearch', duration: 6 },
      { title: 'Category management system', description: 'Build hierarchical category structure and navigation', duration: 4 },
      { title: 'Product reviews and ratings', description: 'Allow users to review and rate products', duration: 4 },

      // Shopping Cart & Checkout (Weeks 9-12)
      { title: 'Shopping cart implementation', description: 'Build cart with add/remove/update quantity features', duration: 5 },
      { title: 'Cart persistence and sync', description: 'Persist cart across sessions and devices', duration: 3 },
      { title: 'Checkout flow - shipping info', description: 'Collect and validate shipping address', duration: 3 },
      { title: 'Checkout flow - payment integration', description: 'Integrate Stripe payment gateway', duration: 6 },
      { title: 'Order confirmation and receipt', description: 'Generate order summary and email receipt', duration: 3 },

      // Admin Panel (Weeks 13-16)
      { title: 'Admin dashboard with analytics', description: 'Build admin dashboard with sales metrics and charts', duration: 5 },
      { title: 'Product management interface', description: 'Create admin UI for managing products and inventory', duration: 5 },
      { title: 'Order management system', description: 'Build order tracking and fulfillment system', duration: 5 },
      { title: 'Customer management tools', description: 'Admin tools for managing customer accounts', duration: 4 },

      // Testing & Optimization (Weeks 17-24)
      { title: 'Unit testing - backend services', description: 'Write comprehensive unit tests for all APIs', duration: 6 },
      { title: 'Integration testing - checkout flow', description: 'Test end-to-end checkout and payment process', duration: 5 },
      { title: 'Performance optimization', description: 'Optimize database queries, caching, and lazy loading', duration: 6 },
      { title: 'Security audit and fixes', description: 'Conduct security review and fix vulnerabilities', duration: 5 },
      { title: 'Final deployment and launch', description: 'Deploy to production and monitor for issues', duration: 4 },
    ]

    // Create Tasks for Project 2: Mobile App Redesign (25 tasks over 6 months)
    console.log('Creating tasks for Mobile App Redesign...')

    const project2Tasks = [
      // Research & Discovery (Weeks 1-2)
      { title: 'User research and interviews', description: 'Conduct interviews with 20+ users to understand pain points', duration: 5 },
      { title: 'Competitive analysis', description: 'Analyze competitor apps and identify best practices', duration: 3 },
      { title: 'User personas and journey maps', description: 'Create detailed user personas and journey maps', duration: 4 },

      // Design Phase (Weeks 3-8)
      { title: 'Information architecture', description: 'Redesign app navigation and information structure', duration: 4 },
      { title: 'Low-fidelity wireframes', description: 'Create wireframes for all major screens', duration: 5 },
      { title: 'Design system creation', description: 'Build comprehensive design system with components', duration: 6 },
      { title: 'High-fidelity mockups - onboarding', description: 'Design polished onboarding screens', duration: 4 },
      { title: 'High-fidelity mockups - home dashboard', description: 'Design main dashboard with widgets', duration: 5 },
      { title: 'High-fidelity mockups - profile screens', description: 'Design user profile and settings screens', duration: 4 },
      { title: 'Interactive prototype', description: 'Create clickable prototype in Figma', duration: 5 },
      { title: 'Usability testing with prototype', description: 'Test prototype with users and iterate', duration: 4 },

      // Development Phase (Weeks 9-20)
      { title: 'Setup React Native project', description: 'Initialize project with TypeScript and navigation', duration: 3 },
      { title: 'Implement design system components', description: 'Build reusable UI component library', duration: 6 },
      { title: 'Onboarding flow implementation', description: 'Build tutorial and signup screens', duration: 5 },
      { title: 'Home dashboard development', description: 'Implement dashboard with dynamic widgets', duration: 6 },
      { title: 'User profile and settings', description: 'Build profile management and app settings', duration: 5 },
      { title: 'Notifications system', description: 'Implement push notifications with Firebase', duration: 5 },
      { title: 'Offline mode support', description: 'Add offline data sync capabilities', duration: 6 },
      { title: 'Accessibility improvements', description: 'Ensure WCAG compliance and screen reader support', duration: 5 },
      { title: 'Dark mode implementation', description: 'Add dark mode theme with smooth transitions', duration: 4 },

      // Testing & Launch (Weeks 21-24)
      { title: 'Beta testing with users', description: 'Release beta to 100 users and collect feedback', duration: 6 },
      { title: 'Bug fixes and polish', description: 'Address all critical and high-priority bugs', duration: 5 },
      { title: 'App store optimization', description: 'Prepare screenshots, description, and keywords', duration: 3 },
      { title: 'Production deployment', description: 'Deploy to App Store and Google Play', duration: 4 },
      { title: 'Post-launch monitoring', description: 'Monitor crashes, performance, and user feedback', duration: 5 },
    ]

    const resources = [reactDev, nodeDev, uxDesigner, qaEngineer]

    // Create tasks for Project 1
    let currentDay = -7 // Start 1 week in the past
    const project1TaskObjects = []

    for (let i = 0; i < project1Tasks.length; i++) {
      const taskDef = project1Tasks[i]
      const startDate = addDays(today, currentDay)
      const endDate = addDays(today, currentDay + taskDef.duration)
      const status = getStatus(currentDay)

      const task = createTask({
        projectId: project1.id,
        title: taskDef.title,
        description: taskDef.description,
        status,
        color: colors[i % colors.length],
        startDate,
        endDate,
      })

      project1TaskObjects.push(task)

      // Assign 1-2 resources to each task
      const numResources = randomInt(1, 2)
      const selectedResources = new Set<typeof resources[number]>()

      while (selectedResources.size < numResources) {
        selectedResources.add(randomItem(resources))
      }

      selectedResources.forEach(resource => {
        assignResourceToTask(task.id, resource.id, randomInt(2, 5), resource.defaultVelocity)
      })

      currentDay += taskDef.duration
    }

    // Create tasks for Project 2
    currentDay = -7 // Reset for second project
    const project2TaskObjects = []

    for (let i = 0; i < project2Tasks.length; i++) {
      const taskDef = project2Tasks[i]
      const startDate = addDays(today, currentDay)
      const endDate = addDays(today, currentDay + taskDef.duration)
      const status = getStatus(currentDay)

      const task = createTask({
        projectId: project2.id,
        title: taskDef.title,
        description: taskDef.description,
        status,
        color: colors[i % colors.length],
        startDate,
        endDate,
      })

      project2TaskObjects.push(task)

      // Assign 1-2 resources to each task (favor UX designer for design tasks)
      const numResources = randomInt(1, 2)
      const selectedResources = new Set<typeof resources[number]>()

      // For design tasks, always include UX designer
      if (i < 11) { // Design phase tasks
        selectedResources.add(uxDesigner)
      }

      while (selectedResources.size < numResources) {
        selectedResources.add(randomItem(resources))
      }

      selectedResources.forEach(resource => {
        assignResourceToTask(task.id, resource.id, randomInt(2, 5), resource.defaultVelocity)
      })

      currentDay += taskDef.duration
    }

    // Add some task dependencies
    console.log('Adding task dependencies...')

    // Project 1 dependencies
    if (project1TaskObjects.length >= 5) {
      addTaskDependency(project1TaskObjects[5].id, project1TaskObjects[4].id) // Auth depends on DB
      addTaskDependency(project1TaskObjects[10].id, project1TaskObjects[5].id) // Product model depends on auth
      addTaskDependency(project1TaskObjects[16].id, project1TaskObjects[10].id) // Cart depends on products
      addTaskDependency(project1TaskObjects[19].id, project1TaskObjects[16].id) // Checkout depends on cart
    }

    // Project 2 dependencies
    if (project2TaskObjects.length >= 5) {
      addTaskDependency(project2TaskObjects[4].id, project2TaskObjects[2].id) // Wireframes depend on personas
      addTaskDependency(project2TaskObjects[10].id, project2TaskObjects[9].id) // Testing depends on prototype
      addTaskDependency(project2TaskObjects[13].id, project2TaskObjects[12].id) // Components depend on setup
    }

    console.log('✅ Database seeding completed successfully!')
    console.log(`Created:
  - 2 Projects
  - 4 Resources
  - 2 Configurations
  - ${project1Tasks.length} tasks for E-Commerce Platform
  - ${project2Tasks.length} tasks for Mobile App Redesign
  - Multiple resource assignments
  - Task dependencies
  - Tasks spanning 6 months from ${addDays(today, -7)} to ${addDays(today, currentDay)}`)
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}
