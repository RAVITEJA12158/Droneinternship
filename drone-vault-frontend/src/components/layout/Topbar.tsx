'use client'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { useAuth } from '@/hooks/useAuth'

export function Topbar() {
  const { user } = useAuth()
  return (
    <header className="h-16 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 flex items-center px-4 sm:px-6 gap-4 shrink-0">
      <div className="flex-1">
        <GlobalSearch />
      </div>
      {user && (
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="max-w-36 truncate text-sm font-medium text-slate-900">{user.name}</p>
            <p className="max-w-36 truncate text-xs text-slate-500">{user.role.toLowerCase()}</p>
          </div>
          <div className="w-8 h-8 bg-cyan-700 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
            {user.name[0].toUpperCase()}
          </div>
        </div>
      )}
    </header>
  )
}
