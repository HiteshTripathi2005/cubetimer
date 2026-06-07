import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import { App } from './App'
import { useStore, __resetInitForTests } from '../store/useStore'
import { replaceAll } from '../storage/db'

beforeEach(async () => {
  localStorage.clear()
  await replaceAll([], [])
  useStore.setState({ ready: false, sessions: [], solves: [], scramble: '' })
  __resetInitForTests()
})

describe('App', () => {
  it('initializes and shows the timer once ready', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByLabelText('Active session')).toBeInTheDocument())
    // a scramble is shown and the timer display exists
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })
})
