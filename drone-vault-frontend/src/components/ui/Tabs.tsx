'use client'
import { useState, ReactNode } from 'react'
interface Tab { id: string; label: string; content: ReactNode }
interface Props { tabs: Tab[]; defaultTab?: string }
export function Tabs({ tabs, defaultTab }: Props) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)
  const current = tabs.find(t => t.id === active)
  return (
    <div>
      <div className="flex gap-1 border-b border-slate-800 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${active === t.id ? 'border-green-500 text-green-400' : 'border-transparent text-slate-400 hover:text-white'}`}>{t.label}</button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  )
}
