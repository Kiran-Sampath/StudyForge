import { useEffect, useRef, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, Layers3, Trash2, X } from 'lucide-react'
import type { LearningPath, PathInput } from '../types'

export type EditorState = { mode: 'create' } | { mode: 'edit'; path: LearningPath } | { mode: 'delete'; path: LearningPath } | null

export function PathDialog({ state, onClose, onSave, onDelete }: { state: EditorState; onClose: () => void; onSave: (input: PathInput, id?: string) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setTitle(state && state.mode !== 'create' ? state.path.title : '')
    setDescription(state && state.mode !== 'create' ? state.path.description : '')
    setError('')
  }, [state])
  const deleting = state?.mode === 'delete'
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) { setError('Give your learning path a title.'); titleRef.current?.focus(); return }
    onSave({ title: title.trim(), description: description.trim() }, state?.mode === 'edit' ? state.path.id : undefined)
  }
  return <Dialog.Root open={state !== null} onOpenChange={open => { if (!open) onClose() }}>
    <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content" onOpenAutoFocus={event => {
      if (!deleting) { event.preventDefault(); titleRef.current?.focus() }
    }} onCloseAutoFocus={event => {
      // These dialogs can be opened from a menu that unmounts on selection.
      event.preventDefault()
      document.querySelector<HTMLElement>('[data-primary-action]')?.focus()
    }}>
      <Dialog.Close asChild><button className="icon-button dialog-close" aria-label="Close dialog"><X size={19} /></button></Dialog.Close>
      <span className={`dialog-symbol ${deleting ? 'delete-symbol' : ''}`}>{deleting ? <Trash2 size={24} /> : <Layers3 size={24} />}</span>
      <Dialog.Title>{deleting ? 'Delete learning path?' : state?.mode === 'edit' ? 'Refine your learning path' : 'What will you learn next?'}</Dialog.Title>
      <Dialog.Description>{deleting ? `“${state.path.title}” and its ${state.path.topics.length} topics will be removed from this demo. Any associated notes would also be deleted.` : 'Give your subject a home. You can shape the details as you go.'}</Dialog.Description>
      {deleting ? <div className="dialog-actions"><Dialog.Close asChild><button className="button secondary">Keep learning path</button></Dialog.Close><button className="button destructive" onClick={() => onDelete(state.path.id)}>Delete path</button></div> :
        <form onSubmit={submit} noValidate>
          <label className="field-label" htmlFor="path-title">Title <span>Required</span></label>
          <input ref={titleRef} id="path-title" className={`text-input ${error ? 'invalid' : ''}`} autoComplete="off" maxLength={200} placeholder="e.g. Java Backend Development" value={title} onChange={event => { setTitle(event.target.value); setError('') }} aria-invalid={Boolean(error)} aria-describedby={error ? 'title-error' : undefined} />
          {error && <p id="title-error" className="field-error" role="alert">{error}</p>}
          <label className="field-label" htmlFor="path-description">Description <span>Optional</span></label>
          <textarea id="path-description" className="text-input" placeholder="What would you like to understand or build?" rows={3} maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} />
          <p className="form-note">Demo workspace · Changes reset when you refresh.</p>
          <div className="dialog-actions"><Dialog.Close asChild><button type="button" className="button secondary">Cancel</button></Dialog.Close><button className="button primary" type="submit">{state?.mode === 'edit' ? 'Save changes' : 'Create learning path'}<ArrowRight size={16} /></button></div>
        </form>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}
