import { Children, isValidElement, useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowLeft, Bold, Check, Code2, Columns2, Copy, ExternalLink, Eye, Heading2, Italic, Link2, List, PanelLeft, PanelRight, Plus, Save, Trash2 } from 'lucide-react'
import { Link, useBlocker, useParams } from 'react-router'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/github.css'
import * as api from '../services/notes'
import type { Note, NoteFormat, NoteInput, NoteLink } from '../types'

type EditorLayout = 'write' | 'split' | 'preview'
type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'

function sameInput(left: NoteInput, right: NoteInput) {
  return left.title === right.title && left.content === right.content && left.format === right.format && JSON.stringify(left.links) === JSON.stringify(right.links)
}

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children)
  return ''
}

function PreviewCodeBlock({ children, ...props }: ComponentProps<'pre'>) {
  const [copied, setCopied] = useState(false)
  const code = Children.toArray(children).find(child => isValidElement(child))
  const className = isValidElement<{ className?: string }>(code) ? code.props.className ?? '' : ''
  const language = className.match(/(?:^|\s)language-([^\s]+)/)?.[1] ?? 'text'
  const source = nodeText(code).replace(/\n$/, '')
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(source)
    } catch {
      const fallback = document.createElement('textarea')
      fallback.value = source
      fallback.style.position = 'fixed'
      fallback.style.opacity = '0'
      document.body.appendChild(fallback)
      fallback.select()
      document.execCommand('copy')
      fallback.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return <div className="preview-code-block"><div className="preview-code-header"><span>{language}</span><button type="button" onClick={copyCode}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy code'}</button></div><pre {...props}>{children}</pre></div>
}

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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [layout, setLayout] = useState<EditorLayout>('split')
  const textarea = useRef<HTMLTextAreaElement>(null)
  const draft: NoteInput = { title, content, format, links }
  const latestDraft = useRef(draft)
  const savedDraft = useRef(saved)
  const savingRef = useRef(false)
  const saveAgain = useRef(false)
  latestDraft.current = draft
  savedDraft.current = saved
  const dirty = Boolean(note) && !sameInput(draft, saved)
  const blocker = useBlocker(dirty)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.getNote(Number(noteId), controller.signal).then(item => {
      if (controller.signal.aborted) return
      if (item.topic_id !== Number(topicId)) { setError('Note not found.'); return }
      const input = { title: item.title, content: item.content, format: item.format, links: item.links }
      setNote(item)
      setTitle(item.title)
      setContent(item.content)
      setFormat(item.format)
      setLinks(item.links)
      setSaved(input)
      setSaveStatus('saved')
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load note.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [noteId, topicId])

  useEffect(() => {
    if (!dirty) return
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])

  const save = useCallback(async () => {
    if (!note) return
    if (!latestDraft.current.title.trim()) { setError('Add a title before saving.'); return }
    if (savingRef.current) { saveAgain.current = true; return }
    const submitted = { ...latestDraft.current, title: latestDraft.current.title.trim(), links: [...latestDraft.current.links] }
    if (sameInput(submitted, savedDraft.current)) return
    savingRef.current = true
    setSaving(true)
    setSaveStatus('saving')
    setError('')
    let succeeded = false
    try {
      const updated = await api.updateNote(note.id, submitted)
      const persisted = { title: updated.title, content: updated.content, format: updated.format, links: updated.links }
      setNote(updated)
      setTitle(current => current === submitted.title ? updated.title : current)
      setSaved(persisted)
      savedDraft.current = persisted
      succeeded = true
      setSaveStatus(sameInput(latestDraft.current, persisted) ? 'saved' : 'unsaved')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save note.')
      setSaveStatus('error')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
    const hasNewerChanges = !sameInput(latestDraft.current, savedDraft.current)
    if (succeeded && (saveAgain.current || hasNewerChanges)) {
      saveAgain.current = false
      void save()
    }
  }, [note])

  useEffect(() => {
    if (!note || !dirty || !title.trim()) {
      if (!dirty && !savingRef.current) setSaveStatus('saved')
      return
    }
    setSaveStatus(current => current === 'saving' ? current : 'unsaved')
    const timer = window.setTimeout(() => { void save() }, 900)
    return () => window.clearTimeout(timer)
  }, [note, dirty, title, content, format, links, save])

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [save])

  function insert(before: string, after = before, placeholder = 'text') {
    const field = textarea.current
    if (!field) return
    const start = field.selectionStart
    const end = field.selectionEnd
    const selected = content.slice(start, end) || placeholder
    setContent(content.slice(0, start) + before + selected + after + content.slice(end))
    requestAnimationFrame(() => {
      field.focus()
      field.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  function addLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLinkError('')
    let parsed: URL
    try { parsed = new URL(linkUrl.trim()) }
    catch { setLinkError('Enter a full URL starting with https:// or http://.'); return }
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
      setLinkError('Use a public http:// or https:// URL without login details.')
      return
    }
    if (links.length >= 30) { setLinkError('A note can have up to 30 links.'); return }
    if (links.some(link => link.url === parsed.href)) { setLinkError('This link is already attached.'); return }
    setLinks(current => [...current, { label: linkLabel.trim().slice(0, 120), url: parsed.href }])
    setLinkLabel('')
    setLinkUrl('')
  }

  const back = `/paths/${pathId}/topics/${topicId}`
  if (loading) return <div className="page note-page" role="status">Loading note…</div>
  if (!note) return <div className="page empty-state"><h1>Note not found</h1><p role="alert">{error}</p><Link className="button secondary" to={back}>Back to topic</Link></div>

  return <div className="page note-page">
    <div className="note-topline"><Link className="back-link" to={back}><ArrowLeft size={16} /> Back to topic</Link><span className={`note-save-state ${saveStatus}`} role="status">{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed — changes kept' : saveStatus === 'unsaved' ? 'Unsaved changes' : 'Saved automatically'}</span></div>
    <div className="note-header"><input aria-label="Note title" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /><button className="button primary" disabled={!dirty || saving} onClick={save}><Save size={16} /> Save note</button></div>
    {error && <p className="request-error" role="alert">{error}</p>}
    <fieldset className="note-format-picker"><legend>Editor mode</legend><label className={format === 'plain' ? 'selected' : ''}><input type="radio" name="note-format" value="plain" checked={format === 'plain'} onChange={() => setFormat('plain')} /> Plain text</label><label className={format === 'markdown' ? 'selected' : ''}><input type="radio" name="note-format" value="markdown" checked={format === 'markdown'} onChange={() => setFormat('markdown')} /> Markdown</label><span>Switching modes keeps your writing.</span></fieldset>
    <div className="note-layout-picker" role="group" aria-label="Editor layout"><button aria-pressed={layout === 'write'} onClick={() => setLayout('write')}><PanelLeft size={15} /> Write Only</button><button aria-pressed={layout === 'split'} onClick={() => setLayout('split')}><Columns2 size={15} /> Split View</button><button aria-pressed={layout === 'preview'} onClick={() => setLayout('preview')}><PanelRight size={15} /> Preview Only</button></div>
    <div className={`note-editor-grid layout-${layout}`}>
      <section className={`note-write ${layout === 'preview' ? 'layout-hidden' : ''}`} aria-label={format === 'markdown' ? 'Markdown editor' : 'Plain text editor'}>
        <div className="note-pane-title">WRITE <span>{format === 'markdown' ? 'Markdown' : 'Plain text'}</span></div>
        {format === 'markdown' && <div className="note-toolbar" aria-label="Formatting"><button aria-label="Heading" onClick={() => insert('## ', '', 'Heading')}><Heading2 size={17} /></button><button aria-label="Bold" onClick={() => insert('**')}><Bold size={17} /></button><button aria-label="Italic" onClick={() => insert('*')}><Italic size={17} /></button><button aria-label="List" onClick={() => insert('- ', '', 'Item')}><List size={17} /></button><button aria-label="Link" onClick={() => insert('[', '](https://example.com)', 'link text')}><Link2 size={17} /></button><button aria-label="Code block" onClick={() => insert('```\n', '\n```', 'code')}><Code2 size={17} /></button></div>}
        <textarea ref={textarea} aria-label="Note content" spellCheck value={content} onChange={event => setContent(event.target.value)} placeholder={format === 'markdown' ? 'Start writing in Markdown…' : 'Start writing your note…'} />
      </section>
      <section className={`note-preview ${layout === 'write' ? 'layout-hidden' : ''}`} aria-label={format === 'markdown' ? 'Markdown preview' : 'Plain text preview'}>
        <div className="note-pane-title"><Eye size={15} /> PREVIEW</div>
        <div className="markdown-body">{content.trim() ? format === 'markdown' ? <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ pre: PreviewCodeBlock }} skipHtml>{content}</ReactMarkdown> : <div className="note-plain-preview">{content}</div> : <p className="preview-empty">Your preview will appear here as you write.</p>}</div>
      </section>
    </div>
    <section className="note-resources" aria-labelledby="resources-heading"><div className="note-resources-heading"><div><h2 id="resources-heading">Learning links</h2><p>Keep articles, repositories, videos, and other material beside your note.</p></div><span>{links.length} / 30</span></div><form className="note-link-form" onSubmit={addLink}><label>Link title <span>optional</span><input value={linkLabel} maxLength={120} onChange={event => setLinkLabel(event.target.value)} placeholder="e.g. Official documentation" /></label><label>URL<input type="url" required value={linkUrl} onChange={event => { setLinkUrl(event.target.value); setLinkError('') }} placeholder="https://…" /></label><button className="button secondary" type="submit"><Plus size={16} /> Add link</button></form>{linkError && <p className="request-error" role="alert">{linkError}</p>}{links.length ? <ul className="note-link-list">{links.map((link, index) => <li key={`${link.url}-${index}`}><span className="note-link-icon"><ExternalLink size={18} /></span><div><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label || new URL(link.url).hostname} <ExternalLink size={13} /></a><small>{linkKind(link.url)} · {new URL(link.url).hostname}</small></div><button className="icon-button" aria-label={`Remove ${link.label || link.url}`} onClick={() => setLinks(current => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></li>)}</ul> : <p className="note-links-empty">No links yet. Add a URL above to keep it with this note.</p>}</section>
    {blocker.state === 'blocked' && <div className="note-leave-overlay" role="dialog" aria-modal="true" aria-labelledby="leave-title"><div className="note-leave-dialog"><h2 id="leave-title">Leave without saving?</h2><p>Your latest changes will be lost.</p><div><button className="button secondary" onClick={() => blocker.reset()}>Keep editing</button><button className="button primary" onClick={() => blocker.proceed()}>Discard changes</button></div></div></div>}
  </div>
}
