import { useEffect, useState } from 'react'
import { BookOpen, FileText, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { CompactMarkdownCodeBlock } from './MarkdownCodeBlock'
import { PlainTextPreview } from './PlainTextPreview'
import type { Note } from '../types'
import * as api from '../services/notes'

function getMarkdownExcerpt(content: string) {
  const lines = content.split('\n')
  let excerpt = ''
  for (const line of lines) {
    if (excerpt.length + line.length + 1 > 1600) break
    excerpt += `${line}\n`
  }
  if (excerpt.length < content.length) {
    const fenceCount = (excerpt.match(/```/g) ?? []).length
    if (fenceCount % 2 === 1) excerpt += '\n```'
  }
  return excerpt.trim()
}

export function NotesPanel({ pathId, topicId }: { pathId: string; topicId: number }) {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.listNotes(topicId, controller.signal).then(items => { if (!controller.signal.aborted) setNotes(items) }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load notes.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [topicId, reload])
  async function create() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const note = await api.createNote(topicId, { title: 'Untitled note', content: '', format: 'markdown', links: [], key_takeaway: null, revisit_question: null, confidence: null })
      navigate(`/paths/${pathId}/topics/${topicId}/notes/${note.id}`)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create note.') }
    finally { setBusy(false) }
  }
  async function remove(note: Note) {
    if (busy || !window.confirm(`Delete “${note.title}”? This cannot be undone.`)) return
    setBusy(true); setError('')
    try { await api.deleteNote(note.id); setNotes(items => items.filter(item => item.id !== note.id)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete note.') }
    finally { setBusy(false) }
  }
  return <section className="notes-section" aria-labelledby="notes-heading">
    <div className="detail-section-heading"><div><h2 id="notes-heading">Notes <span>{notes.length}</span></h2><p>Capture what you learn, one thought at a time.</p></div><button className="button primary" onClick={create} disabled={busy}><Plus size={16} /> New note</button></div>
    {error && <div className="request-error" role="alert">{error} <button onClick={() => setReload(value => value + 1)}>Try again</button></div>}
    {loading ? <p role="status">Loading notes…</p> : notes.length ? <div className="notes-grid">{notes.map(note => <article className="note-card" key={note.id}><Link to={`/paths/${pathId}/topics/${topicId}/notes/${note.id}`}><FileText size={20} /><h3>{note.title}</h3>{note.content.trim() ? note.format === 'markdown' ? <div className="note-card-preview"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ pre: CompactMarkdownCodeBlock, a: ({ children }) => <span className="note-card-inline-link">{children}</span>, img: () => null }} skipHtml>{getMarkdownExcerpt(note.content)}</ReactMarkdown></div> : <PlainTextPreview content={note.content.trim().slice(0, 1200)} compact /> : <div className="note-card-preview"><p className="note-card-empty">Start writing…</p></div>}<small>{note.format === 'plain' ? 'Plain text' : 'Markdown'} · {note.links.length} {note.links.length === 1 ? 'link' : 'links'} · Updated {new Date(note.updated_at).toLocaleDateString()}</small></Link><button className="icon-button" disabled={busy} aria-label={`Delete ${note.title}`} onClick={() => remove(note)}><Trash2 size={16} /></button></article>)}</div> : <div className="empty-state"><span className="empty-icon"><BookOpen size={24} /></span><h3>Your first note starts here.</h3><p>Write down questions, ideas, and what finally clicked.</p><button className="button secondary" onClick={create} disabled={busy}>Create a note</button></div>}
  </section>
}
