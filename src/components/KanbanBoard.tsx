import type { Task, Resource, TaskStatus } from '../types/entities.types'
import { getIconById } from '../utils/resourceIcons'

interface TaskWithResources extends Task {
  resources: (Resource & { estimatedDays: number; focusFactor: number })[]
}

interface KanbanBoardProps {
  tasks: TaskWithResources[]
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onResourcesClick: (task: Task) => void
  onDependenciesClick: (task: Task) => void
  getTaskDependencies: (taskId: string) => Task[]
  canTaskBeStarted: (taskId: string) => boolean
  calculateTotalEstimate: (resources: (Resource & { estimatedDays: number; focusFactor: number })[]) => number
}

const KanbanBoard = ({
  tasks,
  onEditTask,
  onDeleteTask,
  onResourcesClick,
  onDependenciesClick,
  getTaskDependencies,
  canTaskBeStarted,
  calculateTotalEstimate,
}: KanbanBoardProps) => {
  // Group tasks by status
  const tasksByStatus: Record<TaskStatus, TaskWithResources[]> = {
    'Todo': tasks.filter(task => task.status === 'Todo'),
    'In Progress': tasks.filter(task => task.status === 'In Progress'),
    'Done': tasks.filter(task => task.status === 'Done'),
  }

  const columns: { status: TaskStatus; title: string; color: string }[] = [
    { status: 'Todo', title: 'To Do', color: 'bg-gray-100 dark:bg-gray-800' },
    { status: 'In Progress', title: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900' },
    { status: 'Done', title: 'Done', color: 'bg-green-100 dark:bg-green-900' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map(({ status, title, color }) => (
        <div key={status} className="flex flex-col">
          {/* Column Header */}
          <div className={`${color} rounded-t-lg p-4 border-b-4 border-${status === 'Todo' ? 'gray' : status === 'In Progress' ? 'blue' : 'green'}-400`}>
            <h3 className="text-lg font-bold text-navy-800 dark:text-navy-100 flex items-center justify-between">
              <span>{title}</span>
              <span className="text-sm font-normal bg-white dark:bg-navy-700 px-2 py-1 rounded-full">
                {tasksByStatus[status].length}
              </span>
            </h3>
          </div>

          {/* Column Cards */}
          <div className="flex-1 bg-navy-50 dark:bg-navy-900 rounded-b-lg p-4 space-y-3 min-h-[600px]">
            {tasksByStatus[status].length === 0 ? (
              <div className="text-center py-8 text-navy-400 dark:text-navy-500 text-sm">
                No tasks
              </div>
            ) : (
              tasksByStatus[status].map((task) => {
                const totalEstimate = calculateTotalEstimate(task.resources)
                const dependencies = getTaskDependencies(task.id)
                const canStart = canTaskBeStarted(task.id)

                return (
                  <div
                    key={task.id}
                    className="bg-white dark:bg-navy-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-4 border-l-4"
                    style={{ borderLeftColor: task.color || '#6366f1' }}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: task.color || '#6366f1' }}
                          title="Task color"
                        />
                        <h4 className="font-semibold text-navy-800 dark:text-navy-100 text-sm line-clamp-2">
                          {task.title}
                        </h4>
                      </div>
                    </div>

                    {/* Warnings */}
                    <div className="mb-2 space-y-1">
                      {task.resources.length === 0 && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                          <span>⚠️</span>
                          <span>No resources assigned</span>
                        </div>
                      )}
                      {!canStart && (
                        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-500">
                          <span>🚫</span>
                          <span>Blocked by dependencies</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {task.description && (
                      <p className="text-xs text-navy-600 dark:text-navy-400 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-navy-600 dark:text-navy-400">Progress</span>
                        <span className="text-xs font-semibold text-navy-800 dark:text-navy-200">
                          {task.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-navy-200 dark:bg-navy-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${task.progress}%`,
                            background: `linear-gradient(90deg, ${task.color || '#6366f1'}, ${task.color || '#6366f1'}dd)`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Resources Summary */}
                    {task.resources.length > 0 && (
                      <div className="mb-3 p-2 bg-navy-50 dark:bg-navy-900 rounded-md">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-navy-700 dark:text-navy-300">
                            Resources
                          </span>
                          <span className="text-xs text-navy-600 dark:text-navy-400">
                            {totalEstimate.toFixed(1)}d
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {task.resources.slice(0, 3).map((resource) => (
                            <div
                              key={resource.id}
                              className="flex items-center gap-1 bg-white dark:bg-navy-800 px-2 py-1 rounded text-xs"
                            >
                              <span className="text-base">{getIconById(resource.iconId)}</span>
                              <span className="text-navy-700 dark:text-navy-300 truncate max-w-[80px]">
                                {resource.title}
                              </span>
                            </div>
                          ))}
                          {task.resources.length > 3 && (
                            <div className="flex items-center justify-center bg-navy-200 dark:bg-navy-700 px-2 py-1 rounded text-xs text-navy-600 dark:text-navy-400">
                              +{task.resources.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Dependencies Summary */}
                    {dependencies.length > 0 && (
                      <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Depends on {dependencies.length} task{dependencies.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dependencies.slice(0, 2).map((dep) => (
                            <div
                              key={dep.id}
                              className="text-xs bg-white dark:bg-navy-800 px-2 py-1 rounded truncate max-w-[120px]"
                              title={dep.title}
                            >
                              <span
                                className={`inline-block w-2 h-2 rounded-full mr-1 ${
                                  dep.status === 'Done'
                                    ? 'bg-green-500'
                                    : dep.status === 'In Progress'
                                    ? 'bg-blue-500'
                                    : 'bg-gray-400'
                                }`}
                              />
                              {dep.title}
                            </div>
                          ))}
                          {dependencies.length > 2 && (
                            <div className="text-xs text-amber-600 dark:text-amber-500">
                              +{dependencies.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-navy-100 dark:border-navy-700">
                      <button
                        onClick={() => onResourcesClick(task)}
                        className="flex-1 text-xs px-2 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        title="Manage Resources"
                      >
                        👥
                      </button>
                      <button
                        onClick={() => onDependenciesClick(task)}
                        className="flex-1 text-xs px-2 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                        title="Manage Dependencies"
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => onEditTask(task)}
                        className="flex-1 text-xs px-2 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                        title="Edit Task"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDeleteTask(task)}
                        className="flex-1 text-xs px-2 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        title="Delete Task"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default KanbanBoard
