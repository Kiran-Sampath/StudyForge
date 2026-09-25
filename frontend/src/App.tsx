import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, ArrowUpRight, BookOpen, Bookmark, Check, ChevronDown, ChevronRight, Compass, LayoutGrid, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Sprout, X } from 'lucide-react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import { PathCard } from './components/PathCard'
import { PathDialog, type EditorState } from './components/PathDialog'
import { TopicWorkspace } from './components/TopicWorkspace'
import { NoteEditor } from './components/NoteEditor'
import { AuthPage } from './components/AuthPage'
import { useAuth } from './auth/AuthProvider'
import * as pathsApi from './services/paths'
import { pathProgress, pathStatus, type LearningPath, type PathInput } from './types'

type Filter = 'all' | 'active' | 'completed' | 'not-started'
const filters: { id: Filter; label: string }[] = [{ id: 'all', label: 'All paths' }, { id: 'active', label: 'In progress' }, { id: 'not-started', label: 'Not started' }, { id: 'completed', label: 'Completed' }]

function Brand() { return <Link to="/" className="brand" aria-label="StudyForge home"><span className="brand-mark"><Bookmark size={21} strokeWidth={1.7} /></span><span>Study<span className="brand-light">Forge</span><span className="brand-period">.</span></span></Link> }

export default function App() {
  const { session, user, loading: authLoading, signOut } = useAuth()
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [saving, setSaving] = useState(false)
  const [mutationError, setMutationError] = useState('')
  useEffect(() => {
    if (authLoading) return
    if (!session) { setPaths([]); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    pathsApi.listPaths(controller.signal).then(items => {
      if (!controller.signal.aborted) setPaths(items)
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Could not load learning paths.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload, session?.access_token, authLoading])
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
  function sidebar() {
    return <><div className="sidebar-brand"><Brand /></div><div className="workspace-label">PERSONAL WORKSPACE</div>
      <nav aria-label="Main navigation"><NavLink to="/" end className="nav-item"><LayoutGrid size={18} /><span>Learning paths</span><span className="nav-count">{paths.length}</span></NavLink></nav>
      <div className="sidebar-section-label"><span>YOUR PATHS</span><button className="icon-button" aria-label="Create learning path" disabled={loading || Boolean(loadError)} onClick={() => { setMobileOpen(false); setEditor({ mode: 'create' }) }}><Plus size={16} /></button></div>
      <nav aria-label="Your learning paths" className="path-navigation">{paths.map(path => <NavLink key={path.id} to={`/paths/${path.id}`} className="side-path"><span className={`side-dot ${path.color}`} /><span>{path.title}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Sprout size={23} strokeWidth={1.5} /><p>A little progress,<br /><strong>every day.</strong></p><span>Good things take practice.</span></div><div className="workspace-profile"><span className="profile-icon"><BookOpen size={17} /></span><div><strong>Personal workspace</strong><span>A space to make your own</span></div></div></div></>
  }
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar">{sidebar()}</aside>
    <div className="main-shell">
      <header className="topbar"><div className="topbar-left"><button className="icon-button desktop-collapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button><span className="topbar-breadcrumb">Workspace <ChevronRight size={13} /> <span>Learning paths</span></span></div><div className="topbar-account"><span className="local-badge"><span /> {user?.email}</span><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}><LogOut size={16} /></button></div></header>
      <main id="main-content" tabIndex={-1}>
        {loading ? <div className="page loading-state" role="status" aria-live="polite"><p>Loading your learning pathsâ€¦</p><div className="path-grid" aria-hidden="true">{[1, 2, 3].map(id => <div className="skeleton-card" key={id} />)}</div></div> : loadError ? <div className="page empty-state"><h1>Let's reconnect your workspace.</h1><p role="alert">{loadError}</p><button className="button primary" onClick={() => setReload(value => value + 1)}>Try again</button></div> : <Routes><Route path="/" element={<Dashboard paths={paths} onCreate={() => setEditor({ mode: 'create' })} onEdit={edit} onDelete={remove} />} /><Route path="/paths/:pathId" element={<PathPage paths={paths} onEdit={edit} onDelete={remove} onPathChanged={refreshPath} onNotify={setToast} />} /><Route path="/paths/:pathId/topics/:topicId" element={<PathPage paths={paths} onEdit={edit} onDelete={remove} onPathChanged={refreshPath} onNotify={setToast} />} /><Route path="/paths/:pathId/topics/:topicId/notes/:noteId" element={<NoteEditor />} /><Route path="*" element={<NotFound />} /></Routes>}
      </main>
      <footer className="page-footer"><span>Thoughtful learning. Lasting understanding.</span><span>StudyForge <span className="footer-dot">Â·</span> Your learning, connected.</span></footer>
    </div>
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="mobile-sidebar"><Dialog.Title className="sr-only">Workspace navigation</Dialog.Title><Dialog.Description className="sr-only">Open a learning path or return to the dashboard.</Dialog.Description><Dialog.Close asChild><button className="icon-button mobile-close" aria-label="Close navigation"><X size={20} /></button></Dialog.Close>{sidebar()}</Dialog.Content></Dialog.Portal></Dialog.Root>
    <PathDialog state={editor} busy={saving} serverError={mutationError} onClose={() => { if (!saving) setEditor(null) }} onSave={save} onDelete={deletePath} />
    <div className="toast-region" role="status" aria-live="polite">{toast && <div className="toast"><span className="toast-check"><Check size={15} /></span>{toast}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}</div>
  </div>
}

function Dashboard({ paths, onCreate, onEdit, onDelete }: { paths: LearningPath[]; onCreate: () => void; onEdit: (path: LearningPath) => void; onDelete: (path: LearningPath) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState('newest')
  const completed = paths.reduce((sum, path) => sum + pathProgress(path).completed, 0)
  const total = paths.reduce((sum, path) => sum + path.topicCount, 0)
  const active = paths.filter(path => pathStatus(path) === 'active').length
  const featured = paths.find(path => pathStatus(path) === 'active')
  const visible = useMemo(() => paths.filter(path => (filter === 'all' || pathStatus(path) === filter) && `${path.title} ${path.description}`.toLowerCase().includes(query.toLowerCase().trim())).sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'progress' ? pathProgress(b).percent - pathProgress(a).percent : b.createdAt - a.createdAt), [paths, filter, query, sort])
  return <div className="page dashboard">
    <div className="page-heading"><div><div className="eyebrow"><span /> YOUR LEARNING, INTENTIONALLY.</div><h1>A little more understanding.</h1><p>Make space for curiosity. Build knowledge that stays with you.</p></div><button className="button primary" data-primary-action onClick={onCreate}><Plus size={18} /> New learning path</button></div>
    <div className="overview-grid"><section className="overview-card" aria-label="Learning overview"><div className="overview-title"><span className="eyebrow">THE BIG PICTURE</span><Compass size={18} strokeWidth={1.5} /></div><div className="stats"><div><strong>{paths.length.toString().padStart(2, '0')}</strong><span>Learning paths</span></div><div><strong>{active.toString().padStart(2, '0')}</strong><span>In progress</span></div><div><strong>{completed.toString().padStart(2, '0')}<small> / {total}</small></strong><span>Topics completed</span></div></div><div className="overview-foot"><span className="tiny-line" /><span>One concept at a time. It all adds up.</span></div></section>
      <section className="continue-card"><div className="continue-copy"><span className="eyebrow">{featured ? 'KEEP YOUR MOMENTUM' : 'ROOM TO GROW'}</span><h2>{featured ? featured.title : 'Your next chapter starts here.'}</h2><p>{featured ? `Your progress: ${featured.completedTopicCount} of ${featured.topicCount} topics completed` : 'Choose a subject and give your curiosity a direction.'}</p>{featured ? <Link to={`/paths/${featured.id}`} className="continue-link">Continue learning <ArrowRight size={16} /></Link> : <button className="continue-link" onClick={onCreate}>Create a learning path <ArrowRight size={16} /></button>}</div><div className="book-art" aria-hidden="true"><div className="book book-back" /><div className="book book-mid" /><div className="book book-front"><span className="book-line" /><span className="book-line short" /><Bookmark size={19} strokeWidth={1.2} /><span className="book-label">A WORK<br />IN PROGRESS</span></div></div></section>
    </div>
    <section className="library" aria-labelledby="library-title"><div className="library-heading"><div><h2 id="library-title">Your learning paths <span>{paths.length}</span></h2><p>A home for everything you want to understand.</p></div><label className="search-field"><Search size={17} /><span className="sr-only">Search learning paths</span><input type="search" placeholder="Find a learning pathâ€¦" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
      <div className="library-toolbar"><div className="filter-tabs" role="group" aria-label="Filter learning paths">{filters.map(item => <button key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? 'selected' : ''} onClick={() => setFilter(item.id)}>{item.label}{item.id === 'all' && <span>{paths.length}</span>}</button>)}</div><label className="sort-control"><span>Sort:</span><select aria-label="Sort learning paths" value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Newest first</option><option value="name">Name Aâ€“Z</option><option value="progress">Most progress</option></select><ChevronDown size={14} aria-hidden="true" /></label></div>
      {visible.length ? <div className="path-grid">{visible.map(path => <PathCard key={path.id} path={path} onEdit={onEdit} onDelete={onDelete} />)}<button className="new-path-card" onClick={onCreate}><span><Plus size={22} /></span><strong>Follow your curiosity</strong><p>Start a new learning path</p><ArrowUpRight size={17} className="new-card-arrow" /></button></div> : <div className="empty-state"><span className="empty-icon">{paths.length ? <Search size={25} /> : <Sprout size={27} />}</span><h3>{paths.length ? 'No paths found here' : 'Every journey starts with a subject.'}</h3><p>{paths.length ? 'Try a different search or explore another status.' : 'Create your first learning path, then build it one topic at a time.'}</p><button className="button secondary" onClick={paths.length ? () => { setQuery(''); setFilter('all') } : onCreate}>{paths.length ? 'Clear filters' : 'Create your first path'}</button></div>}
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
