'use client'
import { useDashboard } from '@/hooks/useDashboard'
import { StatCard } from '@/components/ui/StatCard'
import { ProjectCard } from '@/components/project/ProjectCard'
import { MissionCard } from '@/components/mission/MissionCard'
import { PageShell } from '@/components/layout/PageShell'
import { Spinner } from '@/components/ui/Spinner'
import { formatBytes } from '@/lib/utils/formatBytes'
import { FolderKanban, Target, HardDrive, FileImage } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <PageShell title="Dashboard" subtitle="Welcome to DroneVault">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={data?.totalProjects ?? 0} icon={FolderKanban} />
        <StatCard label="Total Missions" value={data?.totalMissions ?? 0} icon={Target} color="text-indigo-600" />
        <StatCard label="Storage Used" value={formatBytes(data?.storageUsed ?? 0)} icon={HardDrive} color="text-amber-600" />
        <StatCard label="Files Uploaded" value={data?.totalFiles ?? 0} icon={FileImage} color="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-950 font-semibold text-lg">Recent Projects</h2>
            <Link href="/projects" className="text-cyan-700 hover:text-cyan-900 text-sm font-medium">View all</Link>
          </div>
          <div className="space-y-3">
            {data?.recentProjects?.slice(0, 5).map(p => <ProjectCard key={p.id} project={p} />) ?? <p className="text-slate-500 text-sm">No projects yet.</p>}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-950 font-semibold text-lg">Recent Missions</h2>
          </div>
          <div className="space-y-3">
            {data?.recentMissions?.slice(0, 5).map(m => <MissionCard key={m.id} mission={m} projectId={m.projectId} />) ?? <p className="text-slate-500 text-sm">No missions yet.</p>}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
