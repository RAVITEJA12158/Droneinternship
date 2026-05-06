'use client'
import { useParams } from 'next/navigation'
import { useProject } from '@/hooks/useProjects'
import { useMissions } from '@/hooks/useMissions'
import { useOrthomosaics } from '@/hooks/useFiles'
import { PageShell } from '@/components/layout/PageShell'
import { Tabs } from '@/components/ui/Tabs'
import { MissionList } from '@/components/mission/MissionList'
import { OrthomosaicViewer } from '@/components/orthomosaic/OrthomosaicViewer'
import { ExportPanel } from '@/components/export/ExportPanel'
import { ProjectMap } from '@/components/map/ProjectMap'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { MapPin, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/formatDate'

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading, isError } = useProject(projectId)
  const { data: missionsResponse } = useMissions(projectId)
  const missions = missionsResponse?.data ?? []
  const { data: orthomosaics } = useOrthomosaics('') // loaded at mission level

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (isError || !project) return <ErrorState />

  const tabs = [
    {
      id: 'overview', label: 'Overview',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-white font-semibold">Details</h3>
              {project.description && <p className="text-slate-400 text-sm">{project.description}</p>}
              {project.latitude != null && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin size={14} className="text-green-400" />
                  {project.latitude.toFixed(6)}, {project.longitude?.toFixed(6)}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar size={14} className="text-green-400" />
                Created {formatDate(project.createdAt)}
              </div>
            </div>
            {project.latitude != null && project.longitude != null && (
              <ProjectMap latitude={project.latitude} longitude={project.longitude} missions={missions} />
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'missions', label: 'Missions',
      content: (
        <div>
          <div className="flex justify-end mb-4">
            <Link href={`/projects/${projectId}/missions/new`}><Button>+ New Mission</Button></Link>
          </div>
          <MissionList missions={missions} projectId={projectId} />
        </div>
      ),
    },
    {
      id: 'map', label: 'Map',
      content: project.latitude != null && project.longitude != null
        ? <ProjectMap latitude={project.latitude} longitude={project.longitude} missions={missions} />
        : <p className="text-slate-400 text-center py-12">No location set for this project.</p>,
    },
    {
      id: 'exports', label: 'Exports',
      content: <ExportPanel missionId={projectId} />,
    },
  ]

  return (
    <PageShell title={project.name} subtitle={`${missionsResponse?.total ?? project.missionCount ?? 0} missions`}>
      <Tabs tabs={tabs} />
    </PageShell>
  )
}
