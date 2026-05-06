'use client'
import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import { useRouter } from 'next/navigation'

export function GlobalSearch() {
  const { query, setQuery, results, isSearching } = useSearch()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }}
          placeholder="Search projects, missions…"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      {open && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
          {isSearching ? (
            <p className="p-4 text-slate-400 text-sm">Searching…</p>
          ) : results ? (
            <>
              {results.projects.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">Projects</p>
                  {results.projects.map(p => (
                    <button key={p.id} onClick={() => { router.push(`/projects/${p.id}`); setOpen(false); setQuery('') }} className="w-full text-left px-4 py-2.5 hover:bg-slate-800 text-sm text-white transition-colors">
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              {results.missions.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">Missions</p>
                  {results.missions.map(m => (
                    <button key={m.id} onClick={() => { router.push(`/projects/${m.projectId}/missions/${m.id}`); setOpen(false); setQuery('') }} className="w-full text-left px-4 py-2.5 hover:bg-slate-800 text-sm text-white transition-colors">
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
              {results.projects.length === 0 && results.missions.length === 0 && (
                <p className="p-4 text-slate-400 text-sm">No results found</p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
