import {
  createProject,
  createResource,
  createConfiguration,
  createTask,
  assignResourceToProject,
  assignConfigurationToProject,
  assignResourceToTask,
  addTaskDependency,
  createMilestone,
  createProgressSnapshot,
  getTaskResources,
} from '../services/database'
import type { Task } from '../types/entities.types'

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

    // Frontend Developers
    const reactDev = createResource({
      title: 'React Developer',
      description: 'Frontend developer specializing in React and modern JavaScript',
      defaultVelocity: 85,
      icon: 'react',
      status: 'Active',
    })

    const vueDev = createResource({
      title: 'Vue.js Developer',
      description: 'Frontend developer with Vue.js expertise',
      defaultVelocity: 83,
      icon: 'vue',
      status: 'Active',
    })

    const angularDev = createResource({
      title: 'Angular Developer',
      description: 'Frontend developer specializing in Angular framework',
      defaultVelocity: 82,
      icon: 'angular',
      status: 'Active',
    })

    // Backend Developers
    const nodeDev = createResource({
      title: 'Node.js Developer',
      description: 'Backend developer specializing in Node.js and Express',
      defaultVelocity: 80,
      icon: 'nodejs',
      status: 'Active',
    })

    const pythonDev = createResource({
      title: 'Python Developer',
      description: 'Backend developer with Python, Django, and FastAPI experience',
      defaultVelocity: 81,
      icon: 'python',
      status: 'Active',
    })

    const javaDev = createResource({
      title: 'Java Developer',
      description: 'Enterprise Java developer with Spring Boot expertise',
      defaultVelocity: 78,
      icon: 'java',
      status: 'Active',
    })

    const phpDev = createResource({
      title: 'PHP Developer',
      description: 'Backend developer specializing in PHP and Laravel',
      defaultVelocity: 79,
      icon: 'php',
      status: 'Active',
    })

    // Mobile Developers
    const iosDev = createResource({
      title: 'iOS Developer',
      description: 'Mobile developer specializing in Swift and iOS applications',
      defaultVelocity: 84,
      icon: 'ios',
      status: 'Active',
    })

    const androidDev = createResource({
      title: 'Android Developer',
      description: 'Mobile developer with Kotlin and Android SDK experience',
      defaultVelocity: 83,
      icon: 'android',
      status: 'Active',
    })

    // Full Stack Developer
    const fullStackDev = createResource({
      title: 'Full Stack Developer',
      description: 'Full stack developer with both frontend and backend expertise',
      defaultVelocity: 82,
      icon: 'generic',
      status: 'Active',
    })

    // Infrastructure & DevOps
    const devOpsEngineer = createResource({
      title: 'DevOps Engineer',
      description: 'Infrastructure specialist with CI/CD and cloud expertise',
      defaultVelocity: 86,
      icon: 'devops',
      status: 'Active',
    })

    const dbaEngineer = createResource({
      title: 'Database Administrator',
      description: 'Database specialist with SQL, NoSQL, and optimization skills',
      defaultVelocity: 85,
      icon: 'database',
      status: 'Active',
    })

    // Design
    const uxDesigner = createResource({
      title: 'UX Designer',
      description: 'User experience designer with research and prototyping skills',
      defaultVelocity: 75,
      icon: 'design',
      status: 'Active',
    })

    const uiDesigner = createResource({
      title: 'UI Designer',
      description: 'Visual designer specializing in user interfaces and design systems',
      defaultVelocity: 76,
      icon: 'design',
      status: 'Active',
    })

    // Quality & Testing
    const qaEngineer = createResource({
      title: 'QA Engineer',
      description: 'Quality assurance specialist with automated testing expertise',
      defaultVelocity: 90,
      icon: 'testing',
      status: 'Active',
    })

    // Management & Analysis
    const productManager = createResource({
      title: 'Product Manager',
      description: 'Product management with roadmap planning and stakeholder coordination',
      defaultVelocity: 88,
      icon: 'generic',
      status: 'Active',
    })

    const scrumMaster = createResource({
      title: 'Scrum Master',
      description: 'Agile facilitator and team coach',
      defaultVelocity: 92,
      icon: 'generic',
      status: 'Active',
    })

    const businessAnalyst = createResource({
      title: 'Business Analyst',
      description: 'Requirements gathering and business process analysis',
      defaultVelocity: 87,
      icon: 'generic',
      status: 'Active',
    })

    // Specialized Roles
    const securityEngineer = createResource({
      title: 'Security Engineer',
      description: 'Cybersecurity specialist with penetration testing and security audits',
      defaultVelocity: 82,
      icon: 'security',
      status: 'Active',
    })

    const dataEngineer = createResource({
      title: 'Data Engineer',
      description: 'Big data and data pipeline specialist',
      defaultVelocity: 81,
      icon: 'database',
      status: 'Active',
    })

    // Create Configurations
    console.log('Creating configurations...')
    const defaultConfig = createConfiguration({
      name: 'Default Configuration',
      key: 'default_config',
      value: JSON.stringify({
        sprintDuration: 14,
        velocityTarget: 80,
        methodology: 'Agile',
      }),
      description: 'Default configuration for new projects',
    })

    const scrumConfig = createConfiguration({
      name: 'Scrum - 2 Week Sprints',
      key: 'scrum_2week',
      value: JSON.stringify({
        sprintDuration: 14,
        velocityTarget: 85,
        methodology: 'Scrum',
      }),
      description: 'Standard Scrum methodology with 2-week sprints, daily standups, and sprint retrospectives',
    })

    const scrumConfig1Week = createConfiguration({
      name: 'Scrum - 1 Week Sprints',
      key: 'scrum_1week',
      value: JSON.stringify({
        sprintDuration: 7,
        velocityTarget: 88,
        methodology: 'Scrum',
      }),
      description: 'Fast-paced Scrum with 1-week sprints for rapid iteration',
    })

    const kanbanConfig = createConfiguration({
      name: 'Kanban - Continuous Flow',
      key: 'kanban_continuous',
      value: JSON.stringify({
        sprintDuration: 7,
        velocityTarget: 90,
        methodology: 'Kanban',
      }),
      description: 'Continuous flow methodology with WIP limits and pull-based system',
    })

    const waterfallConfig = createConfiguration({
      name: 'Waterfall - Traditional',
      key: 'waterfall_traditional',
      value: JSON.stringify({
        sprintDuration: 30,
        velocityTarget: 75,
        methodology: 'Waterfall',
      }),
      description: 'Traditional sequential development with distinct phases: requirements, design, implementation, testing, deployment',
    })

    const vModelConfig = createConfiguration({
      name: 'V-Model - Verification & Validation',
      key: 'vmodel_testing',
      value: JSON.stringify({
        sprintDuration: 21,
        velocityTarget: 78,
        methodology: 'V-Model',
      }),
      description: 'V-Model methodology emphasizing testing at each development phase with parallel verification and validation',
    })

    const safeConfig = createConfiguration({
      name: 'SAFe - Scaled Agile',
      key: 'safe_scaled',
      value: JSON.stringify({
        sprintDuration: 14,
        velocityTarget: 82,
        methodology: 'SAFe',
      }),
      description: 'Scaled Agile Framework for large enterprise projects with program increments and release trains',
    })

    const xpConfig = createConfiguration({
      name: 'XP - Extreme Programming',
      key: 'xp_programming',
      value: JSON.stringify({
        sprintDuration: 7,
        velocityTarget: 92,
        methodology: 'XP',
      }),
      description: 'Extreme Programming with pair programming, TDD, continuous integration, and frequent releases',
    })

    const leanConfig = createConfiguration({
      name: 'Lean - Minimize Waste',
      key: 'lean_development',
      value: JSON.stringify({
        sprintDuration: 10,
        velocityTarget: 87,
        methodology: 'Lean',
      }),
      description: 'Lean software development focusing on eliminating waste, fast delivery, and continuous improvement',
    })

    const designSprintConfig = createConfiguration({
      name: 'Design Sprint - 5 Days',
      key: 'design_sprint_5day',
      value: JSON.stringify({
        sprintDuration: 5,
        velocityTarget: 75,
        methodology: 'Design Sprint',
      }),
      description: 'Google Ventures Design Sprint for rapid prototyping and validation in 5 days',
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
    assignConfigurationToProject(project1.id, scrumConfig.id)
    assignConfigurationToProject(project2.id, designSprintConfig.id)

    // Log all created configurations
    console.log('All configurations created:')
    console.log(`  - ${defaultConfig.name}`)
    console.log(`  - ${scrumConfig.name}`)
    console.log(`  - ${scrumConfig1Week.name}`)
    console.log(`  - ${kanbanConfig.name}`)
    console.log(`  - ${waterfallConfig.name}`)
    console.log(`  - ${vModelConfig.name}`)
    console.log(`  - ${safeConfig.name}`)
    console.log(`  - ${xpConfig.name}`)
    console.log(`  - ${leanConfig.name}`)
    console.log(`  - ${designSprintConfig.name}`)

    // Task colors
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

    // Task statuses with realistic distribution
    const getStatus = (dayOffset: number): 'Done' | 'In Progress' | 'Todo' => {
      if (dayOffset < -7) return 'Done'
      if (dayOffset < 7) return 'In Progress'
      return 'Todo'
    }

    // Task progress based on status
    const getProgress = (status: 'Done' | 'In Progress' | 'Todo'): number => {
      if (status === 'Done') return 100
      if (status === 'In Progress') return randomInt(20, 80)
      return 0
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

    const resources = [
      reactDev, vueDev, angularDev,
      nodeDev, pythonDev, javaDev, phpDev,
      iosDev, androidDev, fullStackDev,
      devOpsEngineer, dbaEngineer,
      uxDesigner, uiDesigner, qaEngineer,
      productManager, scrumMaster, businessAnalyst,
      securityEngineer, dataEngineer
    ]

    // Create tasks for Project 1
    // Note: Start and end dates are no longer set explicitly - they will be calculated
    // based on project start date, dependencies, and resource estimates
    let currentDay = -7 // Start 1 week in the past (for status calculation only)
    const project1TaskObjects = []

    for (let i = 0; i < project1Tasks.length; i++) {
      const taskDef = project1Tasks[i]
      const status = getStatus(currentDay)
      const progress = getProgress(status)

      const task = createTask({
        projectId: project1.id,
        title: taskDef.title,
        description: taskDef.description,
        status,
        progress,
        color: colors[i % colors.length],
        // No startDate or endDate - calculated dynamically from project start + dependencies + estimates
      })

      project1TaskObjects.push(task)

      // Assign 1-2 resources to each task
      const numResources = randomInt(1, 2)
      const selectedResources = new Set<typeof resources[number]>()

      while (selectedResources.size < numResources) {
        selectedResources.add(randomItem(resources))
      }

      selectedResources.forEach(resource => {
        // Randomly assign 1-2 profiles for each resource
        const numberOfProfiles = randomInt(1, 3) // 1 or 2 profiles
        assignResourceToTask(task.id, resource.id, randomInt(2, 5), resource.defaultVelocity, numberOfProfiles)
      })

      currentDay += taskDef.duration
    }

    // Create tasks for Project 2
    // Note: Start and end dates are no longer set explicitly - they will be calculated
    // based on project start date, dependencies, and resource estimates
    currentDay = -7 // Reset for second project (for status calculation only)
    const project2TaskObjects = []

    for (let i = 0; i < project2Tasks.length; i++) {
      const taskDef = project2Tasks[i]
      const status = getStatus(currentDay)
      const progress = getProgress(status)

      const task = createTask({
        projectId: project2.id,
        title: taskDef.title,
        description: taskDef.description,
        status,
        progress,
        color: colors[i % colors.length],
        // No startDate or endDate - calculated dynamically from project start + dependencies + estimates
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
        // Randomly assign 1-2 profiles for each resource
        const numberOfProfiles = randomInt(1, 3) // 1 or 2 profiles
        assignResourceToTask(task.id, resource.id, randomInt(2, 5), resource.defaultVelocity, numberOfProfiles)
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

    // Create Milestones for Project 1: E-Commerce Platform
    console.log('Creating milestones for E-Commerce Platform...')
    createMilestone({
      projectId: project1.id,
      title: 'Architecture Complete',
      date: addDays(today, 12), // End of Planning & Setup Phase
      icon: 'flag',
      color: '#3b82f6', // Blue
    })
    createMilestone({
      projectId: project1.id,
      title: 'Auth System Live',
      date: addDays(today, 26), // End of Authentication Phase
      icon: 'star',
      color: '#10b981', // Green
    })
    createMilestone({
      projectId: project1.id,
      title: 'Product Catalog Ready',
      date: addDays(today, 49), // End of Product Catalog Phase
      icon: 'rocket',
      color: '#8b5cf6', // Purple
    })
    createMilestone({
      projectId: project1.id,
      title: 'Checkout Flow Complete',
      date: addDays(today, 70), // End of Shopping Cart & Checkout Phase
      icon: 'target',
      color: '#f59e0b', // Amber
    })
    createMilestone({
      projectId: project1.id,
      title: 'Admin Panel Ready',
      date: addDays(today, 90), // End of Admin Panel Phase
      icon: 'flag',
      color: '#ec4899', // Pink
    })
    createMilestone({
      projectId: project1.id,
      title: 'Production Launch',
      date: addDays(today, 120), // Final Launch
      icon: 'rocket',
      color: '#ef4444', // Red
    })

    // Create Milestones for Project 2: Mobile App Redesign
    console.log('Creating milestones for Mobile App Redesign...')
    createMilestone({
      projectId: project2.id,
      title: 'Research Complete',
      date: addDays(today, 12), // End of Research & Discovery
      icon: 'flag',
      color: '#3b82f6', // Blue
    })
    createMilestone({
      projectId: project2.id,
      title: 'Design System Ready',
      date: addDays(today, 30), // After Design System
      icon: 'star',
      color: '#8b5cf6', // Purple
    })
    createMilestone({
      projectId: project2.id,
      title: 'Prototype Validated',
      date: addDays(today, 48), // After Usability Testing
      icon: 'target',
      color: '#10b981', // Green
    })
    createMilestone({
      projectId: project2.id,
      title: 'Beta Release',
      date: addDays(today, 100), // Before Beta Testing
      icon: 'rocket',
      color: '#f59e0b', // Amber
    })
    createMilestone({
      projectId: project2.id,
      title: 'App Store Launch',
      date: addDays(today, 125), // Final Launch
      icon: 'rocket',
      color: '#ef4444', // Red
    })

    // Create Progress Snapshots for realistic velocity tracking
    console.log('Creating progress snapshots...')
    let snapshotCount = 0

    // Helper to create snapshots for a task over the past 7 days
    const createTaskSnapshots = (task: Task, initialRemaining: number) => {
      if (task.status === 'Todo') return // Skip Todo tasks

      const daysToTrack = task.status === 'Done' ? 7 : 5 // Track more days for completed tasks

      for (let dayOffset = -daysToTrack; dayOffset <= 0; dayOffset++) {
        const snapshotDate = addDays(today, dayOffset)

        // Calculate remaining estimate with realistic decrease
        let remaining: number
        if (task.status === 'Done') {
          // Task is done, so remaining should decrease to 0
          const progressFactor = (dayOffset + daysToTrack) / daysToTrack
          remaining = Math.max(0, initialRemaining * (1 - progressFactor))
        } else {
          // Task is in progress, show gradual decrease
          const progressFactor = (dayOffset + daysToTrack) / daysToTrack
          remaining = initialRemaining * (1 - (progressFactor * 0.6)) // 60% done over the tracked period
        }

        // Calculate progress percentage based on remaining
        const progressPercent = Math.round((1 - remaining / initialRemaining) * 100)

        createProgressSnapshot({
          taskId: task.id,
          projectId: task.projectId,
          date: snapshotDate,
          remainingEstimate: Number(remaining.toFixed(2)),
          status: task.status,
          progress: Math.min(progressPercent, task.progress), // Don't exceed current progress
          notes: dayOffset === 0 ? undefined : dayOffset === -daysToTrack ? 'Initial estimate' : undefined,
        })
        snapshotCount++
      }
    }

    // Create snapshots for Project 1 tasks
    project1TaskObjects.forEach(task => {
      if (task.status !== 'Todo') {
        // Calculate initial remaining based on task resources
        const resources = getTaskResources(task.id)
        const totalEstimate = resources.reduce((sum, resource) => {
          return sum + (resource.estimatedDays * (resource.focusFactor / 100))
        }, 0)

        if (totalEstimate > 0) {
          createTaskSnapshots(task, totalEstimate)
        }
      }
    })

    // Create snapshots for Project 2 tasks
    project2TaskObjects.forEach(task => {
      if (task.status !== 'Todo') {
        // Calculate initial remaining based on task resources
        const resources = getTaskResources(task.id)
        const totalEstimate = resources.reduce((sum, resource) => {
          return sum + (resource.estimatedDays * (resource.focusFactor / 100))
        }, 0)

        if (totalEstimate > 0) {
          createTaskSnapshots(task, totalEstimate)
        }
      }
    })

    console.log('✅ Database seeding completed successfully!')
    console.log(`Created:
  - 2 Projects
  - 20 Resources (Frontend: 3, Backend: 4, Mobile: 2, Full Stack: 1, Infrastructure: 2, Design: 2, QA: 1, Management: 3, Specialized: 2)
  - 10 Configurations (Default, Scrum 2-week, Scrum 1-week, Kanban, Waterfall, V-Model, SAFe, XP, Lean, Design Sprint)
  - ${project1Tasks.length} tasks for E-Commerce Platform
  - ${project2Tasks.length} tasks for Mobile App Redesign
  - 6 milestones for E-Commerce Platform
  - 5 milestones for Mobile App Redesign
  - ${snapshotCount} progress snapshots for velocity tracking
  - Multiple resource assignments
  - Task dependencies
  - Tasks spanning 6 months from ${addDays(today, -7)} to ${addDays(today, currentDay)}`)
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}
