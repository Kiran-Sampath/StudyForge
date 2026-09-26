import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { mockPathApi } from './test/fixtures'

beforeEach(() => {
  const api = mockPathApi()
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
    const result = api(url, options?.method, options?.body as string)
    return new Response(result.status === 204 ? null : JSON.stringify(result.body), { status: result.status, headers: { 'Content-Type': 'application/json' } })
  }))
})

async function setup(route = '/') {
  const user = userEvent.setup()
  render(<AuthProvider><MemoryRouter initialEntries={[route]}><App /></MemoryRouter></AuthProvider>)
  await screen.findByRole('heading', { level: 1 })
  return user
}

describe('learning workspace', () => {
  it('creates a path, validates empty titles, and shows its zero progress', async () => {
    const user = await setup()
    await user.click(screen.getByRole('button', { name: 'New learning path' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Create learning path' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Give your learning path a title')
    await user.type(within(dialog).getByLabelText(/Title/), 'Rust fundamentals')
    await user.type(within(dialog).getByLabelText(/Description/), 'Ownership and borrowing')
    await user.click(within(dialog).getByRole('button', { name: 'Create learning path' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const heading = screen.getByRole('heading', { name: 'Rust fundamentals' })
    expect(within(heading.closest('article')!).getByText('0 of 0 topics completed')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Your new learning path is ready')
  })

  it('edits a path and requires confirmation before deleting it', async () => {
    const user = await setup()
    await user.click(screen.getByRole('button', { name: 'Actions for System Design' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit learning path' }))
    const title = screen.getByLabelText(/Title/)
    await user.clear(title)
    await user.type(title, 'Distributed Systems')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('heading', { name: 'Distributed Systems' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Actions for Distributed Systems' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete learning path' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('6 topics')
    await user.click(screen.getByRole('button', { name: 'Keep learning path' }))
    expect(screen.getByRole('heading', { name: 'Distributed Systems' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Actions for Distributed Systems' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete learning path' }))
    await user.click(screen.getByRole('button', { name: 'Delete path' }))
    expect(screen.queryByRole('heading', { name: 'Distributed Systems' })).not.toBeInTheDocument()
  })

  it('filters by status, searches, and recovers from no results', async () => {
    const user = await setup()
    await user.click(screen.getByRole('button', { name: /^Completed/ }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(within(screen.getByRole('article')).getByRole('heading', { name: 'SQL & Databases' })).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox'), 'something missing')
    expect(screen.getByText('No learning paths match these filters.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getAllByRole('article')).toHaveLength(6)
  })

  it('opens a path preview and supports a missing path', async () => {
    const user = await setup()
    await user.click(screen.getByRole('link', { name: /SQL & Databases Open learning path/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'SQL & Databases' })).toBeInTheDocument()
    expect(await screen.findByText('5 completed · 100%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Relational models' })).toBeInTheDocument()
  })

  it('explains nonexistent routes and closes dialogs with Escape', async () => {
    const user = await setup('/paths/missing')
    expect(screen.getByRole('heading', { name: 'This page wandered off.' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to learning paths' }))
    await user.click(screen.getByRole('button', { name: 'New learning path' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New learning path' })).toHaveFocus()
  })

  it('retries a failed initial load without showing a fake empty workspace', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'))
    const user = await setup()
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach StudyForge')
    expect(screen.queryByText('Every journey starts with a subject.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByRole('heading', { name: 'System Design' })
    expect(screen.getAllByRole('article')).toHaveLength(6)
  })

  it('retains entered content after a failed save and allows retry', async () => {
    const user = await setup()
    await user.click(screen.getByRole('button', { name: 'New learning path' }))
    await user.type(screen.getByLabelText(/Title/), 'Keep my work')
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'Database temporarily unavailable. Please try again.' }), { status: 503 }))
    await user.click(screen.getByRole('button', { name: 'Create learning path' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Database temporarily unavailable')
    expect(screen.getByLabelText(/Title/)).toHaveValue('Keep my work')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create learning path' }))
    expect(await screen.findByRole('heading', { name: 'Keep my work' })).toBeInTheDocument()
  })

  it('shows recent learning context and continues to the newest note', async () => {
    await setup()
    await screen.findByRole('link', { name: /Transaction Isolation Notes/ })
    const continueLink = screen.getByRole('link', { name: /Continue learning/ })
    expect(continueLink).toHaveAttribute('href', '/paths/4/topics/401/notes/1')
    expect(screen.getByRole('heading', { name: 'Recently worked on' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Transaction Isolation Notes/ })).toHaveAttribute('href', '/paths/4/topics/401/notes/1')
    expect(screen.queryByRole('button', { name: 'Create learning path' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actions for System Design' })?.closest('article')).toHaveAttribute('tabindex', '0')
  })

  it('opens a learning path from the focused card while preserving separate menu actions', async () => {
    const user = await setup()
    const card = screen.getByRole('heading', { name: 'System Design' }).closest('article')!
    card.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name: 'System Design' })).toBeInTheDocument()
  })

  it('adds, edits, completes, and deletes a topic with progress updates', async () => {
    const user = await setup()
    await user.click(screen.getByRole('link', { name: /Python & FastAPI Open learning path/ }))
    await screen.findByRole('button', { name: 'Add topic' })
    await user.click(screen.getByRole('button', { name: 'Add topic' }))
    await user.type(screen.getByLabelText(/Title/), 'Type hints')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add topic' }))
    expect(await screen.findByRole('link', { name: 'Type hints' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Actions for Type hints' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit topic' }))
    await user.clear(screen.getByLabelText(/Title/))
    await user.type(screen.getByLabelText(/Title/), 'Python type hints')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('link', { name: 'Python type hints' })).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status for Python type hints' }), 'COMPLETED')
    expect(await screen.findByText('1 completed · 20%')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Actions for Python type hints' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete topic' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('all its notes')
    await user.click(screen.getByRole('button', { name: 'Delete topic' }))
    expect(screen.queryByRole('link', { name: 'Python type hints' })).not.toBeInTheDocument()
    expect(await screen.findByText('0 completed · 0%')).toBeInTheDocument()
  })
})
