import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bold, Code2, ExternalLink, Eye, Heading2, Italic, Link2, List, Plus, Save, Trash2 } from 'lucide-react'
import { Link, useParams, useBlocker } from 'react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import * as api from '../services/notes'
import type { Note, NoteFormat, NoteInput, NoteLink } from '../types'

function linkKind(url: string) {
  const host = new URL(url).hostname.toLowerCase()
  if (host === 'github.com' || host === 'www.github.com') return 'GitHub'
  if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') return 'YouTube'
  return 'Learning resource'
}

export function NoteEditor() {
  const { pathId, topicId, noteId } = useParams()
  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [format, setFormat] = useState<NoteFormat>('markdown')
  const [links, setLinks] = useState<NoteLink[]>([])
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')
  const [saved, setSaved] = useState<NoteInput>({ title: '', content: '', format: 'markdown', links: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'write' | 'preview'>('write')
  const textarea = useRef<HTMLTextAreaElement>(null)
  const dirty = Boolean(note) && (title !== saved.title || content !== saved.content || format !== saved.format || JSON.stringify(links) !== JSON.stringify(saved.links))
  const blocker = useBlocker(dirty)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    api.getNote(Number(noteId), controller.signal).then(item => {
      if (controller.signal.aborted) return
      if (item.topic_id !== Number(topicId)) { setError('Note not found.'); return }
      setNote(item); setTitle(item.title); setContent(item.content); setFormat(item.format); setLinks(item.links); setSaved({ title: item.title, content: item.content, format: item.format, links: item.links })
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
    const submitted: NoteInput = { title: title.trim(), content, format, links }
    setSaving(true); setError('')
    try {
      const updated = await api.updateNote(note.id, submitted)
      setNote(updated)
      setTitle(current => current === title ? updated.title : current)
      setSaved({ title: updated.title, content: updated.content, format: updated.format, links: updated.links })
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
  function addLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLinkError('')
    let parsed: URL
    try { parsed = new URL(linkUrl.trim()) }
    catch { setLinkError('Enter a full URL starting with https:// or http://.'); return }
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
      setLinkError('Use a public http:// or https:// URL without login details.'); return
    }
    if (links.length >= 30) { setLinkError('A note can have up to 30 links.'); return }
    if (links.some(link => link.url === parsed.href)) { setLinkError('This link is already attached.'); return }
    setLinks(current => [...current, { label: linkLabel.trim().slice(0, 120), url: parsed.href }])
    setLinkLabel(''); setLinkUrl('')
  }
  const back = `/paths/${pathId}/topics/${topicId}`
  if (loading) return <div className="page note-page" role="status">Loading note…</div>
  if (!note) return <div className="page empty-state"><h1>Note not found</h1><p role="alert">{error}</p><Link className="button secondary" to={back}>Back to topic</Link></div>
  return <div className="page note-page">
    <div className="note-topline"><Link className="back-link" to={back}><ArrowLeft size={16} /> Back to topic</Link><span className="note-save-state" role="status">{saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}</span></div>
    <div className="note-header"><input aria-label="Note title" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /><button className="button primary" disabled={!dirty || saving} onClick={save}><Save size={16} /> Save note</button></div>
    {error && <p className="request-error" role="alert">{error}</p>}
    <fieldset className="note-format-picker"><legend>Editor mode</legend><label className={format === 'plain' ? 'selected' : ''}><input type="radio" name="note-format" value="plain" checked={format === 'plain'} onChange={() => setFormat('plain')} /> Plain text</label><label className={format === 'markdown' ? 'selected' : ''}><input type="radio" name="note-format" value="markdown" checked={format === 'markdown'} onChange={() => setFormat('markdown')} /> Markdown</label><span>Switching modes keeps your writing.</span></fieldset>
    <div className="note-mobile-tabs" role="group" aria-label="Editor view"><button aria-pressed={view === 'write'} onClick={() => setView('write')}>Write</button><button aria-pressed={view === 'preview'} onClick={() => setView('preview')}>Preview</button></div>
    <div className="note-editor-grid"><section className={`note-write ${view === 'preview' ? 'mobile-hidden' : ''}`} aria-label={format === 'markdown' ? 'Markdown editor' : 'Plain text editor'}><div className="note-pane-title">WRITE <span>{format === 'markdown' ? 'Markdown' : 'Plain text'}</span></div>{format === 'markdown' && <div className="note-toolbar" aria-label="Formatting"><button aria-label="Heading" onClick={() => insert('## ', '', 'Heading')}><Heading2 size={17} /></button><button aria-label="Bold" onClick={() => insert('**')}><Bold size={17} /></button><button aria-label="Italic" onClick={() => insert('*')}><Italic size={17} /></button><button aria-label="List" onClick={() => insert('- ', '', 'Item')}><List size={17} /></button><button aria-label="Link" onClick={() => insert('[', '](https://example.com)', 'link text')}><Link2 size={17} /></button><button aria-label="Code block" onClick={() => insert('```\n', '\n```', 'code')}><Code2 size={17} /></button></div>}<textarea ref={textarea} aria-label="Note content" spellCheck value={content} onChange={event => setContent(event.target.value)} placeholder={format === 'markdown' ? 'Start writing in Markdown…' : 'Start writing your note…'} /></section>
      <section className={`note-preview ${view === 'write' ? 'mobile-hidden' : ''}`} aria-label={format === 'markdown' ? 'Markdown preview' : 'Plain text preview'}><div className="note-pane-title"><Eye size={15} /> PREVIEW</div><div className="markdown-body">{content.trim() ? format === 'markdown' ? <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} skipHtml>{content}</ReactMarkdown> : <div className="note-plain-preview">{content}</div> : <p className="preview-empty">Your preview will appear here as you write.</p>}</div></section></div>
    <section className="note-resources" aria-labelledby="resources-heading"><div className="note-resources-heading"><div><h2 id="resources-heading">Learning links</h2><p>Keep articles, repositories, videos, and other material beside your note.</p></div><span>{links.length} / 30</span></div><form className="note-link-form" onSubmit={addLink}><label>Link title <span>optional</span><input value={linkLabel} maxLength={120} onChange={event => setLinkLabel(event.target.value)} placeholder="e.g. Official documentation" /></label><label>URL<input type="url" required value={linkUrl} onChange={event => { setLinkUrl(event.target.value); setLinkError('') }} placeholder="https://…" /></label><button className="button secondary" type="submit"><Plus size={16} /> Add link</button></form>{linkError && <p className="request-error" role="alert">{linkError}</p>}{links.length ? <ul className="note-link-list">{links.map((link, index) => <li key={`${link.url}-${index}`}><span className="note-link-icon"><ExternalLink size={18} /></span><div><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label || new URL(link.url).hostname} <ExternalLink size={13} /></a><small>{linkKind(link.url)} · {new URL(link.url).hostname}</small></div><button className="icon-button" aria-label={`Remove ${link.label || link.url}`} onClick={() => setLinks(current => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></li>)}</ul> : <p className="note-links-empty">No links yet. Add a URL above to keep it with this note.</p>}</section>
    {blocker.state === 'blocked' && <div className="note-leave-overlay" role="dialog" aria-modal="true" aria-labelledby="leave-title"><div className="note-leave-dialog"><h2 id="leave-title">Leave without saving?</h2><p>Your latest changes will be lost.</p><div><button className="button secondary" onClick={() => blocker.reset()}>Keep editing</button><button className="button primary" onClick={() => blocker.proceed()}>Discard changes</button></div></div></div>}
  </div>
}
