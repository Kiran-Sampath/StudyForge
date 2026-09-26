import type { LearningPathResponse, Topic, Note } from '../types'

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
  let topics: Topic[] = records.flatMap(path => Array.from({ length: path.topic_count }, (_, index) => ({
    id: path.id * 100 + index + 1,
    learning_path_id: path.id,
    title: path.id === 4 ? ['Relational models', 'SQL fundamentals', 'Joins', 'Indexes', 'Transactions'][index] : `Topic ${index + 1}`,
    description: null,
    status: index < path.completed_topic_count ? 'COMPLETED' : index < path.completed_topic_count + path.in_progress_topic_count ? 'IN_PROGRESS' : 'NOT_STARTED',
    position: index,
    created_at: path.created_at,
    updated_at: path.updated_at,
  } as Topic)))
  let nextId = 100
  let nextTopicId = 1000
  let notes: Note[] = []
  let noteImages: import('../types').NoteImage[] = []
  let nextNoteId = 1
  function updateSummary(pathId: number) {
    const path = records.find(record => record.id === pathId)
    if (!path) return
    const related = topics.filter(topic => topic.learning_path_id === pathId)
    path.topic_count = related.length
    path.completed_topic_count = related.filter(topic => topic.status === 'COMPLETED').length
    path.in_progress_topic_count = related.filter(topic => topic.status === 'IN_PROGRESS').length
    path.completion_percentage = related.length ? Math.round(path.completed_topic_count / related.length * 100) : 0
  }
  return (url: string, method = 'GET', body = '') => {
    const parsed = new URL(url, 'http://localhost')
    const segments = parsed.pathname.split('/')
    const id = Number(segments[3])
    let input: { [key: string]: any } = {}
    try { input = body ? JSON.parse(body) : {} } catch { /* Multipart image forms have a different body format. */ }
    if (segments[2] === 'topics' && segments[4] === 'notes') {
      if (!topics.some(topic => topic.id === id)) return { status: 404, body: { detail: 'Topic not found' } }
      if (method === 'GET') return { status: 200, body: notes.filter(note => note.topic_id === id).slice(Number(parsed.searchParams.get('offset') ?? 0)) }
      if (method === 'POST') {
        const now = new Date().toISOString()
        const created: Note = { id: nextNoteId++, topic_id: id, title: input.title, content: input.content ?? '', format: input.format ?? 'markdown', links: input.links ?? [], key_takeaway: input.key_takeaway ?? null, revisit_question: input.revisit_question ?? null, confidence: input.confidence ?? null, created_at: now, updated_at: now }
        notes.push(created)
        return { status: 201, body: created }
      }
    }
    if (segments[2] === 'notes') {
      if (segments[4] === 'images') {
        if (method === 'GET') return { status: 200, body: noteImages.filter(image => image.note_id === id) }
        if (method === 'POST') {
          const uploaded: import('../types').NoteImage = { id: noteImages.length + 1, note_id: id, filename: 'diagram.png', content_type: 'image/png', size_bytes: 12, alt_text: null, url: 'https://studyforge.supabase.co/storage/v1/object/sign/studyforge-note-images/demo/1/diagram.png?token=fresh' }
          noteImages.push(uploaded)
          return { status: 201, body: uploaded }
        }
        if (method === 'DELETE') { noteImages = noteImages.filter(image => image.id !== Number(segments[5])); return { status: 204, body: null } }
        return { status: 404, body: { detail: 'Image not found' } }
      }
      const note = notes.find(item => item.id === id)
      if (!note) return { status: 404, body: { detail: 'Note not found' } }
      if (method === 'PATCH') { Object.assign(note, input, { updated_at: new Date().toISOString() }); return { status: 200, body: note } }
      if (method === 'DELETE') { notes = notes.filter(item => item.id !== id); return { status: 204, body: null } }
      return { status: 200, body: note }
    }
    if (segments[2] === 'paths' && segments[4] === 'topics') {
      if (!records.some(path => path.id === id)) return { status: 404, body: { detail: 'Learning path not found' } }
      if (method === 'GET') return { status: 200, body: topics.filter(topic => topic.learning_path_id === id).slice(Number(parsed.searchParams.get('offset') ?? 0)) }
      if (method === 'POST') {
        const related = topics.filter(topic => topic.learning_path_id === id)
        const created: Topic = { id: nextTopicId++, learning_path_id: id, title: input.title, description: input.description ?? null, status: 'NOT_STARTED', position: related.length ? Math.max(...related.map(topic => topic.position)) + 1 : 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        topics.push(created)
        updateSummary(id)
        return { status: 201, body: created }
      }
    }
    if (segments[2] === 'topics') {
      const topic = topics.find(item => item.id === id)
      if (!topic) return { status: 404, body: { detail: 'Topic not found' } }
      if (method === 'PATCH') {
        Object.assign(topic, input)
        updateSummary(topic.learning_path_id)
        return { status: 200, body: topic }
      }
      if (method === 'DELETE') {
        topics = topics.filter(item => item.id !== id)
        notes = notes.filter(item => item.topic_id !== id)
        updateSummary(topic.learning_path_id)
        return { status: 204, body: null }
      }
      return { status: 200, body: topic }
    }
    if (method === 'GET' && !id) return { status: 200, body: records }
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
