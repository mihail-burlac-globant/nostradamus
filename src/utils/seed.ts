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

export const seedDatabase = (): void => {
  console.log('🌱 Starting database seeding...')

  try {
    // Create Projects
    console.log('Creating projects...')
    const project1 = createProject({
      title: 'E-Commerce Platform',
      description: 'Building a modern e-commerce platform with React and Node.js',
      status: 'Active',
    })

    const project2 = createProject({
      title: 'Mobile App Redesign',
      description: 'Redesigning the mobile application for better UX',
      status: 'Active',
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
      name: 'Sprint 1 - MVP',
      description: 'First sprint focusing on MVP features',
      estimatedDays: 14,
      startDate: '2025-01-20',
      endDate: '2025-02-03',
    })

    const config2 = createConfiguration({
      name: 'Sprint 2 - Refinement',
      description: 'Second sprint for feature refinement',
      estimatedDays: 14,
      startDate: '2025-02-03',
      endDate: '2025-02-17',
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

    // Create Tasks for Project 1
    console.log('Creating tasks...')
    const task1 = createTask({
      projectId: project1.id,
      title: 'Setup project structure',
      description: 'Initialize React and Node.js project structure',
      status: 'Done',
      color: '#10b981',
    })

    const task2 = createTask({
      projectId: project1.id,
      title: 'Design database schema',
      description: 'Create database schema for e-commerce platform',
      status: 'Done',
      color: '#3b82f6',
    })

    const task3 = createTask({
      projectId: project1.id,
      title: 'Implement authentication',
      description: 'Add user authentication and authorization',
      status: 'In Progress',
      color: '#f59e0b',
    })

    const task4 = createTask({
      projectId: project1.id,
      title: 'Build product catalog',
      description: 'Create product listing and detail pages',
      status: 'Todo',
      color: '#8b5cf6',
    })

    const task5 = createTask({
      projectId: project1.id,
      title: 'Implement shopping cart',
      description: 'Add shopping cart functionality',
      status: 'Todo',
      color: '#ec4899',
    })

    // Create Tasks for Project 2
    const task6 = createTask({
      projectId: project2.id,
      title: 'User research',
      description: 'Conduct user interviews and surveys',
      status: 'Done',
      color: '#14b8a6',
    })

    const task7 = createTask({
      projectId: project2.id,
      title: 'Create wireframes',
      description: 'Design wireframes for new mobile app',
      status: 'In Progress',
      color: '#f97316',
    })

    const task8 = createTask({
      projectId: project2.id,
      title: 'Develop UI components',
      description: 'Build reusable UI components',
      status: 'Todo',
      color: '#6366f1',
    })

    // Assign Resources to Tasks
    console.log('Assigning resources to tasks...')
    assignResourceToTask(task1.id, reactDev.id, 2, 85)
    assignResourceToTask(task1.id, nodeDev.id, 2, 80)

    assignResourceToTask(task2.id, nodeDev.id, 3, 80)

    assignResourceToTask(task3.id, nodeDev.id, 5, 80)
    assignResourceToTask(task3.id, reactDev.id, 3, 85)

    assignResourceToTask(task4.id, reactDev.id, 5, 85)

    assignResourceToTask(task5.id, reactDev.id, 4, 85)
    assignResourceToTask(task5.id, qaEngineer.id, 2, 90)

    assignResourceToTask(task6.id, uxDesigner.id, 3, 75)

    assignResourceToTask(task7.id, uxDesigner.id, 5, 75)

    assignResourceToTask(task8.id, reactDev.id, 8, 85)
    assignResourceToTask(task8.id, uxDesigner.id, 2, 75)

    // Add Task Dependencies
    console.log('Adding task dependencies...')
    addTaskDependency(task3.id, task1.id) // Auth depends on setup
    addTaskDependency(task3.id, task2.id) // Auth depends on database
    addTaskDependency(task4.id, task3.id) // Product catalog depends on auth
    addTaskDependency(task5.id, task4.id) // Shopping cart depends on product catalog

    addTaskDependency(task7.id, task6.id) // Wireframes depend on user research
    addTaskDependency(task8.id, task7.id) // UI components depend on wireframes

    console.log('✅ Database seeding completed successfully!')
    console.log(`Created:
  - 2 Projects
  - 4 Resources
  - 2 Configurations
  - 8 Tasks
  - Multiple resource assignments
  - Task dependencies`)
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}
