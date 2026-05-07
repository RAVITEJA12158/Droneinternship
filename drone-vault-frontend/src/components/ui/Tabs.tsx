'use client'
import { useState, ReactNode } from 'react'
interface Tab { id: string; label: string; content: ReactNode }
interface Props { tabs: Tab[]; defaultTab?: string }
export function Tabs({ tabs, defaultTab }: Props) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)
  const current = tabs.find(t => t.id === active)
  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-t-md ${active === t.id ? 'border-cyan-600 text-cyan-800 bg-cyan-50' : 'border-transparent text-slate-500 hover:text-slate-950 hover:bg-slate-100'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  )
}
