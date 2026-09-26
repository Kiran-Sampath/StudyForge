import { useEffect, type RefObject, useRef } from 'react'
import type { NoteImage } from '../types'
import { findInlineMarkdownImages } from './noteImages'

type Part = { text: string } | { markdown: string; src: string; alt: string }

function parseParts(markdown: string): Part[] {
  const parts: Part[] = []
  let cursor = 0
  for (const match of findInlineMarkdownImages(markdown)) {
    const at = match.index
    if (at > cursor) parts.push({ text: markdown.slice(cursor, at) })
    parts.push({ markdown: match.raw, alt: match.alt, src: match.src })
    cursor = at + match.raw.length
  }
  if (cursor < markdown.length || parts.length === 0) parts.push({ text: markdown.slice(cursor) })
  return parts
}

function sourceLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length ?? 0
  if (node instanceof HTMLButtonElement && node.dataset.markdown) return node.dataset.markdown.length
  return Array.from(node.childNodes).reduce((length, child) => length + sourceLength(child), 0)
}

export function editorSourceOffset(root: HTMLElement): number {
  const selection = window.getSelection()
  if (!selection?.rangeCount || !root.contains(selection.anchorNode)) return root.dataset.markdown?.length ?? sourceLength(root)
  const range = document.createRange()
  range.selectNodeContents(root)
  range.setEnd(selection.anchorNode!, selection.anchorOffset)
  return sourceLength(range.cloneContents())
}

export function editorSourceSelection(root: HTMLElement): [number, number] {
  const start = editorSourceOffset(root)
  const selection = window.getSelection()
  if (!selection?.rangeCount || !root.contains(selection.anchorNode)) return [start, start]
  return [start, start + sourceLength(selection.getRangeAt(0).cloneContents())]
}

export function focusEditorAtSourceOffset(root: HTMLElement, offset: number) {
  root.focus()
  const range = document.createRange()
  let remaining = offset
  let placed = false
  function locate(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0
      if (remaining <= length) { range.setStart(node, remaining); placed = true; return true }
      remaining -= length
      return false
    }
    if (node instanceof HTMLButtonElement && node.dataset.markdown) {
      const length = node.dataset.markdown.length
      if (remaining <= length) {
        const parent = node.parentNode!
        const index = Array.prototype.indexOf.call(parent.childNodes, node) as number
        range.setStart(parent, index + (remaining > 0 ? 1 : 0))
        placed = true
        return true
      }
      remaining -= length
      return false
    }
    for (const child of Array.from(node.childNodes)) if (locate(child)) return true
    return false
  }
  locate(root)
  if (!placed) range.selectNodeContents(root), range.collapse(false)
  else range.collapse(true)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

function serialize(root: HTMLElement): string {
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (node instanceof HTMLButtonElement && node.dataset.markdown) return node.dataset.markdown
    if (node instanceof HTMLBRElement) return '\n'
    const children = Array.from(node.childNodes).map(walk).join('')
    return node instanceof HTMLDivElement || node instanceof HTMLParagraphElement ? `${children}\n` : children
  }
  return Array.from(root.childNodes).map(walk).join('').replace(/\n$/, '')
}

export function InlineImageEditor({ value, onChange, onPasteImage, onViewImage, readOnly, editorRef, images }: {
  value: string
  onChange: (value: string) => void
  onPasteImage: (files: File[], offset: number, end: number) => void
  onViewImage: (src: string, alt: string, button: HTMLButtonElement) => void
  readOnly: boolean
  editorRef: RefObject<HTMLDivElement | null>
  images: NoteImage[]
}) {
  const emittedValue = useRef<string | null>(null)
  useEffect(() => {
    const element = editorRef.current
    if (!element || emittedValue.current === value) { emittedValue.current = null; return }
    element.replaceChildren()
    for (const part of parseParts(value)) {
      if ('text' in part) element.append(document.createTextNode(part.text))
      else {
        const button = document.createElement('button')
        button.type = 'button'
        button.contentEditable = 'false'
        button.className = 'note-inline-image-editor'
        button.dataset.markdown = part.markdown
        button.dataset.src = part.src
        button.dataset.alt = part.alt
        button.setAttribute('aria-label', `Image: ${part.alt || 'note image'}`)
        const image = document.createElement('img')
        try {
          const path = new URL(part.src, window.location.href).pathname
          image.src = images.find(item => new URL(item.url, window.location.href).pathname === path)?.url ?? part.src
        } catch { image.src = part.src }
        image.alt = part.alt
        button.append(image)
        element.append(button)
      }
    }
  }, [value, images, editorRef])

  return <div ref={editorRef} role="textbox" aria-label="Note content" aria-multiline="true" contentEditable={!readOnly} suppressContentEditableWarning className="note-rich-editor" data-placeholder="Write your note…" onInput={event => {
    const next = serialize(event.currentTarget)
    const sourceImages = findInlineMarkdownImages(next).length
    const renderedImages = event.currentTarget.querySelectorAll('button[data-markdown]').length
    emittedValue.current = sourceImages === renderedImages ? next : null
    onChange(next)
  }} onKeyDown={event => {
    if (event.key === 'Enter') {
      event.preventDefault()
      document.execCommand('insertText', false, '\n')
    }
  }} onPaste={event => {
    const files = Array.from(event.clipboardData.items).filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => file !== null)
    if (files.length) {
      event.preventDefault()
      const [start, end] = editorSourceSelection(event.currentTarget)
      onPasteImage(files, start, end)
      return
    }
    event.preventDefault()
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
  }} onClick={event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-markdown]')
    if (button) onViewImage(button.dataset.src ?? '', button.dataset.alt ?? '', button)
  }} />
}
