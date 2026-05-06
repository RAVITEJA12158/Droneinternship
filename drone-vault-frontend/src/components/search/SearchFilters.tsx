'use client'
interface Props { value: string; onChange: (v: string) => void; placeholder?: string }
export function SearchFilters({ value, onChange, placeholder = 'Search…' }: Props) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
    />
  )
}
