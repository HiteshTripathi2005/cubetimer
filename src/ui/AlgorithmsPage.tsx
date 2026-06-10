import { useMemo, useState } from 'react'
import type { AlgCase } from '../algs/types'
import { OLL_CASES } from '../algs/oll'
import { PLL_CASES } from '../algs/pll'
import { CaseDiagram } from './CaseDiagram'

type Tab = 'OLL' | 'PLL'

function matches(c: AlgCase, q: string): boolean {
  const hay = `${c.id} ${c.name} ${c.group} ${c.alg}`.toLowerCase()
  return q.split(/\s+/).every((part) => hay.includes(part))
}

function groupCases(cases: AlgCase[]): [string, AlgCase[]][] {
  const groups = new Map<string, AlgCase[]>()
  for (const c of cases) {
    const list = groups.get(c.group) ?? []
    list.push(c)
    groups.set(c.group, list)
  }
  return [...groups.entries()]
}

function CaseCard({ c, kind }: { c: AlgCase; kind: Tab }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 p-3">
      <CaseDiagram alg={c.alg} kind={kind} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {c.id}
          {c.name !== c.id && <span className="ml-1.5 font-normal text-zinc-400">{c.name}</span>}
        </p>
        <p className="mt-1 font-mono text-sm text-zinc-600 dark:text-zinc-300 break-words">{c.alg}</p>
      </div>
    </div>
  )
}

export function AlgorithmsPage() {
  const [tab, setTab] = useState<Tab>('OLL')
  const [query, setQuery] = useState('')
  const cases = tab === 'OLL' ? OLL_CASES : PLL_CASES
  const q = query.trim().toLowerCase()
  const grouped = useMemo(() => {
    const filtered = q ? cases.filter((c) => matches(c, q)) : cases
    return groupCases(filtered)
  }, [cases, q])

  const tabBtn = (t: Tab) =>
    `rounded-md px-4 py-1.5 text-sm font-medium ${
      tab === t
        ? 'bg-indigo-600 text-white'
        : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
    }`

  return (
    <div className="min-h-full w-full px-4 py-4 sm:px-6 lg:px-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 p-1" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'OLL'} className={tabBtn('OLL')} onClick={() => setTab('OLL')}>
            OLL · {OLL_CASES.length}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'PLL'} className={tabBtn('PLL')} onClick={() => setTab('PLL')}>
            PLL · {PLL_CASES.length}
          </button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, group, or moves…"
          aria-label="Search algorithms"
          className="w-full sm:w-72 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
        />
      </div>

      {grouped.length === 0 && <p className="text-sm text-zinc-400">No cases match “{query}”.</p>}

      {grouped.map(([group, list]) => (
        <section key={group}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">{group}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {list.map((c) => (
              <CaseCard key={c.id} c={c} kind={tab} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default AlgorithmsPage
