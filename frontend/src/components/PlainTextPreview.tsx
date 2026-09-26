import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { CompactMarkdownCodeBlock, MarkdownCodeBlock } from './MarkdownCodeBlock'
import { findInlineMarkdownImages } from './noteImages'

type Segment = { kind: 'text'; value: string } | { kind: 'code'; language: string; value: string }

function parsePlainText(content: string): Segment[] {
  const lines = content.split('\n')
  const segments: Segment[] = []
  let text: string[] = []
  let index = 0
  function flushText() {
    if (text.length) segments.push({ kind: 'text', value: text.join('\n') })
    text = []
  }
  while (index < lines.length) {
    const opening = lines[index].match(/^\s*```([^\s`]*)\s*$/)
    if (!opening) {
      text.push(lines[index])
      index += 1
      continue
    }
    flushText()
    const language = opening[1] || 'text'
    index += 1
    const code: string[] = []
    while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
      code.push(lines[index])
      index += 1
    }
    if (index < lines.length) index += 1
    segments.push({ kind: 'code', language, value: code.join('\n') })
  }
  flushText()
  return segments
}

function asSafeMarkdownFence(language: string, code: string) {
  const longestRun = Math.max(0, ...[...code.matchAll(/`+/g)].map(match => match[0].length))
  const fence = '`'.repeat(Math.max(3, longestRun + 1))
  return `${fence}${language === 'text' ? '' : language}\n${code}\n${fence}`
}

function splitInlineImages(text: string) {
  const parts: Array<{ text: string } | { alt: string; src: string }> = []
  let cursor = 0
  for (const match of findInlineMarkdownImages(text)) {
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index) })
    parts.push({ alt: match.alt, src: match.src })
    cursor = match.index + match.raw.length
  }
  if (cursor < text.length || parts.length === 0) parts.push({ text: text.slice(cursor) })
  return parts
}

export function PlainTextPreview({ content, compact = false, renderImage }: { content: string; compact?: boolean; renderImage?: (src: string, alt: string) => ReactNode }) {
  const segments = parsePlainText(content)
  return <div className={compact ? 'note-card-preview plain' : 'note-plain-preview'}>{segments.map((segment, index) => segment.kind === 'text'
    ? <div className="plain-text-run" key={`text-${index}`}>{renderImage ? splitInlineImages(segment.value).map((part, partIndex) => 'src' in part ? <span className="plain-inline-image" key={`image-${partIndex}`}>{renderImage(part.src, part.alt)}</span> : <span key={`text-${partIndex}`}>{part.text}</span>) : segment.value}</div>
    : <ReactMarkdown key={`code-${index}`} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ pre: compact ? CompactMarkdownCodeBlock : MarkdownCodeBlock }} skipHtml>{asSafeMarkdownFence(segment.language, segment.value)}</ReactMarkdown>)}</div>
}
