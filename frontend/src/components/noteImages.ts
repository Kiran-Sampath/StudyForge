export type InlineMarkdownImage = { raw: string; alt: string; src: string; index: number }

const inlineImagePattern = /!\[([^\]]*)\]\\?\(\s*(?:\[(https?:\/\/[^\s\]]+)\]\((https?:\/\/[^\s)]+)\)|<?(https?:\/\/[^\s)>]+)>?)\\?\)/g

export function findInlineMarkdownImages(markdown: string): InlineMarkdownImage[] {
  return Array.from(markdown.matchAll(inlineImagePattern), match => ({
    raw: match[0],
    alt: match[1],
    src: match[3] ?? match[4] ?? match[2],
    index: match.index ?? 0,
  }))
}

export function normalizeInlineMarkdownImages(markdown: string): string {
  const images = findInlineMarkdownImages(markdown)
  if (!images.length) return markdown
  let normalized = ''
  let cursor = 0
  for (const image of images) {
    normalized += markdown.slice(cursor, image.index)
    const activeFence = findActiveFence(markdown, image.index)
    if (activeFence) {
      if (!normalized.endsWith('\n')) normalized += '\n'
      normalized += `${activeFence.indent}${activeFence.marker}\n\n`
    }
    normalized += `![${image.alt}](${image.src})`
    if (activeFence) {
      normalized += '\n\n'
      if (hasClosingFence(markdown.slice(image.index + image.raw.length), activeFence)) {
        normalized += `${activeFence.indent}${activeFence.marker}${activeFence.info}\n`
      }
    }
    cursor = image.index + image.raw.length
  }
  return normalized + markdown.slice(cursor)
}

type MarkdownFence = { marker: string; indent: string; info: string }

function findActiveFence(markdown: string, beforeIndex: number): MarkdownFence | null {
  let active: MarkdownFence | null = null
  const prefix = markdown.slice(0, beforeIndex)
  for (const line of prefix.split('\n')) {
    if (active) {
      const close = new RegExp(`^ {0,3}${active.marker[0]}{${active.marker.length},}\\s*$`)
      if (close.test(line)) active = null
      continue
    }
    const opening = line.match(/^( {0,3})(`{3,}|~{3,})(.*)$/)
    if (opening && !(opening[2][0] === '`' && opening[3].includes('`'))) {
      active = { indent: opening[1], marker: opening[2], info: opening[3] }
    }
  }
  return active
}

function hasClosingFence(afterImage: string, fence: MarkdownFence): boolean {
  const lines = afterImage.split('\n').slice(1)
  const close = new RegExp(`^ {0,3}${fence.marker[0]}{${fence.marker.length},}\\s*$`)
  return lines.some(line => close.test(line))
}

export function markdownReferencesImage(markdown: string, imageUrl: string): boolean {
  try {
    const target = new URL(imageUrl, window.location.href).pathname
    return findInlineMarkdownImages(markdown).some(image => new URL(image.src, window.location.href).pathname === target)
  } catch { return false }
}
