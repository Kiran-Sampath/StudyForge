import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bold, BookOpen, ChevronDown, Code2, Columns2, ExternalLink, Eye, FileText, Heading2, ImagePlus, Italic, Link2, List, PanelLeft, PanelRight, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { Link, useBlocker, useParams } from 'react-router'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/github.css'
import { MarkdownCodeBlock } from './MarkdownCodeBlock'
import { PlainTextPreview } from './PlainTextPreview'
import * as api from '../services/notes'
import type { ConfidenceLevel, Note, NoteFormat, NoteImage, NoteInput, NoteLink } from '../types'

type EditorLayout = 'write' | 'split' | 'preview'
type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'
type NoteTab = 'all' | 'notes' | 'resources'
type ResourceFilter = 'all' | 'images' | 'links'
type ContentAction = 'image' | 'link' | null
const codeLanguages = ['plaintext', 'bash', 'c', 'cpp', 'csharp', 'css', 'go', 'html', 'java', 'javascript', 'json', 'markdown', 'python', 'rust', 'sql', 'typescript', 'xml', 'yaml']

function sameInput(left: NoteInput, right: NoteInput) {
  return left.title === right.title && left.content === right.content && left.format === right.format && JSON.stringify(left.links) === JSON.stringify(right.links) && left.key_takeaway === right.key_takeaway && left.revisit_question === right.revisit_question && left.confidence === right.confidence
}

function linkKind(url: string) {
  const host = new URL(url).hostname.toLowerCase()
  if (host === 'github.com' || host === 'www.github.com') return 'GitHub'
  if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') return 'YouTube'
  return 'Learning resource'
}

function markdownHasImage(markdown: string, imageUrl: string) {
  const markdownImages = /!\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))/g
  const target = new URL(imageUrl, window.location.href).pathname
  for (const match of markdown.matchAll(markdownImages)) {
    const source = match[1] ?? match[2]
    try {
      if (new URL(source, window.location.href).pathname === target) return true
    } catch { /* Ignore malformed Markdown image destinations. */ }
  }
  return false
}

function matchingUploadedImage(source: string | undefined, images: NoteImage[]) {
  if (!source) return undefined
  try {
    const path = new URL(source, window.location.href).pathname
    return images.find(image => new URL(image.url, window.location.href).pathname === path)
  } catch { return undefined }
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
  const [keyTakeaway, setKeyTakeaway] = useState('')
  const [revisitQuestion, setRevisitQuestion] = useState('')
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null)
  const [images, setImages] = useState<NoteImage[]>([])
  const [imageAltText, setImageAltText] = useState('')
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState('')
  const [activeTab, setActiveTab] = useState<NoteTab>('all')
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('all')
  const [contentAction, setContentAction] = useState<ContentAction>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [pendingFocus, setPendingFocus] = useState<'editor' | 'image' | 'link' | null>(null)
  const [learningCheckOpen, setLearningCheckOpen] = useState(false)
  const [saved, setSaved] = useState<NoteInput>({ title: '', content: '', format: 'markdown', links: [], key_takeaway: null, revisit_question: null, confidence: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [layout, setLayout] = useState<EditorLayout>('split')
  const [showCodeOptions, setShowCodeOptions] = useState(false)
  const [codeLanguage, setCodeLanguage] = useState('plaintext')
  const textarea = useRef<HTMLTextAreaElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const linkLabelInput = useRef<HTMLInputElement>(null)
  const contentMenu = useRef<HTMLDivElement>(null)
  const draft: NoteInput = { title, content, format, links, key_takeaway: keyTakeaway || null, revisit_question: revisitQuestion || null, confidence }
  const latestDraft = useRef(draft)
  const savedDraft = useRef(saved)
  const savingRef = useRef(false)
  const saveAgain = useRef(false)
  latestDraft.current = draft
  savedDraft.current = saved
  const dirty = Boolean(note) && !sameInput(draft, saved)
  const blocker = useBlocker(dirty)
  const galleryImages = images.filter(image => !markdownHasImage(content, image.url))

  useEffect(() => {
    if (!pendingFocus) return
    const frame = requestAnimationFrame(() => {
      if (pendingFocus === 'editor') textarea.current?.focus()
      if (pendingFocus === 'image') imageInput.current?.focus()
      if (pendingFocus === 'link') linkLabelInput.current?.focus()
      setPendingFocus(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [activeTab, contentAction, pendingFocus])

  useEffect(() => {
    if (!addMenuOpen) return
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !contentMenu.current?.contains(event.target)) setAddMenuOpen(false)
    }
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setAddMenuOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [addMenuOpen])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.getNote(Number(noteId), controller.signal).then(item => {
      if (controller.signal.aborted) return
      if (item.topic_id !== Number(topicId)) { setError('Note not found.'); return }
      const input = { title: item.title, content: item.content, format: item.format, links: item.links, key_takeaway: item.key_takeaway, revisit_question: item.revisit_question, confidence: item.confidence }
      setNote(item)
      api.listNoteImages(item.id, controller.signal).then(setImages).catch(reason => {
        if (!controller.signal.aborted) setImageError(reason instanceof Error ? reason.message : 'Could not load note images.')
      })
      setTitle(item.title)
      setContent(item.content)
      setFormat(item.format)
      setLinks(item.links)
      setKeyTakeaway(item.key_takeaway ?? '')
      setRevisitQuestion(item.revisit_question ?? '')
      setConfidence(item.confidence)
      setLearningCheckOpen(Boolean(item.key_takeaway || item.revisit_question || item.confidence))
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
    const rawDraft = latestDraft.current
    const submitted = { ...rawDraft, title: rawDraft.title.trim(), links: [...rawDraft.links], key_takeaway: rawDraft.key_takeaway?.trim() || null, revisit_question: rawDraft.revisit_question?.trim() || null }
    if (sameInput(submitted, savedDraft.current)) return
    savingRef.current = true
    setSaving(true)
    setSaveStatus('saving')
    setError('')
    let succeeded = false
    try {
      const updated = await api.updateNote(note.id, submitted)
      const persisted = { title: updated.title, content: updated.content, format: updated.format, links: updated.links, key_takeaway: updated.key_takeaway, revisit_question: updated.revisit_question, confidence: updated.confidence }
      setNote(updated)
      const draftWasUnchanged = sameInput(latestDraft.current, rawDraft)
      if (draftWasUnchanged) {
        latestDraft.current = persisted
        setTitle(updated.title)
        setKeyTakeaway(updated.key_takeaway ?? '')
        setRevisitQuestion(updated.revisit_question ?? '')
      }
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
  }, [note, dirty, title, content, format, links, keyTakeaway, revisitQuestion, confidence, save])

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

  function insertCodeBlock() {
    const field = textarea.current
    if (!field) return
    const start = field.selectionStart
    const end = field.selectionEnd
    const selected = content.slice(start, end)
    const before = content.slice(0, start)
    const after = content.slice(end)
    const opening = `\`\`\`${codeLanguage === 'plaintext' ? '' : codeLanguage}\n`
    const block = `${opening}${selected}\n\`\`\``
    const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
    const suffix = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : ''
    const insertion = `${prefix}${block}${suffix}`
    setContent(before + insertion + after)
    setShowCodeOptions(false)
    requestAnimationFrame(() => {
      field.focus()
      const codeStart = start + prefix.length + opening.length
      field.setSelectionRange(codeStart, codeStart + selected.length)
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

  async function uploadImage(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget
    event.preventDefault()
    const input = form.elements.namedItem('note-image-file')
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined
    if (!file || !note) return
    if (images.length >= 10) { setImageError('A note can have up to 10 images.'); return }
    setImageBusy(true)
    setImageError('')
    try {
      const added = await api.uploadNoteImage(note.id, file, imageAltText)
      setImages(current => [...current, added])
      setImageAltText('')
      form.reset()
    } catch (reason) {
      setImageError(reason instanceof Error ? reason.message : 'Could not upload image.')
    } finally { setImageBusy(false) }
  }

  async function removeImage(image: NoteImage) {
    if (!note) return
    setImageBusy(true)
    setImageError('')
    try {
      await api.deleteNoteImage(note.id, image.id)
      setImages(current => current.filter(item => item.id !== image.id))
    } catch (reason) {
      setImageError(reason instanceof Error ? reason.message : 'Could not remove image.')
    } finally { setImageBusy(false) }
  }

  function openContentAction(action: 'text' | 'image' | 'link') {
    setAddMenuOpen(false)
    if (action === 'text') {
      setActiveTab('notes')
      setPendingFocus('editor')
      return
    }
    setActiveTab('resources')
    setResourceFilter(action === 'image' ? 'images' : 'links')
    setContentAction(action)
    setPendingFocus(action)
  }

  const back = `/paths/${pathId}/topics/${topicId}`
  if (loading) return <div className="page note-page" role="status">Loading note…</div>
  if (!note) return <div className="page empty-state"><h1>Note not found</h1><p role="alert">{error}</p><Link className="button secondary" to={back}>Back to topic</Link></div>

  return <div className="page note-page">
    <div className="note-topline"><Link className="back-link" to={back}><ArrowLeft size={16} /> Back to topic</Link><span className={`note-save-state ${saveStatus}`} role="status">{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed — changes kept' : saveStatus === 'unsaved' ? 'Unsaved changes' : 'Saved automatically'}</span></div>
    <div className="note-header"><input aria-label="Note title" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /><div className="note-header-actions"><div className="add-content-menu" ref={contentMenu}><button className="button secondary" type="button" aria-haspopup="menu" aria-expanded={addMenuOpen} onClick={() => setAddMenuOpen(open => !open)}><Plus size={16} /> Add Content <ChevronDown size={15} /></button>{addMenuOpen && <div className="add-content-options" role="menu"><button type="button" role="menuitem" onClick={() => openContentAction('text')}><FileText size={16} /> Write Text</button><button type="button" role="menuitem" onClick={() => openContentAction('image')}><ImagePlus size={16} /> Upload Image</button><button type="button" role="menuitem" onClick={() => openContentAction('link')}><Link2 size={16} /> Add Link</button></div>}</div><button className="button primary" disabled={!dirty || saving} onClick={save}><Save size={16} /> Save note</button></div></div>
    {error && <p className="request-error" role="alert">{error}</p>}
    <div className="note-primary-tabs" role="tablist" aria-label="Note content sections">
      {([['all', 'All'], ['notes', 'Notes'], ['resources', 'Resources']] as const).map(([tab, label]) => <button key={tab} id={`note-tab-${tab}`} role="tab" aria-selected={activeTab === tab} aria-controls={`note-panel-${tab}`} tabIndex={activeTab === tab ? 0 : -1} onClick={() => setActiveTab(tab)}>{label}{tab === 'resources' && <span>{images.length + links.length}</span>}</button>)}
    </div>
    <section id="note-panel-all" className="note-tab-panel note-all-panel" role="tabpanel" aria-labelledby="note-tab-all" hidden={activeTab !== 'all'}>
      <div className="note-all-toolbar"><span><BookOpen size={16} /> Note overview</span><button className="button secondary" type="button" onClick={() => { setActiveTab('notes'); setPendingFocus('editor') }}>Edit Note</button></div>
      {content.trim() ? <div className="markdown-body note-all-content"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ pre: MarkdownCodeBlock, img: ({ src, alt }) => { const image = matchingUploadedImage(src, images); return <img src={image?.url ?? src} alt={alt || image?.alt_text || ''} /> } }} skipHtml>{content}</ReactMarkdown></div> : <p className="note-all-empty">No note text yet. Choose <strong>Write Text</strong> to start.</p>}
      {galleryImages.length > 0 && <div className="note-all-images" aria-label="Uploaded image gallery">{galleryImages.map(image => <figure key={image.id}><img src={image.url} alt={image.alt_text || image.filename} /><figcaption>{image.alt_text || image.filename}</figcaption></figure>)}</div>}
      {links.length > 0 && <div className="note-all-links" aria-label="Learning links">{links.map((link, index) => <a key={`${link.url}-${index}`} className="note-resource-card" href={link.url} target="_blank" rel="noopener noreferrer"><span className="note-link-icon"><ExternalLink size={17} /></span><span><strong>{link.label || new URL(link.url).hostname}</strong><small>{linkKind(link.url)} · {new URL(link.url).hostname}</small></span><ExternalLink className="note-card-open" size={15} /></a>)}</div>}
    </section>
    <section id="note-panel-notes" className="note-tab-panel" role="tabpanel" aria-labelledby="note-tab-notes" hidden={activeTab !== 'notes'}>
      <fieldset className="note-format-picker"><legend>Editor mode</legend><label className={format === 'plain' ? 'selected' : ''}><input type="radio" name="note-format" value="plain" checked={format === 'plain'} onChange={() => setFormat('plain')} /> Plain text</label><label className={format === 'markdown' ? 'selected' : ''}><input type="radio" name="note-format" value="markdown" checked={format === 'markdown'} onChange={() => setFormat('markdown')} /> Markdown</label><span>Switching modes keeps your writing.</span></fieldset>
      <div className="note-layout-picker" role="group" aria-label="Editor layout"><button aria-pressed={layout === 'write'} onClick={() => setLayout('write')}><PanelLeft size={15} /> Write Only</button><button aria-pressed={layout === 'split'} onClick={() => setLayout('split')}><Columns2 size={15} /> Split View</button><button aria-pressed={layout === 'preview'} onClick={() => setLayout('preview')}><PanelRight size={15} /> Preview Only</button></div>
      <div className={`note-editor-grid layout-${layout}`}>
        <section className={`note-write ${layout === 'preview' ? 'layout-hidden' : ''}`} aria-label={format === 'markdown' ? 'Markdown editor' : 'Plain text editor'}>
          <div className="note-pane-title">WRITE <span>{format === 'markdown' ? 'Markdown' : 'Plain text'}</span></div>
          {format === 'markdown' && <div className="note-toolbar" aria-label="Formatting"><button aria-label="Heading" onClick={() => insert('## ', '', 'Heading')}><Heading2 size={17} /></button><button aria-label="Bold" onClick={() => insert('**')}><Bold size={17} /></button><button aria-label="Italic" onClick={() => insert('*')}><Italic size={17} /></button><button aria-label="List" onClick={() => insert('- ', '', 'Item')}><List size={17} /></button><button aria-label="Link" onClick={() => insert('[', '](https://example.com)', 'link text')}><Link2 size={17} /></button></div>}
          <div className="note-code-inserter"><button className="note-code-trigger" type="button" aria-expanded={showCodeOptions} onClick={() => setShowCodeOptions(open => !open)}><Code2 size={16} /> Add code block</button>{showCodeOptions && <div className="note-code-options"><label>Language<select aria-label="Code language" value={codeLanguage} onChange={event => setCodeLanguage(event.target.value)}>{codeLanguages.map(language => <option key={language} value={language}>{language === 'plaintext' ? 'Plain text' : language}</option>)}</select></label><button className="button secondary" type="button" onClick={insertCodeBlock}>Insert block</button></div>}</div>
          <textarea ref={textarea} aria-label="Note content" spellCheck value={content} onChange={event => setContent(event.target.value)} placeholder={format === 'markdown' ? 'Start writing in Markdown…' : 'Start writing your note…'} />
        </section>
        <section className={`note-preview ${layout === 'write' ? 'layout-hidden' : ''}`} aria-label={format === 'markdown' ? 'Markdown preview' : 'Plain text preview'}>
          <div className="note-pane-title"><Eye size={15} /> PREVIEW</div>
          <div className="markdown-body">{content.trim() ? format === 'markdown' ? <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ pre: MarkdownCodeBlock, img: ({ src, alt }) => { const image = matchingUploadedImage(src, images); return <img src={image?.url ?? src} alt={alt || image?.alt_text || ''} /> } }} skipHtml>{content}</ReactMarkdown> : <PlainTextPreview content={content} /> : <p className="preview-empty">Your preview will appear here as you write.</p>}
            {galleryImages.length > 0 && <div className="note-image-preview" aria-label="Attached note images">{galleryImages.map(image => <figure key={image.id}><img src={image.url} alt={image.alt_text || image.filename} /><figcaption>{image.alt_text || image.filename}</figcaption></figure>)}</div>}
          </div>
        </section>
      </div>
      <section className={`learning-check ${learningCheckOpen ? 'open' : ''}`} aria-labelledby="learning-check-heading">
        <button className="learning-check-toggle" type="button" aria-expanded={learningCheckOpen} aria-controls="learning-check-fields" onClick={() => setLearningCheckOpen(open => !open)}><span className="learning-check-icon"><Sparkles size={18} /></span><span><strong id="learning-check-heading">Learning Check</strong><small>Optional reflection for your future self</small></span><span className="optional-label">OPTIONAL</span><ChevronDown size={17} className="learning-check-chevron" /></button>
        {learningCheckOpen && <div className="learning-check-fields" id="learning-check-fields"><label>Key takeaway<textarea maxLength={5000} value={keyTakeaway} onChange={event => setKeyTakeaway(event.target.value)} placeholder="What is the most important idea from this note?" /></label><label>Question to revisit<textarea maxLength={5000} value={revisitQuestion} onChange={event => setRevisitQuestion(event.target.value)} placeholder="What should you come back to or investigate further?" /></label><fieldset><legend>Confidence level</legend><div className="confidence-options"><label className={confidence === 'STILL_LEARNING' ? 'selected' : ''}><input type="radio" name="confidence" checked={confidence === 'STILL_LEARNING'} onChange={() => setConfidence('STILL_LEARNING')} /> Still Learning</label><label className={confidence === 'NEED_MORE_PRACTICE' ? 'selected' : ''}><input type="radio" name="confidence" checked={confidence === 'NEED_MORE_PRACTICE'} onChange={() => setConfidence('NEED_MORE_PRACTICE')} /> Need More Practice</label><label className={confidence === 'CONFIDENT' ? 'selected' : ''}><input type="radio" name="confidence" checked={confidence === 'CONFIDENT'} onChange={() => setConfidence('CONFIDENT')} /> Confident</label>{confidence && <button type="button" onClick={() => setConfidence(null)}>Clear</button>}</div></fieldset></div>}
      </section>
    </section>
    <section id="note-panel-resources" className="note-tab-panel note-resources-panel" role="tabpanel" aria-labelledby="note-tab-resources" hidden={activeTab !== 'resources'}>
      <div className="note-resource-filters" role="group" aria-label="Filter resources">{([['all', 'All Resources', images.length + links.length], ['images', 'Images', images.length], ['links', 'Links', links.length]] as const).map(([filter, label, count]) => <button key={filter} className={resourceFilter === filter ? 'selected' : ''} aria-pressed={resourceFilter === filter} onClick={() => setResourceFilter(filter)}>{label}<span>{count}</span></button>)}</div>
      <div className="note-resource-actions">{resourceFilter !== 'links' && <button className="button secondary" type="button" onClick={() => { setContentAction(action => action === 'image' ? null : 'image'); setPendingFocus('image') }}><ImagePlus size={16} /> Add image</button>}{resourceFilter !== 'images' && <button className="button secondary" type="button" onClick={() => { setContentAction(action => action === 'link' ? null : 'link'); setPendingFocus('link') }}><Plus size={16} /> Add link</button>}</div>
      {contentAction === 'image' && <form className="note-image-form note-resource-form" onSubmit={uploadImage}><label>Image file<input ref={imageInput} type="file" name="note-image-file" accept="image/jpeg,image/png,image/webp" required disabled={imageBusy || images.length >= 10} /></label><label>Alt text <span>optional</span><input value={imageAltText} maxLength={500} onChange={event => setImageAltText(event.target.value)} placeholder="Describe the image" disabled={imageBusy} /></label><button className="button primary" type="submit" disabled={imageBusy || images.length >= 10}><ImagePlus size={16} />{imageBusy ? 'Working…' : 'Upload image'}</button></form>}
      {contentAction === 'link' && <form className="note-link-form note-resource-form" onSubmit={addLink}><label>Link title <span>optional</span><input ref={linkLabelInput} value={linkLabel} maxLength={120} onChange={event => setLinkLabel(event.target.value)} placeholder="e.g. Official documentation" /></label><label>URL<input type="url" required value={linkUrl} onChange={event => { setLinkUrl(event.target.value); setLinkError('') }} placeholder="https://…" /></label><button className="button primary" type="submit"><Plus size={16} /> Add link</button></form>}
      {(imageError || linkError) && <p className="request-error" role="alert">{imageError || linkError}</p>}
      {contentAction === 'image' && <p className="note-image-help">JPEG, PNG, or WebP · up to 8 MB each · private to your account</p>}
      {(resourceFilter === 'all' || resourceFilter === 'images') && images.length > 0 && <><h2 className="note-resource-section-title">Images <span>{images.length} / 10</span></h2><ul className="note-image-list">{images.map(image => <li key={image.id}><img src={image.url} alt={image.alt_text || image.filename} /><div><strong>{image.filename}</strong><small>{image.alt_text || `${(image.size_bytes / 1024 / 1024).toFixed(2)} MB`}</small></div><button className="icon-button" type="button" aria-label={`Remove ${image.filename}`} disabled={imageBusy} onClick={() => void removeImage(image)}><Trash2 size={16} /></button></li>)}</ul></>}
      {(resourceFilter === 'all' || resourceFilter === 'links') && links.length > 0 && <><h2 className="note-resource-section-title">Links <span>{links.length} / 30</span></h2><ul className="note-link-list">{links.map((link, index) => <li key={`${link.url}-${index}`}><span className="note-link-icon"><ExternalLink size={18} /></span><div><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label || new URL(link.url).hostname} <ExternalLink size={13} /></a><small>{linkKind(link.url)} · {new URL(link.url).hostname}</small></div><button className="icon-button" aria-label={`Remove ${link.label || link.url}`} onClick={() => setLinks(current => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></li>)}</ul></>}
      {((resourceFilter === 'all' && images.length + links.length === 0) || (resourceFilter === 'images' && images.length === 0) || (resourceFilter === 'links' && links.length === 0)) && <p className="note-resource-empty">{resourceFilter === 'images' ? 'No images attached yet.' : resourceFilter === 'links' ? 'No learning links saved yet.' : 'Your resources will appear here as you add them.'}</p>}
    </section>
    {blocker.state === 'blocked' && <div className="note-leave-overlay" role="dialog" aria-modal="true" aria-labelledby="leave-title"><div className="note-leave-dialog"><h2 id="leave-title">Leave without saving?</h2><p>Your latest changes will be lost.</p><div><button className="button secondary" onClick={() => blocker.reset()}>Keep editing</button><button className="button primary" onClick={() => blocker.proceed()}>Discard changes</button></div></div></div>}
  </div>
}
