import { Children, isValidElement, useState, type ComponentProps, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'

function textFromNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textFromNode).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children)
  return ''
}

function CodeBlockFrame({ children, compact }: { children: ReactNode; compact: boolean }) {
  const [copied, setCopied] = useState(false)
  const code = Children.toArray(children).find(child => isValidElement(child))
  const className = isValidElement<{ className?: string }>(code) ? code.props.className ?? '' : ''
  const language = className.match(/(?:^|\s)language-([^\s]+)/)?.[1] ?? 'text'
  const source = textFromNode(code).replace(/\n$/, '')
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
  return <div className={compact ? 'note-card-code-block' : 'preview-code-block'}><div className={compact ? 'note-card-code-header' : 'preview-code-header'}><span className={compact ? 'note-card-code-language' : undefined}>{language}</span>{!compact && <button type="button" onClick={copyCode}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy code'}</button>}</div><pre><code className={className}>{isValidElement<{ children?: ReactNode }>(code) ? code.props.children : children}</code></pre></div>
}

export function MarkdownCodeBlock({ children }: ComponentProps<'pre'>) {
  return <CodeBlockFrame compact={false}>{children}</CodeBlockFrame>
}

export function CompactMarkdownCodeBlock({ children }: ComponentProps<'pre'>) {
  return <CodeBlockFrame compact>{children}</CodeBlockFrame>
}
