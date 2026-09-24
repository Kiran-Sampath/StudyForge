import { useEffect, useRef, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, BookOpen, Trash2, X } from 'lucide-react'
import type { Topic, TopicInput } from '../types'

export type TopicEditor = { mode: 'create' } | { mode: 'edit'; topic: Topic } | { mode: 'delete'; topic: Topic } | null

export function TopicDialog({ state, busy, error, onClose, onSave, onDelete }: {
  state: TopicEditor
  busy: boolean
  error: string
  onClose: () => void
  onSave: (input: TopicInput, id?: number) => void
  onDelete: (id: number) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [validation, setValidation] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setTitle(state && state.mode !== 'create' ? state.topic.title : '')
    setDescription(state && state.mode !== 'create' ? state.topic.description ?? '' : '')
    setValidation('')
  }, [state])
  const deleting = state?.mode === 'delete'
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) { setValidation('Give your topic a title.'); titleRef.current?.focus(); return }
    onSave({ title: title.trim(), description: description.trim() || null }, state?.mode === 'edit' ? state.topic.id : undefined)
  }
  return <Dialog.Root open={state !== null} onOpenChange={open => { if (!open && !busy) onClose() }}>
    <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content" onOpenAutoFocus={event => { if (!deleting) { event.preventDefault(); titleRef.current?.focus() } }}>
      <Dialog.Close asChild><button className="icon-button dialog-close" aria-label="Close dialog" disabled={busy}><X size={19} /></button></Dialog.Close>
      <span className={`dialog-symbol ${deleting ? 'delete-symbol' : ''}`}>{deleting ? <Trash2 size={23} /> : <BookOpen size={23} />}</span>
      <Dialog.Title>{deleting ? 'Delete topic?' : state?.mode === 'edit' ? 'Edit topic' : 'Add a topic'}</Dialog.Title>
      <Dialog.Description>{deleting ? `“${state.topic.title}” and all its notes will be permanently deleted.` : 'Build your learning path one clear subject at a time.'}</Dialog.Description>
      {error && <p className="request-error" role="alert">{error}</p>}
      {deleting ? <div className="dialog-actions"><Dialog.Close asChild><button className="button secondary" disabled={busy}>Keep topic</button></Dialog.Close><button className="button destructive" disabled={busy} onClick={() => onDelete(state.topic.id)}>{busy ? 'Deleting…' : 'Delete topic'}</button></div> :
        <form onSubmit={submit} noValidate>
          <label className="field-label" htmlFor="topic-title">Title <span>Required</span></label>
          <input ref={titleRef} disabled={busy} id="topic-title" className={`text-input ${validation ? 'invalid' : ''}`} maxLength={200} placeholder="e.g. Multithreading" value={title} onChange={event => { setTitle(event.target.value); setValidation('') }} aria-invalid={Boolean(validation)} aria-describedby={validation ? 'topic-title-error' : undefined} />
          {validation && <p id="topic-title-error" className="field-error" role="alert">{validation}</p>}
          <label className="field-label" htmlFor="topic-description">Description <span>Optional</span></label>
          <textarea disabled={busy} id="topic-description" className="text-input" rows={3} maxLength={1000} placeholder="What belongs in this topic?" value={description} onChange={event => setDescription(event.target.value)} />
          <div className="dialog-actions"><Dialog.Close asChild><button type="button" className="button secondary" disabled={busy}>Cancel</button></Dialog.Close><button className="button primary" disabled={busy} type="submit">{busy ? 'Saving…' : state?.mode === 'edit' ? 'Save changes' : 'Add topic'}<ArrowRight size={16} /></button></div>
        </form>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}
