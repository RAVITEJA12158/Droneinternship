'use client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useUIStore } from '@/store/ui.store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUIStore()
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
