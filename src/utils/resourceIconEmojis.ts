// Centralized mapping of resource icon IDs to emoji representations
// This mapping should be used consistently across all components

export const RESOURCE_ICON_EMOJIS: Record<string, string> = {
  'react': '⚛️',
  'vue': '🅥',
  'angular': '🅰️',
  'nodejs': '🟢',
  'python': '🐍',
  'java': '☕',
  'php': '🐘',
  'dotnet': '⚙️',
  'ios': '🍎',
  'android': '🤖',
  'database': '🗄️',
  'cloud': '☁️',
  'server': '🖥️',
  'docker': '🐳',
  'git': '📦',
  'kubernetes': '☸️',
  'typescript': '📘',
  'javascript': '📜',
  'design': '🎨',
  'testing': '✅',
  'project-manager': '📊',
  'product-owner': '💡',
  'architect': '🏗️',
  'ai': '🤖',
  'generic': '📋'
}

export const getResourceIconEmoji = (iconId: string): string => {
  return RESOURCE_ICON_EMOJIS[iconId] || RESOURCE_ICON_EMOJIS['generic']
}
