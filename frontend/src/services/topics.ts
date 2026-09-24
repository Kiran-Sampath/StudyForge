import { request } from './paths'
import type { Topic, TopicInput, TopicStatus } from '../types'

export async function listTopics(pathId: string, signal?: AbortSignal): Promise<Topic[]> {
  const topics: Topic[] = []
  for (let offset = 0; ; offset += 100) {
    const page = await request<Topic[]>(`/api/paths/${encodeURIComponent(pathId)}/topics?limit=100&offset=${offset}`, { signal })
    topics.push(...page)
    if (page.length < 100) return topics
  }
}

export async function createTopic(pathId: string, input: TopicInput) {
  return request<Topic>(`/api/paths/${encodeURIComponent(pathId)}/topics`, {
    method: 'POST', body: JSON.stringify(input),
  })
}

export async function updateTopic(id: number, input: Partial<TopicInput> & { status?: TopicStatus }) {
  return request<Topic>(`/api/topics/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export async function deleteTopic(id: number) {
  return request<void>(`/api/topics/${id}`, { method: 'DELETE' })
}
