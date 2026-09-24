import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bold, Code2, Eye, Heading2, Italic, Link2, List, Save } from 'lucide-react'
import { Link, useParams, useBlocker } from 'react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import * as api from '../services/notes'
import type { Note } from '../types'

export function NoteEditor() {
  const { pathId, topicId, noteId } = useParams()
  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState({ title: '', content: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'write' | 'preview'>('write')
  const textarea = useRef<HTMLTextAreaElement>(null)
  const dirty = Boolean(note) && (title !== saved.title || content !== saved.content)
  const blocker = useBlocker(dirty)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    api.getNote(Number(noteId), controller.signal).then(item => {
      if (controller.signal.aborted) return
      if (item.topic_id !== Number(topicId)) { setError('Note not found.'); return }
      setNote(item); setTitle(item.title); setContent(item.content); setSaved({ title: item.title, content: item.content })
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load note.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [noteId, topicId])
  useEffect(() => {
    if (!dirty) return
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])
  async function save() {
    if (!note || saving || !dirty) return
    if (!title.trim()) { setError('Add a title before saving.'); return }
    setSaving(true); setError('')
    try {
      const updated = await api.updateNote(note.id, { title: title.trim(), content })
      setNote(updated); setTitle(updated.title); setContent(updated.content); setSaved({ title: updated.title, content: updated.content })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save note.') }
    finally { setSaving(false) }
  }
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save() } }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  })
  function insert(before: string, after = before, placeholder = 'text') {
    const field = textarea.current
    if (!field) return
    const start = field.selectionStart, end = field.selectionEnd
    const selected = content.slice(start, end) || placeholder
    setContent(content.slice(0, start) + before + selected + after + content.slice(end))
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start + before.length, start + before.length + selected.length) })
  }
  const back = `/paths/${pathId}/topics/${topicId}`
  if (loading) return <div className="page note-page" role="status">Loading note…</div>
  if (!note) return <div className="page empty-state"><h1>Note not found</h1><p role="alert">{error}</p><Link className="button secondary" to={back}>Back to topic</Link></div>
  return <div className="page note-page">
    <div className="note-topline"><Link className="back-link" to={back}><ArrowLeft size={16} /> Back to topic</Link><span className="note-save-state" role="status">{saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}</span></div>
    <div className="note-header"><input aria-label="Note title" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /><button className="button primary" disabled={!dirty || saving} onClick={save}><Save size={16} /> Save note</button></div>
    {error && <p className="request-error" role="alert">{error}</p>}
    <div className="note-mobile-tabs" role="group" aria-label="Editor view"><button aria-pressed={view === 'write'} onClick={() => setView('write')}>Write</button><button aria-pressed={view === 'preview'} onClick={() => setView('preview')}>Preview</button></div>
    <div className="note-editor-grid"><section className={`note-write ${view === 'preview' ? 'mobile-hidden' : ''}`} aria-label="Markdown editor"><div className="note-pane-title">WRITE <span>Markdown</span></div><div className="note-toolbar" aria-label="Formatting"><button aria-label="Heading" onClick={() => insert('## ', '', 'Heading')}><Heading2 size={17} /></button><button aria-label="Bold" onClick={() => insert('**')}><Bold size={17} /></button><button aria-label="Italic" onClick={() => insert('*')}><Italic size={17} /></button><button aria-label="List" onClick={() => insert('- ', '', 'Item')}><List size={17} /></button><button aria-label="Link" onClick={() => insert('[', '](https://example.com)', 'link text')}><Link2 size={17} /></button><button aria-label="Code block" onClick={() => insert('```\n', '\n```', 'code')}><Code2 size={17} /></button></div><textarea ref={textarea} aria-label="Note content" spellCheck value={content} onChange={event => setContent(event.target.value)} placeholder="Start writing in Markdown…" /></section>
      <section className={`note-preview ${view === 'write' ? 'mobile-hidden' : ''}`} aria-label="Markdown preview"><div className="note-pane-title"><Eye size={15} /> PREVIEW</div><div className="markdown-body">{content.trim() ? <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} skipHtml>{content}</ReactMarkdown> : <p className="preview-empty">Your preview will appear here as you write.</p>}</div></section></div>
    {blocker.state === 'blocked' && <div className="note-leave-overlay" role="dialog" aria-modal="true" aria-labelledby="leave-title"><div className="note-leave-dialog"><h2 id="leave-title">Leave without saving?</h2><p>Your latest changes will be lost.</p><div><button className="button secondary" onClick={() => blocker.reset()}>Keep editing</button><button className="button primary" onClick={() => blocker.proceed()}>Discard changes</button></div></div></div>}
  </div>
}
