export type TopicStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export type NoteFormat = 'markdown' | 'plain'
export type ConfidenceLevel = 'STILL_LEARNING' | 'NEED_MORE_PRACTICE' | 'CONFIDENT'
export interface NoteLink { label: string; url: string }
export interface NoteImage { id: number; note_id: number; filename: string; content_type: 'image/jpeg' | 'image/png' | 'image/webp'; size_bytes: number; alt_text: string | null; url: string }
export interface Note { id: number; topic_id: number; title: string; content: string; format: NoteFormat; links: NoteLink[]; key_takeaway: string | null; revisit_question: string | null; confidence: ConfidenceLevel | null; created_at: string; updated_at: string }
export type NoteInput = Pick<Note, 'title' | 'content' | 'format' | 'links' | 'key_takeaway' | 'revisit_question' | 'confidence'>

export interface Topic {
  id: number
  learning_path_id: number
  title: string
  description: string | null
  status: TopicStatus
  position: number
  created_at: string
  updated_at: string
}

export interface TopicInput {
  title: string
  description: string | null
}
export type PathIcon = 'coffee' | 'code' | 'database' | 'network' | 'terminal' | 'layers'

export interface LearningPathResponse {
  id: number
  title: string
  description: string | null
  created_at: string
  updated_at: string
  topic_count: number
  completed_topic_count: number
  in_progress_topic_count: number
  completion_percentage: number
}

// UI presentation data mapped from the backend response by services/paths.ts.
export interface LearningPath {
  id: string
  title: string
  description: string
  icon: PathIcon
  color: 'sage' | 'sand' | 'lavender' | 'blue' | 'rose' | 'gray'
  topicCount: number
  completedTopicCount: number
  inProgressTopicCount: number
  completionPercentage: number
  createdAt: number
}

export type PathInput = Pick<LearningPath, 'title' | 'description'>

export function pathProgress(path: LearningPath) {
  return { completed: path.completedTopicCount, total: path.topicCount, percent: path.completionPercentage }
}

export function pathStatus(path: LearningPath) {
  const { completed, total } = pathProgress(path)
  if (total > 0 && completed === total) return 'completed'
  if (completed > 0 || path.inProgressTopicCount > 0) return 'active'
  return 'not-started'
}
