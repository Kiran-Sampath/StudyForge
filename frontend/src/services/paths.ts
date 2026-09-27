import type { LearningPath, LearningPathResponse, PathInput } from '../types'
import { supabase } from './supabase'

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    const headers = new Headers(options.headers)
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
    response = await fetch(`${apiBaseUrl}${url}`, { ...options, headers })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('Could not reach StudyForge. Check that the backend is running and try again.', 0)
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.detail
    const message = typeof detail === 'string' ? detail : Array.isArray(detail)
      ? detail.map((item: { msg: string }) => item.msg).join('. ')
      : 'The request could not be completed. Please try again.'
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json()
}

export function toLearningPath(data: LearningPathResponse): LearningPath {
  const colors = ['sage', 'sand', 'lavender', 'blue', 'rose', 'gray'] as const
  return { id: String(data.id), title: data.title, description: data.description ?? '',
    icon: 'layers', color: colors[(data.id - 1) % colors.length],
    topicCount: data.topic_count, completedTopicCount: data.completed_topic_count,
    inProgressTopicCount: data.in_progress_topic_count, completionPercentage: data.completion_percentage,
    createdAt: new Date(data.created_at).getTime(), updatedAt: new Date(data.updated_at).getTime() }
}

export async function listPaths(signal?: AbortSignal): Promise<LearningPath[]> {
  const paths: LearningPath[] = []
  for (let offset = 0; ; offset += 100) {
    const page = await request<LearningPathResponse[]>(`/api/paths?limit=100&offset=${offset}`, { signal })
    paths.push(...page.map(toLearningPath))
    if (page.length < 100) return paths
  }
}
export async function getPath(id: string, signal?: AbortSignal) {
  return toLearningPath(await request<LearningPathResponse>(`/api/paths/${encodeURIComponent(id)}`, { signal }))
}
export async function createPath(input: PathInput) {
  return toLearningPath(await request<LearningPathResponse>('/api/paths', { method: 'POST', body: JSON.stringify(input) }))
}
export async function updatePath(id: string, input: PathInput) {
  return toLearningPath(await request<LearningPathResponse>(`/api/paths/${id}`, { method: 'PATCH', body: JSON.stringify(input) }))
}
export async function deletePath(id: string) {
  return request<void>(`/api/paths/${id}`, { method: 'DELETE' })
}
