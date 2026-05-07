'use client'
import { useParams } from 'next/navigation'
import { useMission } from '@/hooks/useMissions'
import { useCaptureSets, useFiles, useOrthomosaics } from '@/hooks/useFiles'
import { PageShell } from '@/components/layout/PageShell'
import { Tabs } from '@/components/ui/Tabs'
import { ImageGallery } from '@/components/gallery/ImageGallery'
import { CaptureSetCard } from '@/components/gallery/CaptureSetCard'
import { OrthomosaicViewer } from '@/components/orthomosaic/OrthomosaicViewer'
import { ExportPanel } from '@/components/export/ExportPanel'
import { MissionMapDynamic } from '@/components/map/MissionMapDynamic'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { formatDate } from '@/lib/utils/formatDate'
import { formatBytes } from '@/lib/utils/formatBytes'
import { Calendar, FileImage, HardDrive, Layers, ScanLine, Upload } from 'lucide-react'
import Link from 'next/link'

function CaptureSetsTab({ missionId }: { missionId: string }) {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCaptureSets(missionId)
  const captureSets = data?.pages.flatMap(p => p.data) ?? []

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (isError) return <ErrorState />

  if (!captureSets.length) {
    return <p className="text-slate-500 text-center py-12">No capture sets yet.</p>
  }

  return (
    <div className="space-y-3">
      {captureSets.map(cs => <CaptureSetCard key={cs.id} captureSet={cs} />)}
      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? <Spinner size="sm" /> : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}

function OrthomosaicsTab({ missionId }: { missionId: string }) {
  const { data, isLoading, isError } = useOrthomosaics(missionId)

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (isError) return <ErrorState />

  return <OrthomosaicViewer orthomosaics={data ?? []} />
}

function MissionMapTab({ missionId }: { missionId: string }) {
  const { data: captureSetsData, isLoading: isCaptureSetsLoading, isError: isCaptureSetsError } = useCaptureSets(missionId)
  const { data: plansData, isLoading: isPlansLoading, isError: isPlansError } = useFiles(missionId, 'MISSION_PLAN')
  const captureSets = captureSetsData?.pages.flatMap(p => p.data) ?? []
  const missionPlans = plansData?.pages.flatMap(p => p.data) ?? []

  if (isCaptureSetsLoading || isPlansLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (isCaptureSetsError || isPlansError) return <ErrorState />

  return <MissionMapDynamic captureSets={captureSets} missionPlans={missionPlans} />
}

export default function MissionDetailPage() {
  const { projectId, missionId } = useParams<{ projectId: string; missionId: string }>()
  const { data: mission, isLoading, isError } = useMission(missionId)

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (isError || !mission) return <ErrorState />

  const tabs = [
    {
      id: 'summary', label: 'Summary',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Calendar size={14} className="text-cyan-700" />Capture Date</div>
              <p className="text-slate-950 font-semibold">{formatDate(mission.captureDate)}</p>
            </div>
            {mission.fileCount != null && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><FileImage size={14} className="text-cyan-700" />Files</div>
                <p className="text-slate-950 font-semibold">{mission.fileCount}</p>
              </div>
            )}
            {mission.captureSetCount != null && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><ScanLine size={14} className="text-cyan-700" />Capture Sets</div>
                <p className="text-slate-950 font-semibold">{mission.captureSetCount}</p>
              </div>
            )}
            {mission.orthomosaicCount != null && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Layers size={14} className="text-cyan-700" />Orthomosaics</div>
                <p className="text-slate-950 font-semibold">{mission.orthomosaicCount}</p>
              </div>
            )}
            {mission.storageUsed != null && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><HardDrive size={14} className="text-cyan-700" />Storage</div>
                <p className="text-slate-950 font-semibold">{formatBytes(mission.storageUsed)}</p>
              </div>
            )}
          </div>
          {mission.notes && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-slate-500 text-sm font-medium mb-2">Notes</p>
              <p className="text-slate-700">{mission.notes}</p>
            </div>
          )}
        </div>
      ),
    },
    { id: 'rgb', label: 'RGB Images', content: <ImageGallery missionId={missionId} fileType="RGB_JPG" /> },
    { id: 'multispectral', label: 'Multispectral', content: <ImageGallery missionId={missionId} fileType="MS_TIF" /> },
    { id: 'capturesets', label: 'Capture Sets', content: <CaptureSetsTab missionId={missionId} /> },
    { id: 'orthomosaics', label: 'Orthomosaics', content: <OrthomosaicsTab missionId={missionId} /> },
    { id: 'map', label: 'Map', content: <MissionMapTab missionId={missionId} /> },
    { id: 'exports', label: 'Exports', content: <ExportPanel missionId={missionId} /> },
  ]

  return (
    <PageShell
      title={mission.name}
      subtitle={formatDate(mission.captureDate)}
      backHref={`/projects/${projectId}`}
      backLabel="Project"
      actions={
        <Link href={`/projects/${projectId}/missions/${missionId}/upload`}>
          <Button><Upload size={16} />Upload Data</Button>
        </Link>
      }
    >
      <Tabs tabs={tabs} />
    </PageShell>
  )
}
