import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { pathProgress, pathStatus, type LearningPath } from '../types'
import { PathIcon } from './PathIcon'

export function PathActions({ path, onEdit, onDelete }: { path: LearningPath; onEdit: (path: LearningPath) => void; onDelete: (path: LearningPath) => void }) {
  return <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild><button className="icon-button path-menu" aria-label={`Actions for ${path.title}`}><MoreHorizontal size={20} /></button></DropdownMenu.Trigger>
    <DropdownMenu.Portal><DropdownMenu.Content className="dropdown" sideOffset={6} align="end">
      <DropdownMenu.Item onSelect={() => onEdit(path)}><Pencil size={15} /> Edit learning path</DropdownMenu.Item>
      <DropdownMenu.Separator />
      <DropdownMenu.Item className="danger-text" onSelect={() => onDelete(path)}><Trash2 size={15} /> Delete learning path</DropdownMenu.Item>
    </DropdownMenu.Content></DropdownMenu.Portal>
  </DropdownMenu.Root>
}

export function PathCard(props: { path: LearningPath; onEdit: (path: LearningPath) => void; onDelete: (path: LearningPath) => void }) {
  const { path } = props
  const navigate = useNavigate()
  const progress = pathProgress(path)
  const status = pathStatus(path)
  return <article className="path-card path-card-clickable" tabIndex={0} onClick={event => { if ((event.target as HTMLElement).closest('button,a,[role="menu"],[data-radix-popper-content-wrapper]')) return; navigate(`/paths/${path.id}`) }} onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/paths/${path.id}`) } }}>
    <div className="card-top"><PathIcon path={path} /><PathActions {...props} /></div>
    <Link className="card-link" to={`/paths/${path.id}`}><h2>{path.title}</h2><span className="sr-only">Open learning path</span></Link>
    <p className="card-description">{path.description || 'A fresh space to explore, connect ideas, and build your understanding.'}</p>
    <div className="card-progress">
      <div className="progress-caption"><span>{progress.completed} of {progress.total} topics completed</span><strong>{progress.percent}%</strong></div>
      <div className="progress-track" role="progressbar" aria-label={`${path.title} completion`} aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress.percent}%` }} /></div>
    </div>
    <div className="card-bottom"><span className={`status-label ${status}`}>{status === 'completed' ? <Check size={13} /> : <span className="status-dot" />}{status === 'completed' ? 'Completed' : status === 'active' ? 'In progress' : 'Not started'}</span></div>
  </article>
}
