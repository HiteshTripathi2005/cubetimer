import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  putSession, getAllSessions, deleteSession,
  putSolve, getSolvesBySession, deleteSolve, replaceAll, getAllSolves,
} from './db'
import type { Session, Solve } from '../types'

const session = (id: string): Session => ({ id, name: id, createdAt: 0 })
const solve = (id: string, sessionId: string, timeMs: number): Solve => ({
  id, sessionId, timeMs, penalty: 'none', scramble: '', createdAt: timeMs,
})

describe('db', () => {
  beforeEach(async () => { await replaceAll([], []) })

  it('stores and lists sessions', async () => {
    await putSession(session('s1'))
    await putSession(session('s2'))
    const all = await getAllSessions()
    expect(all.map((s) => s.id).sort()).toEqual(['s1', 's2'])
  })

  it('stores solves and queries by session, ordered by createdAt', async () => {
    await putSolve(solve('b', 's1', 200))
    await putSolve(solve('a', 's1', 100))
    await putSolve(solve('c', 's2', 50))
    const s1 = await getSolvesBySession('s1')
    expect(s1.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('deletes a session and its solves', async () => {
    await putSession(session('s1'))
    await putSolve(solve('a', 's1', 100))
    await deleteSession('s1')
    expect(await getAllSessions()).toEqual([])
    expect(await getSolvesBySession('s1')).toEqual([])
  })

  it('deletes a single solve', async () => {
    await putSolve(solve('a', 's1', 100))
    await deleteSolve('a')
    expect(await getSolvesBySession('s1')).toEqual([])
  })

  it('replaceAll wipes and loads', async () => {
    await putSolve(solve('a', 's1', 100))
    await replaceAll([session('s9')], [solve('z', 's9', 1)])
    expect((await getAllSessions()).map((s) => s.id)).toEqual(['s9'])
    expect((await getAllSolves()).map((s) => s.id)).toEqual(['z'])
  })
})
