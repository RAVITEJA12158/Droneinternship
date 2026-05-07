'use client'
import { useParams } from 'next/navigation'
import { useProject } from '@/hooks/useProjects'
import { useMissions } from '@/hooks/useMissions'
import { PageShell } from '@/components/layout/PageShell'
import { Tabs } from '@/components/ui/Tabs'
import { MissionList } from '@/components/mission/MissionList'
import { ProjectMapDynamic } from '@/components/map/ProjectMapDynamic'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { Calendar, MapPin, Plus, Target } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/formatDate'

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading: isProjectLoading, isError } = useProject(projectId)
  const { data: missionsResponse, isLoading: isMissionsLoading } = useMissions(projectId)
  const missions = missionsResponse?.data ?? []
  // BUG-11 fix: removed dead useOrthomosaics('') call — it fired GET /api/missions//orthomosaics
  // and orthomosaics is a per-mission concern, not shown on the project page.

  if (isProjectLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (isError || !project) return <ErrorState />

  const missionTotal = missionsResponse?.total ?? project.missionCount ?? 0
  const hasLocation = project.latitude != null && project.longitude != null
  const projectCoords = hasLocation
    ? { latitude: project.latitude!, longitude: project.longitude! }
    : null

  const tabs = [
    {
      id: 'overview', label: 'Overview',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Target size={14} className="text-cyan-700" />Missions</div>
              <p className="text-slate-950 font-semibold">{missionTotal}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><MapPin size={14} className="text-cyan-700" />Location</div>
              <p className="text-slate-950 font-semibold">
                {hasLocation ? `${project.latitude!.toFixed(6)}, ${project.longitude!.toFixed(6)}` : 'Not set'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Calendar size={14} className="text-cyan-700" />Created</div>
              <p className="text-slate-950 font-semibold">{formatDate(project.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-slate-950 font-semibold">Project Notes</h3>
              <p className="text-slate-600 text-sm mt-2 leading-6">
                {project.description || 'No description has been added for this project yet.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-slate-950 font-semibold">Next Step</h3>
              <p className="text-slate-600 text-sm mt-2 leading-6">
                Add a mission to upload flight data, review captures, and generate exports.
              </p>
              <div className="mt-4">
                <Link href={`/projects/${projectId}/missions/new`}>
                  <Button size="sm"><Plus size={14} />New Mission</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'missions', label: 'Missions',
      content: (
        <div>
          {isMissionsLoading ? (
            <div className="flex justify-center py-10"><Spinner size="md" /></div>
          ) : (
            <MissionList missions={missions} projectId={projectId} />
          )}
        </div>
      ),
    },
    {
      id: 'map', label: 'Map',
      // UI-06 fix: ProjectMap only rendered here, not duplicated in overview tab
      content: projectCoords
        ? <ProjectMapDynamic latitude={projectCoords.latitude} longitude={projectCoords.longitude} missions={missions} />
        : <p className="text-slate-500 text-center py-12">No location set for this project.</p>,
    },
    // BUG-09 fix: removed Exports tab from project page entirely.
    // Exports are per-mission — ExportPanel was incorrectly receiving projectId as missionId,
    // causing POST /api/missions/{projectId}/export/zip which always returns 404.
    // Exports are accessible from each individual mission page.
  ]

  return (
    <PageShell
      title={project.name}
      subtitle={`${missionTotal} missions`}
      backHref="/projects"
      backLabel="Projects"
      actions={
        <Link href={`/projects/${projectId}/missions/new`}>
          <Button><Plus size={16} />New Mission</Button>
        </Link>
      }
    >
      <Tabs tabs={tabs} />
    </PageShell>
  )
}
