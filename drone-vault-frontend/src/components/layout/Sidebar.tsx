'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, FolderKanban, LayoutDashboard, LogOut, Upload } from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { useAuth } from '@/hooks/useAuth'

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, activeUploadJobs } = useUIStore()
  const { user, logout } = useAuth()
  const activeUploads = activeUploadJobs.filter(j => j.status === 'uploading').length

  return (
    <aside className={`fixed top-0 left-0 h-full bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-cyan-600 rounded-xl flex items-center justify-center shadow-sm shadow-cyan-500/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </div>
            <div>
              <span className="block font-semibold tracking-tight text-white">DroneVault</span>
              <span className="block text-[11px] font-medium text-cyan-300">Mission Data OS</span>
            </div>
          </div>
        )}
        <button type="button" onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-auto">
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${active ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-950/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Icon size={20} className="shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
            </Link>
          )
        })}

        {activeUploads > 0 && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-500/15 text-amber-300">
            <Upload size={20} className="shrink-0 animate-pulse" />
            {sidebarOpen && <span className="text-sm font-medium">{activeUploads} uploading...</span>}
          </div>
        )}
      </nav>

      {sidebarOpen && user && (
        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800">
            <div className="w-9 h-9 bg-cyan-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-slate-400 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => logout()} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-slate-900 hover:text-red-300">
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </aside>
  )
}
