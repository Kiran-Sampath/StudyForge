import { request } from './paths'
import type { Note, NoteInput } from '../types'

export async function listNotes(topicId: number, signal?: AbortSignal): Promise<Note[]> {
  const notes: Note[] = []
  for (let offset = 0; ; offset += 100) {
    const page = await request<Note[]>(`/api/topics/${topicId}/notes?limit=100&offset=${offset}`, { signal })
    notes.push(...page)
    if (page.length < 100) return notes
  }
}
export const getNote = (id: number, signal?: AbortSignal) => request<Note>(`/api/notes/${id}`, { signal })
export const createNote = (topicId: number, input: NoteInput) => request<Note>(`/api/topics/${topicId}/notes`, { method: 'POST', body: JSON.stringify(input) })
export const updateNote = (id: number, input: NoteInput) => request<Note>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteNote = (id: number) => request<void>(`/api/notes/${id}`, { method: 'DELETE' })
