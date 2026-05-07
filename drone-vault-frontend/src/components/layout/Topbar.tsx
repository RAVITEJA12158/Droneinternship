'use client'
import { Bell } from 'lucide-react'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { useAuth } from '@/hooks/useAuth'

export function Topbar() {
  const { user } = useAuth()
  return (
    <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center px-4 sm:px-6 gap-4 shrink-0">
      <div className="flex-1"><GlobalSearch /></div>
      <button className="relative p-2 text-slate-500 hover:text-cyan-800 rounded-lg hover:bg-cyan-50 transition-colors">
        <Bell size={20} />
      </button>
      {user && (
        <div className="w-8 h-8 bg-cyan-700 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
          {user.name[0].toUpperCase()}
        </div>
      )}
    </header>
  )
}
