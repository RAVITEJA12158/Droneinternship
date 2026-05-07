'use client'
import { useState, ReactNode } from 'react'
interface Tab { id: string; label: string; content: ReactNode }
interface Props { tabs: Tab[]; defaultTab?: string }
export function Tabs({ tabs, defaultTab }: Props) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)
  const current = tabs.find(t => t.id === active)
  return (
    <div>
      <div className="flex gap-1 border-b border-slate-800 mb-6 overflow-x-auto" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-t-md ${active === t.id ? 'border-green-500 text-green-400 bg-slate-900/60' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  )
}
