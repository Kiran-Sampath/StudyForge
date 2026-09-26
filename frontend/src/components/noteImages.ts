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
    normalized += markdown.slice(cursor, image.index) + `![${image.alt}](${image.src})`
    cursor = image.index + image.raw.length
  }
  return normalized + markdown.slice(cursor)
}

export function markdownReferencesImage(markdown: string, imageUrl: string): boolean {
  try {
    const target = new URL(imageUrl, window.location.href).pathname
    return findInlineMarkdownImages(markdown).some(image => new URL(image.src, window.location.href).pathname === target)
  } catch { return false }
}
