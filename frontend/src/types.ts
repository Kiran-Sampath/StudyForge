export type TopicStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type PathIcon = 'coffee' | 'code' | 'database' | 'network' | 'terminal' | 'layers'

export interface TopicPreview {
  id: string
  title: string
  status: TopicStatus
}

// Preview-only data. API response types will be introduced with integration.
export interface LearningPath {
  id: string
  title: string
  description: string
  icon: PathIcon
  color: 'sage' | 'sand' | 'lavender' | 'blue' | 'rose' | 'gray'
  topics: TopicPreview[]
  createdAt: number
}

export type PathInput = Pick<LearningPath, 'title' | 'description'>

export function pathProgress(path: LearningPath) {
  const completed = path.topics.filter(topic => topic.status === 'COMPLETED').length
  const total = path.topics.length
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 }
}

export function pathStatus(path: LearningPath) {
  const { completed, total } = pathProgress(path)
  if (total > 0 && completed === total) return 'completed'
  if (path.topics.some(topic => topic.status !== 'NOT_STARTED')) return 'active'
  return 'not-started'
}
