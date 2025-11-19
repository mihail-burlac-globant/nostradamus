import { describe, it, expect, beforeEach } from 'vitest'
import {
  initDatabase,
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  createResource,
  getResources,
  createConfiguration,
  getConfigurationByKey,
  assignConfigurationToProject,
  getProjectConfigurations,
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  assignResourceToProject,
  getProjectResources,
  assignResourceToTask,
  getTaskResources,
  addTaskDependency,
  getTaskDependencies,
} from '../database'

describe('Database Service', () => {
  beforeEach(async () => {
    // Initialize a fresh database before each test
    await initDatabase()
  })

  describe('Projects', () => {
    it('should create a project', () => {
      const project = createProject({
        title: 'Test Project',
        description: 'A test project',
        status: 'Active',
        startDate: '2025-01-01',
      })

      expect(project).toBeDefined()
      expect(project.id).toBeDefined()
      expect(project.title).toBe('Test Project')
      expect(project.status).toBe('Active')
    })

    it('should get all projects', () => {
      createProject({ title: 'Project 1', description: 'Desc 1', status: 'Active' })
      createProject({ title: 'Project 2', description: 'Desc 2', status: 'Active' })

      const projects = getProjects()
      expect(projects).toHaveLength(2)
      expect(projects[0].title).toBe('Project 1')
    })

    it('should update a project', () => {
      const project = createProject({
        title: 'Original Title',
        description: 'Original Description',
        status: 'Active',
      })

      const updated = updateProject(project.id, {
        title: 'Updated Title',
        description: 'Updated Description',
      })

      expect(updated).toBeDefined()
      expect(updated?.title).toBe('Updated Title')
      expect(updated?.description).toBe('Updated Description')
    })

    it('should delete a project', () => {
      const project = createProject({
        title: 'To Delete',
        description: 'Will be deleted',
        status: 'Active',
      })

      const result = deleteProject(project.id)
      expect(result).toBe(true)

      const projects = getProjects()
      expect(projects).toHaveLength(0)
    })

    it('should cascade delete project tasks', () => {
      const project = createProject({
        title: 'Project with Tasks',
        description: 'Has tasks',
        status: 'Active',
      })

      createTask({
        projectId: project.id,
        title: 'Task 1',
        description: 'Task description',
        status: 'Todo',
        progress: 0,
        color: '#000000',
      })

      deleteProject(project.id)

      const tasks = getTasks(project.id)
      expect(tasks).toHaveLength(0)
    })
  })

  describe('Resources', () => {
    it('should create a resource', () => {
      const resource = createResource({
        title: 'React Developer',
        description: 'Frontend developer',
        defaultVelocity: 85,
        icon: 'react',
        status: 'Active',
      })

      expect(resource).toBeDefined()
      expect(resource.title).toBe('React Developer')
      expect(resource.defaultVelocity).toBe(85)
    })

    it('should get all resources', () => {
      createResource({
        title: 'Resource 1',
        description: 'Desc 1',
        defaultVelocity: 80,
        icon: 'generic',
        status: 'Active',
      })
      createResource({
        title: 'Resource 2',
        description: 'Desc 2',
        defaultVelocity: 90,
        icon: 'generic',
        status: 'Active',
      })

      const resources = getResources()
      expect(resources).toHaveLength(2)
    })
  })

  describe('Configurations', () => {
    it('should create a configuration', () => {
      const config = createConfiguration({
        name: 'Test Config',
        key: 'test_config',
        value: JSON.stringify({ key: 'value' }),
        description: 'A test configuration',
      })

      expect(config).toBeDefined()
      expect(config.name).toBe('Test Config')
      expect(config.key).toBe('test_config')
    })

    it('should get configuration by key', () => {
      createConfiguration({
        name: 'Default Config',
        key: 'default_config',
        value: JSON.stringify({ sprintDuration: 14 }),
        description: 'Default',
      })

      const config = getConfigurationByKey('default_config')
      expect(config).toBeDefined()
      expect(config?.key).toBe('default_config')
    })

    it('should return null for non-existent config key', () => {
      const config = getConfigurationByKey('non_existent')
      expect(config).toBeNull()
    })

    it('should assign configuration to project', () => {
      const project = createProject({
        title: 'Project',
        description: 'Test',
        status: 'Active',
      })

      const config = createConfiguration({
        name: 'Config',
        key: 'test_config',
        value: '{}',
      })

      assignConfigurationToProject(project.id, config.id)
      const projectConfigs = getProjectConfigurations(project.id)

      expect(projectConfigs).toHaveLength(1)
      expect(projectConfigs[0].id).toBe(config.id)
    })

    it('should enforce one configuration per project', () => {
      const project = createProject({
        title: 'Project',
        description: 'Test',
        status: 'Active',
      })

      const config1 = createConfiguration({
        name: 'Config 1',
        key: 'config1',
        value: '{}',
      })

      const config2 = createConfiguration({
        name: 'Config 2',
        key: 'config2',
        value: '{}',
      })

      assignConfigurationToProject(project.id, config1.id)
      assignConfigurationToProject(project.id, config2.id)

      const projectConfigs = getProjectConfigurations(project.id)
      expect(projectConfigs).toHaveLength(1)
      expect(projectConfigs[0].id).toBe(config2.id)
    })
  })

  describe('Tasks', () => {
    it('should create a task', () => {
      const project = createProject({
        title: 'Project',
        description: 'Test',
        status: 'Active',
      })

      const task = createTask({
        projectId: project.id,
        title: 'Test Task',
        description: 'Task description',
        status: 'Todo',
        progress: 0,
        color: '#ff0000',
      })

      expect(task).toBeDefined()
      expect(task.title).toBe('Test Task')
      expect(task.progress).toBe(0)
    })

    it('should update task progress', () => {
      const project = createProject({
        title: 'Project',
        description: 'Test',
        status: 'Active',
      })

      const task = createTask({
        projectId: project.id,
        title: 'Task',
        description: 'Desc',
        status: 'In Progress',
        progress: 0,
        color: '#000000',
      })

      const updated = updateTask(task.id, { progress: 50 })
      expect(updated?.progress).toBe(50)
    })

    it('should delete a task', () => {
      const project = createProject({
        title: 'Project',
        description: 'Test',
        status: 'Active',
      })

      const task = createTask({
        projectId: project.id,
        title: 'Task to Delete',
        description: 'Desc',
        status: 'Todo',
        progress: 0,
        color: '#000000',
      })

      const result = deleteTask(task.id)
      expect(result).toBe(true)

      const tasks = getTasks(project.id)
      expect(tasks).toHaveLength(0)
    })
  })

  describe('Resource Assignments', () => {
    it('should assign resource to project', () => {
      const project = createProject({
        title: 'Project',
        description: 'Test',
        status: 'Active',
      })

      const resource = createResource({
        title: 'Developer',
        description: 'Dev',
        defaultVelocity: 80,
        icon: 'generic',
        status: 'Active',
      })

      assignResourceToProject(project.id, resource.id, 2, 85)
      const projectResources = getProjectResources(project.id)

      expect(projectResources).toHaveLength(1)
      expect(projectResources[0].numberOfResources).toBe(2)
      expect(projectResources[0].focusFactor).toBe(85)
    })

    it('should assign resource to task', () => {
      const project = createProject({
        title: 'Project',
        description: 'Test',
        status: 'Active',
      })

      const task = createTask({
        projectId: project.id,
        title: 'Task',
        description: 'Desc',
        status: 'Todo',
        progress: 0,
        color: '#000000',
      })

      const resource = createResource({
        title: 'Developer',
        description: 'Dev',
        defaultVelocity: 80,
        icon: 'generic',
        status: 'Active',
      })

      assignResourceToTask(task.id, resource.id, 5, 80)
      const taskResources = getTaskResources(task.id)

      expect(taskResources).toHaveLength(1)
      expect(taskResources[0].estimatedDays).toBe(5)
      expect(taskResources[0].focusFactor).toBe(80)
    })
  })

  describe('Task Dependencies', () => {
    it('should add task dependency', () => {
      const project = createProject({
        title: 'Project',
        description: 'Test',
        status: 'Active',
      })

      const task1 = createTask({
        projectId: project.id,
        title: 'Task 1',
        description: 'First task',
        status: 'Done',
        progress: 100,
        color: '#000000',
      })

      const task2 = createTask({
        projectId: project.id,
        title: 'Task 2',
        description: 'Second task',
        status: 'Todo',
        progress: 0,
        color: '#000000',
      })

      addTaskDependency(task2.id, task1.id)
      const dependencies = getTaskDependencies(task2.id)

      expect(dependencies).toHaveLength(1)
      expect(dependencies[0].id).toBe(task1.id)
    })

    it('should handle multiple dependencies', () => {
      const project = createProject({
        title: 'Project',
        description: 'Test',
        status: 'Active',
      })

      const task1 = createTask({
        projectId: project.id,
        title: 'Task 1',
        description: 'Desc',
        status: 'Done',
        progress: 100,
        color: '#000000',
      })

      const task2 = createTask({
        projectId: project.id,
        title: 'Task 2',
        description: 'Desc',
        status: 'Done',
        progress: 100,
        color: '#000000',
      })

      const task3 = createTask({
        projectId: project.id,
        title: 'Task 3',
        description: 'Desc',
        status: 'Todo',
        progress: 0,
        color: '#000000',
      })

      addTaskDependency(task3.id, task1.id)
      addTaskDependency(task3.id, task2.id)
      const dependencies = getTaskDependencies(task3.id)

      expect(dependencies).toHaveLength(2)
    })
  })
})
