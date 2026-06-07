import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { useStore } from '../store/useStore'
import { replaceAll } from '../storage/db'
import { __resetInitForTests } from '../store/useStore'

beforeEach(async () => {
  localStorage.clear()
  await replaceAll([], [])
  __resetInitForTests()
  useStore.setState({ ready: false, sessions: [], solves: [], scramble: '' })
})

describe('App routing', () => {
  it('shows the timer on /timer', async () => {
    render(<MemoryRouter initialEntries={['/timer']}><App /></MemoryRouter>)
    await waitFor(() => expect(screen.getByLabelText('Active session')).toBeInTheDocument())
  })

  it('redirects / to /timer', async () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    await waitFor(() => expect(screen.getByLabelText('Active session')).toBeInTheDocument())
  })

  it('shows the NavBar with both links', () => {
    render(<MemoryRouter initialEntries={['/timer']}><App /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Timer' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solver' })).toBeInTheDocument()
  })
})
