import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Bookmark, Check, ChevronDown, ChevronRight, Circle, Clock3, Compass, LayoutGrid, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Sprout, X } from 'lucide-react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import { PathCard, PathActions } from './components/PathCard'
import { PathDialog, type EditorState } from './components/PathDialog'
import { PathIcon } from './components/PathIcon'
import { createDemoPath, initialPaths } from './services/demoPaths'
import { pathProgress, pathStatus, type LearningPath, type PathInput } from './types'

type Filter = 'all' | 'active' | 'completed' | 'not-started'
const filters: { id: Filter; label: string }[] = [{ id: 'all', label: 'All paths' }, { id: 'active', label: 'In progress' }, { id: 'not-started', label: 'Not started' }, { id: 'completed', label: 'Completed' }]

function Brand() { return <Link to="/" className="brand" aria-label="StudyForge home"><span className="brand-mark"><Bookmark size={21} strokeWidth={1.7} /></span><span>Study<span className="brand-light">Forge</span><span className="brand-period">.</span></span></Link> }

export default function App() {
  const [paths, setPaths] = useState(initialPaths)
  const [editor, setEditor] = useState<EditorState>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [toast, setToast] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => { setMobileOpen(false) }, [location.pathname])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer) }, [toast])
  const edit = (path: LearningPath) => setEditor({ mode: 'edit', path })
  const remove = (path: LearningPath) => setEditor({ mode: 'delete', path })
  function save(input: PathInput, id?: string) {
    setPaths(previous => id ? previous.map(path => path.id === id ? { ...path, ...input } : path) : [createDemoPath(input), ...previous])
    setEditor(null)
    setToast(id ? 'Learning path updated.' : 'Your new learning path is ready.')
  }
  function deletePath(id: string) {
    setPaths(previous => previous.filter(path => path.id !== id))
    setEditor(null)
    if (location.pathname === `/paths/${id}`) navigate('/')
    setToast('Learning path deleted from this demo.')
  }
  function sidebar() {
    return <><div className="sidebar-brand"><Brand /></div><div className="workspace-label">PERSONAL WORKSPACE</div>
      <nav aria-label="Main navigation"><NavLink to="/" end className="nav-item"><LayoutGrid size={18} /><span>Learning paths</span><span className="nav-count">{paths.length}</span></NavLink></nav>
      <div className="sidebar-section-label"><span>YOUR PATHS</span><button className="icon-button" aria-label="Create learning path" onClick={() => { setMobileOpen(false); setEditor({ mode: 'create' }) }}><Plus size={16} /></button></div>
      <nav aria-label="Your learning paths" className="path-navigation">{paths.map(path => <NavLink key={path.id} to={`/paths/${path.id}`} className="side-path"><span className={`side-dot ${path.color}`} /><span>{path.title}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Sprout size={23} strokeWidth={1.5} /><p>A little progress,<br /><strong>every day.</strong></p><span>Good things take practice.</span></div><div className="workspace-profile"><span className="profile-icon"><BookOpen size={17} /></span><div><strong>Personal workspace</strong><span>A space to make your own</span></div></div></div></>
  }
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar">{sidebar()}</aside>
    <div className="main-shell">
      <header className="topbar"><div className="topbar-left"><button className="icon-button desktop-collapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button><span className="topbar-breadcrumb">Workspace <ChevronRight size={13} /> <span>Learning paths</span></span></div><span className="local-badge"><span /> Personal edition</span></header>
      <main id="main-content" tabIndex={-1}>
        <Routes><Route path="/" element={<Dashboard paths={paths} onCreate={() => setEditor({ mode: 'create' })} onEdit={edit} onDelete={remove} />} /><Route path="/paths/:pathId" element={<PathPreview paths={paths} onEdit={edit} onDelete={remove} />} /><Route path="*" element={<NotFound />} /></Routes>
      </main>
      <footer className="page-footer"><span>Thoughtful learning. Lasting understanding.</span><span>StudyForge <span className="footer-dot">·</span> Your learning, connected.</span></footer>
    </div>
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="mobile-sidebar"><Dialog.Title className="sr-only">Workspace navigation</Dialog.Title><Dialog.Description className="sr-only">Open a learning path or return to the dashboard.</Dialog.Description><Dialog.Close asChild><button className="icon-button mobile-close" aria-label="Close navigation"><X size={20} /></button></Dialog.Close>{sidebar()}</Dialog.Content></Dialog.Portal></Dialog.Root>
    <PathDialog state={editor} onClose={() => setEditor(null)} onSave={save} onDelete={deletePath} />
    <div className="toast-region" role="status" aria-live="polite">{toast && <div className="toast"><span className="toast-check"><Check size={15} /></span>{toast}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}</div>
  </div>
}

function Dashboard({ paths, onCreate, onEdit, onDelete }: { paths: LearningPath[]; onCreate: () => void; onEdit: (path: LearningPath) => void; onDelete: (path: LearningPath) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState('newest')
  const completed = paths.reduce((sum, path) => sum + pathProgress(path).completed, 0)
  const total = paths.reduce((sum, path) => sum + path.topics.length, 0)
  const active = paths.filter(path => pathStatus(path) === 'active').length
  const featured = paths.find(path => pathStatus(path) === 'active')
  const visible = useMemo(() => paths.filter(path => (filter === 'all' || pathStatus(path) === filter) && `${path.title} ${path.description}`.toLowerCase().includes(query.toLowerCase().trim())).sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'progress' ? pathProgress(b).percent - pathProgress(a).percent : b.createdAt - a.createdAt), [paths, filter, query, sort])
  return <div className="page dashboard">
    <div className="page-heading"><div><div className="eyebrow"><span /> YOUR LEARNING, INTENTIONALLY.</div><h1>A little more understanding.</h1><p>Make space for curiosity. Build knowledge that stays with you.</p></div><button className="button primary" data-primary-action onClick={onCreate}><Plus size={18} /> New learning path</button></div>
    <p className="preview-caption"><span>DEMO WORKSPACE</span> Sample data · Changes reset on refresh.</p>
    <div className="overview-grid"><section className="overview-card" aria-label="Learning overview"><div className="overview-title"><span className="eyebrow">THE BIG PICTURE</span><Compass size={18} strokeWidth={1.5} /></div><div className="stats"><div><strong>{paths.length.toString().padStart(2, '0')}</strong><span>Learning paths</span></div><div><strong>{active.toString().padStart(2, '0')}</strong><span>In progress</span></div><div><strong>{completed.toString().padStart(2, '0')}<small> / {total}</small></strong><span>Topics completed</span></div></div><div className="overview-foot"><span className="tiny-line" /><span>One concept at a time. It all adds up.</span></div></section>
      <section className="continue-card"><div className="continue-copy"><span className="eyebrow">{featured ? 'KEEP YOUR MOMENTUM' : 'ROOM TO GROW'}</span><h2>{featured ? featured.title : 'Your next chapter starts here.'}</h2><p>{featured ? `Up next: ${featured.topics.find(topic => topic.status !== 'COMPLETED')?.title}` : 'Choose a subject and give your curiosity a direction.'}</p>{featured ? <Link to={`/paths/${featured.id}`} className="continue-link">Continue learning <ArrowRight size={16} /></Link> : <button className="continue-link" onClick={onCreate}>Create a learning path <ArrowRight size={16} /></button>}</div><div className="book-art" aria-hidden="true"><div className="book book-back" /><div className="book book-mid" /><div className="book book-front"><span className="book-line" /><span className="book-line short" /><Bookmark size={19} strokeWidth={1.2} /><span className="book-label">A WORK<br />IN PROGRESS</span></div></div></section>
    </div>
    <section className="library" aria-labelledby="library-title"><div className="library-heading"><div><h2 id="library-title">Your learning paths <span>{paths.length}</span></h2><p>A home for everything you want to understand.</p></div><label className="search-field"><Search size={17} /><span className="sr-only">Search learning paths</span><input type="search" placeholder="Find a learning path…" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
      <div className="library-toolbar"><div className="filter-tabs" role="group" aria-label="Filter learning paths">{filters.map(item => <button key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? 'selected' : ''} onClick={() => setFilter(item.id)}>{item.label}{item.id === 'all' && <span>{paths.length}</span>}</button>)}</div><label className="sort-control"><span>Sort:</span><select aria-label="Sort learning paths" value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="progress">Most progress</option></select><ChevronDown size={14} aria-hidden="true" /></label></div>
      {visible.length ? <div className="path-grid">{visible.map(path => <PathCard key={path.id} path={path} onEdit={onEdit} onDelete={onDelete} />)}<button className="new-path-card" onClick={onCreate}><span><Plus size={22} /></span><strong>Follow your curiosity</strong><p>Start a new learning path</p><ArrowUpRight size={17} className="new-card-arrow" /></button></div> : <div className="empty-state"><span className="empty-icon">{paths.length ? <Search size={25} /> : <Sprout size={27} />}</span><h3>{paths.length ? 'No paths found here' : 'Every journey starts with a subject.'}</h3><p>{paths.length ? 'Try a different search or explore another status.' : 'Create your first learning path, then build it one topic at a time.'}</p><button className="button secondary" onClick={paths.length ? () => { setQuery(''); setFilter('all') } : onCreate}>{paths.length ? 'Clear filters' : 'Create your first path'}</button></div>}
      <div className="demo-notice"><span className="demo-pill">INTERACTIVE PREVIEW</span><p>Explore with sample data. Changes stay in this tab and reset on refresh.</p></div>
    </section>
  </div>
}

function PathPreview({ paths, onEdit, onDelete }: { paths: LearningPath[]; onEdit: (path: LearningPath) => void; onDelete: (path: LearningPath) => void }) {
  const { pathId } = useParams()
  const path = paths.find(item => item.id === pathId)
  if (!path) return <NotFound />
  const progress = pathProgress(path)
  return <div className="page detail-page"><Link className="back-link" to="/"><ArrowLeft size={16} /> All learning paths</Link><div className="detail-heading"><PathIcon path={path} /><div><span className="eyebrow">LEARNING PATH</span><h1>{path.title}</h1><p>{path.description || 'Your next subject starts here.'}</p></div><PathActions path={path} onEdit={onEdit} onDelete={onDelete} /></div><div className="preview-banner"><BookOpen size={19} /><p><strong>A first look at your learning path.</strong> Topic management and notes are coming in the next frontend stage. This preview uses temporary data.</p></div><div className="detail-section-heading"><h2>Topics <span>{progress.total}</span></h2><span>{progress.completed} completed · {progress.percent}%</span></div>{path.topics.length ? <div className="topic-list">{path.topics.map((topic, index) => <div className="topic-row" key={topic.id}><span className="topic-number">{String(index + 1).padStart(2, '0')}</span><span className="topic-title">{topic.title}</span><span className={`status-label ${topic.status === 'COMPLETED' ? 'completed' : topic.status === 'IN_PROGRESS' ? 'active' : 'not-started'}`}>{topic.status === 'COMPLETED' ? <Check size={14} /> : topic.status === 'IN_PROGRESS' ? <Clock3 size={14} /> : <Circle size={12} />}{topic.status === 'COMPLETED' ? 'Completed' : topic.status === 'IN_PROGRESS' ? 'In progress' : 'Not started'}</span></div>)}</div> : <div className="empty-state"><span className="empty-icon"><BookOpen size={25} /></span><h3>A fresh page for your ideas.</h3><p>Your path is ready. Adding topics will be available in the next stage.</p></div>}<button className="button secondary detail-edit" data-primary-action onClick={() => onEdit(path)}>Edit learning path</button></div>
}

function NotFound() { return <div className="page empty-state not-found"><span className="empty-icon"><Compass size={28} /></span><h1>This page wandered off.</h1><p>The learning path may have been deleted, or the address is incorrect.</p><Link className="button primary" to="/">Back to learning paths <ArrowRight size={16} /></Link></div> }
