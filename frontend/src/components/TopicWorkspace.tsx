import { useEffect, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Circle, Clock3, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import type { LearningPath, Topic, TopicInput, TopicStatus } from '../types'
import { pathProgress } from '../types'
import * as api from '../services/topics'
import { PathActions } from './PathCard'
import { PathIcon } from './PathIcon'
import { TopicDialog, type TopicEditor } from './TopicDialog'

const statuses: { value: TopicStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
]

export function TopicWorkspace({ path, onEditPath, onDeletePath, onPathChanged, onNotify }: {
  path: LearningPath
  onEditPath: (path: LearningPath) => void
  onDeletePath: (path: LearningPath) => void
  onPathChanged: (id: string) => void
  onNotify: (message: string) => void
}) {
  const { topicId } = useParams()
  const navigate = useNavigate()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [editor, setEditor] = useState<TopicEditor>(null)
  const [busy, setBusy] = useState(false)
  const [busyStatus, setBusyStatus] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    api.listTopics(path.id, controller.signal).then(data => {
      if (!controller.signal.aborted) setTopics(data)
    }).catch(reason => {
      if (!controller.signal.aborted) setLoadError(reason instanceof Error ? reason.message : 'Could not load topics.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [path.id, reload])
  useEffect(() => setError(''), [editor])

  async function save(input: TopicInput, id?: number) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const saved = id ? await api.updateTopic(id, input) : await api.createTopic(path.id, input)
      setTopics(previous => id ? previous.map(item => item.id === id ? saved : item) : [...previous, saved])
      onPathChanged(path.id)
      setEditor(null)
      onNotify(id ? 'Topic updated.' : 'Topic added.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save topic.')
    } finally { setBusy(false) }
  }

  async function remove(id: number) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await api.deleteTopic(id)
      setTopics(previous => previous.filter(item => item.id !== id))
      onPathChanged(path.id)
      setEditor(null)
      if (topicId === String(id)) navigate(`/paths/${path.id}`)
      onNotify('Topic deleted.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete topic.')
    } finally { setBusy(false) }
  }

  async function changeStatus(topic: Topic, status: TopicStatus) {
    if (status === topic.status || busyStatus !== null) return
    setBusyStatus(topic.id)
    setActionError('')
    try {
      const saved = await api.updateTopic(topic.id, { status })
      setTopics(previous => previous.map(item => item.id === topic.id ? saved : item))
      onPathChanged(path.id)
      onNotify('Topic status updated.')
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Could not update topic status.')
    } finally { setBusyStatus(null) }
  }

  const selected = topicId ? topics.find(item => item.id === Number(topicId)) : undefined
  const progress = pathProgress(path)
  const actions = (topic: Topic) => <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild><button className="icon-button topic-actions" aria-label={`Actions for ${topic.title}`}><MoreHorizontal size={19} /></button></DropdownMenu.Trigger>
    <DropdownMenu.Portal><DropdownMenu.Content className="dropdown" sideOffset={6} align="end">
      <DropdownMenu.Item onSelect={() => setEditor({ mode: 'edit', topic })}><Pencil size={15} /> Edit topic</DropdownMenu.Item>
      <DropdownMenu.Separator />
      <DropdownMenu.Item className="danger-text" onSelect={() => setEditor({ mode: 'delete', topic })}><Trash2 size={15} /> Delete topic</DropdownMenu.Item>
    </DropdownMenu.Content></DropdownMenu.Portal>
  </DropdownMenu.Root>
  const statusControl = (topic: Topic) => <label className={`topic-status ${topic.status.toLowerCase().replace('_', '-')}`}>
    <span className="sr-only">Status for {topic.title}</span>
    {topic.status === 'COMPLETED' ? <Check size={14} /> : topic.status === 'IN_PROGRESS' ? <Clock3 size={14} /> : <Circle size={13} />}
    <select aria-label={`Status for ${topic.title}`} value={topic.status} disabled={busyStatus !== null} onChange={event => changeStatus(topic, event.target.value as TopicStatus)}>
      {statuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  </label>

  return <div className="page detail-page">
    <Link className="back-link" to={topicId ? `/paths/${path.id}` : '/'}><ArrowLeft size={16} /> {topicId ? 'All topics' : 'All learning paths'}</Link>
    {loading ? <div className="topic-loading" role="status">Loading topics…</div> : loadError ? <div className="empty-state"><h2>Could not load topics</h2><p role="alert">{loadError}</p><button className="button secondary" onClick={() => setReload(value => value + 1)}>Try again</button></div> : topicId ? selected ? <>
      <div className="topic-detail-heading"><span className="eyebrow">{path.title.toUpperCase()} <ChevronRight size={12} /> TOPIC</span><h1>{selected.title}</h1><p>{selected.description || 'A place to explore this subject in depth.'}</p><div className="topic-detail-controls">{statusControl(selected)}{actions(selected)}</div></div>
      {actionError && <p className="request-error topic-error" role="alert">{actionError}</p>}
      <div className="topic-notes-placeholder"><span className="empty-icon"><BookOpen size={24} /></span><h2>Notes belong here</h2><p>The Markdown note editor is coming in the next milestone. Your topic and its status are already saved.</p></div>
    </> : <div className="empty-state"><h1>Topic not found</h1><p>This topic may have been deleted.</p><Link className="button secondary" to={`/paths/${path.id}`}>Back to topics</Link></div> : <>
      <div className="detail-heading"><PathIcon path={path} /><div><span className="eyebrow">LEARNING PATH</span><h1>{path.title}</h1><p>{path.description || 'Your next subject starts here.'}</p></div><PathActions path={path} onEdit={onEditPath} onDelete={onDeletePath} /></div>
      <div className="detail-section-heading path-summary"><div><h2>Topics <span>{topics.length}</span></h2><p className="topic-progress">{progress.completed} completed · {progress.percent}%</p></div><button className="button primary" data-primary-action onClick={() => setEditor({ mode: 'create' })}><Plus size={16} /> Add topic</button></div>
      {actionError && <p className="request-error topic-error" role="alert">{actionError}</p>}
      {topics.length ? <div className="topic-list">{topics.map((topic, index) => <div className="topic-row" key={topic.id}>
        <span className="topic-number">{String(index + 1).padStart(2, '0')}</span>
        <div className="topic-copy"><Link className="topic-title" to={`/paths/${path.id}/topics/${topic.id}`}>{topic.title}</Link>{topic.description && <p>{topic.description}</p>}</div>
        {statusControl(topic)}{actions(topic)}
      </div>)}</div> : <div className="empty-state"><span className="empty-icon"><BookOpen size={25} /></span><h3>Start with one topic.</h3><p>Break your learning path into subjects you can explore one at a time.</p><button className="button secondary" onClick={() => setEditor({ mode: 'create' })}>Add your first topic</button></div>}
      <button className="button secondary detail-edit" onClick={() => onEditPath(path)}>Edit learning path</button>
    </>}
    <TopicDialog state={editor} busy={busy} error={error} onClose={() => { if (!busy) setEditor(null) }} onSave={save} onDelete={remove} />
  </div>
}
