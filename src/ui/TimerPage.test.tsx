import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TimerPage } from './TimerPage'
import { useStore, __resetInitForTests } from '../store/useStore'
import { replaceAll } from '../storage/db'

beforeEach(async () => {
  localStorage.clear()
  await replaceAll([], [])
  __resetInitForTests()
  useStore.setState({ ready: false, sessions: [], solves: [], scramble: '' })
})

describe('TimerPage', () => {
  it('initializes and shows the timer once ready', async () => {
    render(<MemoryRouter><TimerPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByLabelText('Active session')).toBeInTheDocument())
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })
})
