'use client'
import { useEffect, useRef, useState } from 'react'
import { FileImage, Search } from 'lucide-react'
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
    <div ref={ref} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          placeholder="Search projects, missions..."
          className="w-full h-10 bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-950 placeholder-slate-400 shadow-inner shadow-slate-200/40 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600"
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-950/10 z-50 max-h-80 overflow-y-auto">
          {isSearching ? (
            <p className="p-4 text-slate-500 text-sm">Searching...</p>
          ) : results ? (
            <>
              {results.projects.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">Projects</p>
                  {results.projects.map(p => (
                    <button key={p.id} onClick={() => { router.push(`/projects/${p.id}`); setOpen(false); setQuery('') }} className="w-full text-left px-4 py-2.5 hover:bg-cyan-50 text-sm text-slate-800 transition-colors">
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              {results.missions.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">Missions</p>
                  {results.missions.map(m => (
                    <button key={m.id} onClick={() => { router.push(`/projects/${m.projectId}/missions/${m.id}`); setOpen(false); setQuery('') }} className="w-full text-left px-4 py-2.5 hover:bg-cyan-50 text-sm text-slate-800 transition-colors">
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
              {results.files.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">Files</p>
                  {results.files.map(f => (
                    <button
                      key={f.id}
                      onClick={() => {
                        if (f.mission) router.push(`/projects/${f.mission.projectId}/missions/${f.mission.id}`)
                        setOpen(false)
                        setQuery('')
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-800 transition-colors hover:bg-cyan-50"
                    >
                      <FileImage size={14} className="shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate">{f.originalName}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.projects.length === 0 && results.missions.length === 0 && results.files.length === 0 && (
                <p className="p-4 text-slate-500 text-sm">No results found</p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
