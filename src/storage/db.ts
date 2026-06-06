import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { Session, Solve } from '../types'

interface CubeTimerDB extends DBSchema {
  sessions: { key: string; value: Session }
  solves: { key: string; value: Solve; indexes: { bySession: string } }
}

let dbPromise: Promise<IDBPDatabase<CubeTimerDB>> | null = null

function getDB(): Promise<IDBPDatabase<CubeTimerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CubeTimerDB>('cubetimer', 1, {
      upgrade(db) {
        db.createObjectStore('sessions', { keyPath: 'id' })
        const solves = db.createObjectStore('solves', { keyPath: 'id' })
        solves.createIndex('bySession', 'sessionId')
      },
    })
  }
  return dbPromise
}

export async function putSession(session: Session): Promise<void> {
  await (await getDB()).put('sessions', session)
}

export async function getAllSessions(): Promise<Session[]> {
  return (await getDB()).getAll('sessions')
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['sessions', 'solves'], 'readwrite')
  await tx.objectStore('sessions').delete(id)
  const idx = tx.objectStore('solves').index('bySession')
  let cursor = await idx.openCursor(id)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function putSolve(solve: Solve): Promise<void> {
  await (await getDB()).put('solves', solve)
}

export async function getSolvesBySession(sessionId: string): Promise<Solve[]> {
  const all = await (await getDB()).getAllFromIndex('solves', 'bySession', sessionId)
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function getAllSolves(): Promise<Solve[]> {
  return (await getDB()).getAll('solves')
}

export async function deleteSolve(id: string): Promise<void> {
  await (await getDB()).delete('solves', id)
}

export async function replaceAll(sessions: Session[], solves: Solve[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['sessions', 'solves'], 'readwrite')
  await tx.objectStore('sessions').clear()
  await tx.objectStore('solves').clear()
  for (const s of sessions) await tx.objectStore('sessions').put(s)
  for (const s of solves) await tx.objectStore('solves').put(s)
  await tx.done
}

export async function bulkPut(sessions: Session[], solves: Solve[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['sessions', 'solves'], 'readwrite')
  for (const s of sessions) await tx.objectStore('sessions').put(s)
  for (const s of solves) await tx.objectStore('solves').put(s)
  await tx.done
}
