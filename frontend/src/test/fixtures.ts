import type { LearningPathResponse } from '../types'

// Test-only fixtures. The application never imports or seeds these records.
export function fixturePaths(): LearningPathResponse[] {
  return [
    ['Java Backend Development', 8, 4, 1],
    ['System Design', 6, 1, 1],
    ['Data Structures & Algorithms', 7, 2, 1],
    ['SQL & Databases', 5, 5, 0],
    ['Python & FastAPI', 4, 0, 0],
    ['Software Foundations', 3, 0, 0],
  ].map(([title, total, done, active], index) => ({
    id: index + 1, title: String(title), description: 'A saved learning path.',
    topic_count: Number(total), completed_topic_count: Number(done), in_progress_topic_count: Number(active),
    completion_percentage: Math.round(Number(done) / Number(total) * 100),
    created_at: `2026-09-${20 - index}T12:00:00Z`, updated_at: `2026-09-${20 - index}T12:00:00Z`,
  }))
}

export function mockPathApi() {
  let records = fixturePaths()
  let nextId = 100
  return (url: string, method = 'GET', body = '') => {
    const parsed = new URL(url, 'http://localhost')
    const id = Number(parsed.pathname.split('/')[3])
    if (method === 'GET' && !id) return { status: 200, body: records }
    const input = body ? JSON.parse(body) : {}
    if (method === 'POST') {
      const created = { ...fixturePaths()[0], ...input, id: nextId++, topic_count: 0, completed_topic_count: 0, in_progress_topic_count: 0, completion_percentage: 0, created_at: new Date().toISOString() }
      records = [created, ...records]
      return { status: 201, body: created }
    }
    const record = records.find(record => record.id === id)
    if (!record) return { status: 404, body: { detail: 'Learning path not found' } }
    if (method === 'PATCH') {
      Object.assign(record, input)
      return { status: 200, body: record }
    }
    if (method === 'DELETE') { records = records.filter(record => record.id !== id); return { status: 204, body: null } }
    return { status: 200, body: record }
  }
}
