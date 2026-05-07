'use client'
import { Search } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function SearchFilters({ value, onChange, placeholder = 'Search...' }: Props) {
  return (
    <div className="relative w-full sm:w-96">
      <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-950 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600"
      />
    </div>
  )
}
