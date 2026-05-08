'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useProject, useUpdateProject } from '@/hooks/useProjects'
import { useMissions } from '@/hooks/useMissions'
import { PageShell } from '@/components/layout/PageShell'
import { Tabs } from '@/components/ui/Tabs'
import { MissionList } from '@/components/mission/MissionList'
import { ProjectMapDynamic } from '@/components/map/ProjectMapDynamic'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { DeleteProjectButton } from '@/components/project/DeleteProjectButton'
import { Calendar, Edit3, MapPin, Plus, Save, Target, X } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/formatDate'

function MissionsTab({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useMissions(projectId)
  const missions = data?.data ?? []

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="md" /></div>
  if (isError) return <ErrorState />

  return <MissionList missions={missions} projectId={projectId} />
}

function ProjectMapTab({
  latitude,
  longitude,
  projectId,
}: {
  latitude: number
  longitude: number
  projectId: string
}) {
  const { data, isLoading, isError } = useMissions(projectId)
  const missions = data?.data ?? []

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="md" /></div>
  if (isError) return <ErrorState />

  return <ProjectMapDynamic latitude={latitude} longitude={longitude} missions={missions} />
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading, isError } = useProject(projectId)
  const updateProject = useUpdateProject()
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [description, setDescription] = useState('')

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (isError || !project) return <ErrorState />

  const missionTotal = project.missionCount ?? 0
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
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-slate-950 font-semibold">Project Notes</h3>
                {!isEditingNotes && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDescription(project.description ?? '')
                      setIsEditingNotes(true)
                    }}
                  >
                    <Edit3 size={14} />Edit
                  </Button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="mt-3 space-y-3">
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={5}
                    maxLength={1000}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600"
                    placeholder="Add project notes..."
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">{description.length}/1000</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingNotes(false)}
                      >
                        <X size={14} />Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        loading={updateProject.isPending}
                        onClick={() => {
                          updateProject.mutate(
                            { id: projectId, data: { description: description.trim() } },
                            { onSuccess: () => setIsEditingNotes(false) }
                          )
                        }}
                      >
                        <Save size={14} />Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-600 text-sm mt-2 leading-6">
                  {project.description || 'No description has been added for this project yet.'}
                </p>
              )}
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
    { id: 'missions', label: 'Missions', content: <MissionsTab projectId={projectId} /> },
    {
      id: 'map', label: 'Map',
      content: projectCoords
        ? <ProjectMapTab latitude={projectCoords.latitude} longitude={projectCoords.longitude} projectId={projectId} />
        : <p className="text-slate-500 text-center py-12">No location set for this project.</p>,
    },
  ]

  return (
    <PageShell
      title={project.name}
      subtitle={`${missionTotal} missions`}
      backHref="/projects"
      backLabel="Projects"
      actions={
        <>
          <DeleteProjectButton projectId={projectId} projectName={project.name} />
          <Link href={`/projects/${projectId}/missions/new`}>
            <Button><Plus size={16} />New Mission</Button>
          </Link>
        </>
      }
    >
      <Tabs tabs={tabs} />
    </PageShell>
  )
}
