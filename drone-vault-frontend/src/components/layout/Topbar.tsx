'use client'
import { Bell } from 'lucide-react'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { useAuth } from '@/hooks/useAuth'

export function Topbar() {
  const { user } = useAuth()
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1"><GlobalSearch /></div>
      <button className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
        <Bell size={20} />
      </button>
      {user && (
        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
          {user.name[0].toUpperCase()}
        </div>
      )}
    </header>
  )
}
