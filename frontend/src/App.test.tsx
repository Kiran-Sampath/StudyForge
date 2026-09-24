import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App'

function setup(route = '/') {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>)
  return user
}

describe('learning workspace', () => {
  it('creates a path, validates empty titles, and shows its zero progress', async () => {
    const user = setup()
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
    const user = setup()
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
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Completed' }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'SQL & Databases' })).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox'), 'something missing')
    expect(screen.getByText('No paths found here')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getAllByRole('article')).toHaveLength(6)
  })

  it('opens a path preview and supports a missing path', async () => {
    const user = setup()
    await user.click(screen.getByRole('link', { name: /SQL & Databases Open learning path/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'SQL & Databases' })).toBeInTheDocument()
    expect(screen.getByText('Relational models')).toBeInTheDocument()
    expect(screen.getByText(/Topic management and notes are coming/)).toBeInTheDocument()
  })

  it('explains nonexistent routes and closes dialogs with Escape', async () => {
    const user = setup('/paths/missing')
    expect(screen.getByRole('heading', { name: 'This page wandered off.' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to learning paths' }))
    await user.click(screen.getByRole('button', { name: 'New learning path' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New learning path' })).toHaveFocus()
  })
})
