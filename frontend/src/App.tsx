import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, BookOpen, Bookmark, Check, ChevronDown, ChevronRight, Compass, FileText, LayoutGrid, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Sparkles, Sprout, X } from 'lucide-react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import { PathCard } from './components/PathCard'
import { PathDialog, type EditorState } from './components/PathDialog'
import { TopicWorkspace } from './components/TopicWorkspace'
import { NoteEditor } from './components/NoteEditor'
import { AuthPage } from './components/AuthPage'
import { useAuth } from './auth/AuthProvider'
import * as pathsApi from './services/paths'
import * as topicsApi from './services/topics'
import * as notesApi from './services/notes'
import { seedDemoWorkspace } from './services/demoData'
import { pathProgress, pathStatus, type LearningPath, type Note, type PathInput, type Topic } from './types'

type Filter = 'all' | 'active' | 'completed' | 'not-started'
const filters: { id: Filter; label: string }[] = [{ id: 'all', label: 'All paths' }, { id: 'active', label: 'In progress' }, { id: 'not-started', label: 'Not started' }, { id: 'completed', label: 'Completed' }]

function relativeTime(timestamp: number) {
  const elapsed = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Brand() { return <Link to="/" className="brand" aria-label="StudyForge home"><span className="brand-mark"><Bookmark size={21} strokeWidth={1.7} /></span><span>Study<span className="brand-light">Forge</span><span className="brand-period">.</span></span></Link> }

export default function App() {
  const { session, user, loading: authLoading, signOut } = useAuth()
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [activity, setActivity] = useState<{ topics: Topic[]; notes: Note[] }>({ topics: [], notes: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [saving, setSaving] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)
  const [demoProgress, setDemoProgress] = useState('')
  const [demoError, setDemoError] = useState('')
  const [mutationError, setMutationError] = useState('')
  useEffect(() => {
    if (authLoading) return
    if (!session) { setPaths([]); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    pathsApi.listPaths(controller.signal).then(items => {
      if (!controller.signal.aborted) { setPaths(items); setLoading(false) }
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Could not load learning paths.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload, session?.access_token, authLoading])
  useEffect(() => {
    if (authLoading || !session || paths.length === 0) { setActivity({ topics: [], notes: [] }); return }
    const controller = new AbortController()
    Promise.all(paths.map(async path => {
      const topics = await topicsApi.listTopics(path.id, controller.signal)
      const notes = (await Promise.all(topics.map(topic => notesApi.listNotes(topic.id, controller.signal)))).flat()
      return { topics, notes }
    })).then(groups => {
      if (!controller.signal.aborted) setActivity({ topics: groups.flatMap(group => group.topics), notes: groups.flatMap(group => group.notes) })
    }).catch(() => { if (!controller.signal.aborted) setActivity({ topics: [], notes: [] }) })
    return () => controller.abort()
  }, [paths, session?.access_token, authLoading])
  const [editor, setEditor] = useState<EditorState>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [toast, setToast] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => { setMobileOpen(false) }, [location.pathname])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer) }, [toast])
  useEffect(() => setMutationError(''), [editor])
  if (authLoading) return <div className="auth-loading" role="status">Opening your learning space…</div>
  if (!session) return <AuthPage />
  const edit = (path: LearningPath) => setEditor({ mode: 'edit', path })
  const remove = (path: LearningPath) => setEditor({ mode: 'delete', path })
  async function save(input: PathInput, id?: string) {
    if (saving) return
    setSaving(true)
    setMutationError('')
    try {
      const saved = id ? await pathsApi.updatePath(id, input) : await pathsApi.createPath(input)
      setPaths(previous => id ? previous.map(path => path.id === id ? saved : path) : [saved, ...previous])
      setEditor(null)
      setToast(id ? 'Learning path updated.' : 'Your new learning path is ready.')
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Could not save. Please try again.')
    } finally { setSaving(false) }
  }
  async function deletePath(id: string) {
    if (saving) return
    setSaving(true)
    setMutationError('')
    try {
      await pathsApi.deletePath(id)
      setPaths(previous => previous.filter(path => path.id !== id))
      setEditor(null)
      if (location.pathname === `/paths/${id}`) navigate('/')
      setToast('Learning path deleted.')
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Could not delete. Please try again.')
    } finally { setSaving(false) }
  }
  function refreshPath(id: string) {
    pathsApi.getPath(id).then(updated => {
      setPaths(previous => previous.map(path => path.id === id ? updated : path))
    }).catch(() => setToast('Topic saved. Refresh to update the path progress.'))
  }
  async function addDemoData() {
    if (demoBusy) return
    setDemoBusy(true)
    setDemoError('')
    try {
      await seedDemoWorkspace(setDemoProgress)
      setPaths(await pathsApi.listPaths())
      setToast('Sample workspace added to your learning paths.')
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : 'Could not finish adding sample data.')
    } finally { setDemoBusy(false) }
  }
  function sidebar() {
    return <><div className="sidebar-brand"><Brand /></div><div className="workspace-label">PERSONAL WORKSPACE</div>
      <nav aria-label="Main navigation"><NavLink to="/" end className="nav-item"><LayoutGrid size={18} /><span>Learning paths</span><span className="nav-count">{paths.length}</span></NavLink></nav>
      <div className="sidebar-section-label"><span>YOUR PATHS</span></div>
      <nav aria-label="Your learning paths" className="path-navigation">{[...paths].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 7).map(path => <NavLink key={path.id} to={`/paths/${path.id}`} className="side-path"><span className={`side-dot ${path.color}`} /><span>{path.title}</span></NavLink>)}{paths.length > 7 && <NavLink to="/" className="side-path side-all-paths">View all {paths.length} paths <ArrowRight size={13} /></NavLink>}</nav>
      <div className="sidebar-bottom"><div className="workspace-profile"><span className="profile-icon"><BookOpen size={17} /></span><div><strong>Personal workspace</strong><span>A space to make your own</span></div></div></div></>
  }
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar">{sidebar()}</aside>
    <div className="main-shell">
      <header className="topbar"><div className="topbar-left"><button className="icon-button desktop-collapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button><span className="topbar-breadcrumb">Workspace <ChevronRight size={13} /> <span>Learning paths</span></span></div><div className="topbar-account"><span className="local-badge"><span /> {user?.email}</span><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}><LogOut size={16} /></button></div></header>
      <main id="main-content" tabIndex={-1}>
        {loading ? <div className="page loading-state" role="status" aria-live="polite"><p>Loading your learning pathsâ€¦</p><div className="path-grid" aria-hidden="true">{[1, 2, 3].map(id => <div className="skeleton-card" key={id} />)}</div></div> : loadError ? <div className="page empty-state"><h1>Let's reconnect your workspace.</h1><p role="alert">{loadError}</p><button className="button primary" onClick={() => setReload(value => value + 1)}>Try again</button></div> : <Routes><Route path="/" element={<Dashboard paths={paths} activity={activity} onCreate={() => setEditor({ mode: 'create' })} onEdit={edit} onDelete={remove} onAddDemo={addDemoData} demoBusy={demoBusy} demoProgress={demoProgress} demoError={demoError} />} /><Route path="/auth/callback" element={<Navigate to="/" replace />} /><Route path="/paths/:pathId" element={<PathPage paths={paths} onEdit={edit} onDelete={remove} onPathChanged={refreshPath} onNotify={setToast} />} /><Route path="/paths/:pathId/topics/:topicId" element={<PathPage paths={paths} onEdit={edit} onDelete={remove} onPathChanged={refreshPath} onNotify={setToast} />} /><Route path="/paths/:pathId/topics/:topicId/notes/:noteId" element={<NoteEditor />} /><Route path="*" element={<NotFound />} /></Routes>}
      </main>
      <footer className="page-footer"><span>Thoughtful learning. Lasting understanding.</span><span>StudyForge <span className="footer-dot">Â·</span> Your learning, connected.</span></footer>
    </div>
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="mobile-sidebar"><Dialog.Title className="sr-only">Workspace navigation</Dialog.Title><Dialog.Description className="sr-only">Open a learning path or return to the dashboard.</Dialog.Description><Dialog.Close asChild><button className="icon-button mobile-close" aria-label="Close navigation"><X size={20} /></button></Dialog.Close>{sidebar()}</Dialog.Content></Dialog.Portal></Dialog.Root>
    <PathDialog state={editor} busy={saving} serverError={mutationError} onClose={() => { if (!saving) setEditor(null) }} onSave={save} onDelete={deletePath} />
    <div className="toast-region" role="status" aria-live="polite">{toast && <div className="toast"><span className="toast-check"><Check size={15} /></span>{toast}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}</div>
  </div>
}

function Dashboard({ paths, activity, onCreate, onEdit, onDelete, onAddDemo, demoBusy, demoProgress, demoError }: { paths: LearningPath[]; activity: { topics: Topic[]; notes: Note[] }; onCreate: () => void; onEdit: (path: LearningPath) => void; onDelete: (path: LearningPath) => void; onAddDemo: () => void; demoBusy: boolean; demoProgress: string; demoError: string }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState('newest')
  const completed = paths.reduce((sum, path) => sum + pathProgress(path).completed, 0)
  const total = paths.reduce((sum, path) => sum + path.topicCount, 0)
  const active = paths.filter(path => pathStatus(path) === 'active').length
  const pathById = new Map(paths.map(path => [Number(path.id), path]))
  const topicById = new Map(activity.topics.map(topic => [topic.id, topic]))
  const recents = [
    ...activity.notes.map(note => ({ kind: 'NOTE' as const, title: note.title, timestamp: Date.parse(note.updated_at), path: pathById.get(topicById.get(note.topic_id)?.learning_path_id ?? -1), topic: topicById.get(note.topic_id), note })),
    ...activity.topics.map(topic => ({ kind: 'TOPIC' as const, title: topic.title, timestamp: Date.parse(topic.updated_at), path: pathById.get(topic.learning_path_id), topic, note: undefined })),
  ].filter(item => item.path && Number.isFinite(item.timestamp)).sort((a, b) => b.timestamp - a.timestamp).slice(0, 3)
  const mostRecent = recents[0]
  const featured = mostRecent?.path ?? [...paths].filter(path => pathStatus(path) === 'active').sort((a,b) => b.updatedAt-a.updatedAt)[0]
  const continueTo = mostRecent?.note ? `/paths/${mostRecent.path!.id}/topics/${mostRecent.topic!.id}/notes/${mostRecent.note.id}` : mostRecent?.topic ? `/paths/${mostRecent.path!.id}/topics/${mostRecent.topic.id}` : featured ? `/paths/${featured.id}` : null
  const visible = useMemo(() => paths.filter(path => (filter === 'all' || pathStatus(path) === filter) && `${path.title} ${path.description}`.toLowerCase().includes(query.toLowerCase().trim())).sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'progress' ? pathProgress(b).percent - pathProgress(a).percent : b.updatedAt - a.updatedAt), [paths, filter, query, sort])
  return <div className="page dashboard">
    <div className="page-heading"><div><div className="eyebrow"><span /> YOUR LEARNING, INTENTIONALLY.</div><h1>A little more understanding.</h1><p>Make space for curiosity. Build knowledge that stays with you.</p></div><div className="dashboard-actions"><button className="button secondary" onClick={onAddDemo} disabled={demoBusy}><Sparkles size={17} />{demoBusy ? 'Adding sample data…' : 'Add sample data'}</button><button className="button primary" data-primary-action onClick={onCreate}><Plus size={18} /> New learning path</button></div></div>
    {demoBusy && <p className="demo-progress" role="status">{demoProgress || 'Preparing your sample workspace…'}</p>}
    {demoError && <p className="request-error" role="alert">{demoError} Sample data can be retried safely.</p>}
    <div className="overview-grid"><section className="overview-card" aria-label="Learning overview"><div className="overview-title"><span className="eyebrow">THE BIG PICTURE</span><Compass size={18} strokeWidth={1.5} /></div><div className="stats"><div><strong>{paths.length}</strong><span>Learning paths</span></div><div><strong>{active}</strong><span>In progress</span></div><div><strong>{completed}<small> / {total}</small></strong><span>Topics completed</span></div></div></section>
      <section className="continue-card"><div className="continue-copy"><span className="eyebrow">{featured ? 'KEEP YOUR MOMENTUM' : 'ROOM TO GROW'}</span><h2>{featured ? featured.title : 'Your next chapter starts here.'}</h2><p>{mostRecent ? <>{mostRecent.topic!.title}{mostRecent.note && <> <span aria-hidden="true">›</span> {mostRecent.note.title}</>}</> : featured ? `Your progress: ${featured.completedTopicCount} of ${featured.topicCount} topics completed` : 'Choose a subject and give your curiosity a direction.'}</p>{mostRecent && <span className="continue-recency">Last worked on {relativeTime(mostRecent.timestamp)}</span>}{continueTo ? <Link to={continueTo} className="continue-link">Continue learning <ArrowRight size={16} /></Link> : <button className="continue-link" onClick={onCreate}>Create a learning path <ArrowRight size={16} /></button>}</div><div className="book-art" aria-hidden="true"><div className="book book-back" /><div className="book book-mid" /><div className="book book-front"><span className="book-line" /><span className="book-line short" /><Bookmark size={19} strokeWidth={1.2} /><span className="book-label">A WORK<br />IN PROGRESS</span></div></div></section>
    </div>
    {recents.length > 0 && <section className="recent-section" aria-labelledby="recent-title"><div className="recent-heading"><h2 id="recent-title">Recently worked on</h2><span>Based on recent updates</span></div><div className="recent-grid">{recents.map((item, index) => <Link key={`${item.kind}-${item.kind === 'NOTE' ? item.note!.id : item.topic!.id}`} className="recent-card" to={item.kind === 'NOTE' ? `/paths/${item.path!.id}/topics/${item.topic!.id}/notes/${item.note!.id}` : `/paths/${item.path!.id}/topics/${item.topic!.id}`}><span className="recent-type">{item.kind === 'NOTE' ? <FileText size={13} /> : <BookOpen size={13} />}{item.kind}</span><strong>{item.title}</strong><span className="recent-path">{item.path!.title}</span><time dateTime={new Date(item.timestamp).toISOString()}>{relativeTime(item.timestamp)}</time></Link>)}</div></section>}
    <section className="library" aria-labelledby="library-title"><div className="library-heading"><div><h2 id="library-title">Your learning paths <span>{paths.length}</span></h2><p>A home for everything you want to understand.</p></div><label className="search-field"><Search size={17} /><span className="sr-only">Search learning paths</span><input type="search" placeholder="Find a learning pathâ€¦" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
      <div className="library-toolbar"><div className="filter-tabs" role="group" aria-label="Filter learning paths">{filters.map(item => { const count = item.id === 'all' ? paths.length : paths.filter(path => pathStatus(path) === item.id).length; return <button key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? 'selected' : ''} onClick={() => setFilter(item.id)}>{item.label}<span>{count}</span></button> })}</div><label className="sort-control"><span>Sort:</span><select aria-label="Sort learning paths" value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Recently updated</option><option value="name">Name Aâ€“Z</option><option value="progress">Most progress</option></select><ChevronDown size={14} aria-hidden="true" /></label></div>
      {visible.length ? <div className="path-grid">{visible.map(path => <PathCard key={path.id} path={path} onEdit={onEdit} onDelete={onDelete} />)}</div> : <div className="empty-state"><span className="empty-icon">{paths.length ? <Search size={25} /> : <Sprout size={27} />}</span><h3>{paths.length ? 'No learning paths match these filters.' : 'Every journey starts with a subject.'}</h3><p>{paths.length ? 'Try a different search or explore another status.' : 'Create your first learning path, then build it one topic at a time.'}</p><button className="button secondary" onClick={paths.length ? () => { setQuery(''); setFilter('all') } : onCreate}>{paths.length ? 'Clear filters' : 'Create your first path'}</button></div>}
    </section>
  </div>
}

function PathPage({ paths, onEdit, onDelete, onPathChanged, onNotify }: { paths: LearningPath[]; onEdit: (path: LearningPath) => void; onDelete: (path: LearningPath) => void; onPathChanged: (id: string) => void; onNotify: (message: string) => void }) {
  const { pathId } = useParams()
  const path = paths.find(item => item.id === pathId)
  if (!path) return <NotFound />
  return <TopicWorkspace path={path} onEditPath={onEdit} onDeletePath={onDelete} onPathChanged={onPathChanged} onNotify={onNotify} />
}

function NotFound() { return <div className="page empty-state not-found"><span className="empty-icon"><Compass size={28} /></span><h1>This page wandered off.</h1><p>The learning path may have been deleted, or the address is incorrect.</p><Link className="button primary" to="/">Back to learning paths <ArrowRight size={16} /></Link></div> }
