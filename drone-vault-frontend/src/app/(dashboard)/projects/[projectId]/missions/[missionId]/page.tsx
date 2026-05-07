'use client'
import { useParams } from 'next/navigation'
import { useMission } from '@/hooks/useMissions'
import { useFiles, useCaptureSets, useOrthomosaics } from '@/hooks/useFiles'
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
import { Calendar, FileImage, HardDrive, Upload } from 'lucide-react'
import Link from 'next/link'

export default function MissionDetailPage() {
  const { projectId, missionId } = useParams<{ projectId: string; missionId: string }>()
  const { data: mission, isLoading, isError } = useMission(missionId)
  const { data: captureSetsData } = useCaptureSets(missionId)
  const { data: orthomosaics } = useOrthomosaics(missionId)

  const captureSets = captureSetsData?.pages.flatMap(p => p.data) ?? []

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (isError || !mission) return <ErrorState />

  const tabs = [
    {
      id: 'summary', label: 'Summary',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1"><Calendar size={14} />Capture Date</div>
              <p className="text-white font-semibold">{formatDate(mission.captureDate)}</p>
            </div>
            {mission.fileCount != null && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1"><FileImage size={14} />Files</div>
                <p className="text-white font-semibold">{mission.fileCount}</p>
              </div>
            )}
            {mission.storageUsed != null && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1"><HardDrive size={14} />Storage</div>
                <p className="text-white font-semibold">{formatBytes(mission.storageUsed)}</p>
              </div>
            )}
          </div>
          {mission.notes && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-sm font-medium mb-2">Notes</p>
              <p className="text-slate-300">{mission.notes}</p>
            </div>
          )}
        </div>
      ),
    },
    { id: 'rgb', label: 'RGB Images', content: <ImageGallery missionId={missionId} fileType="RGB_JPG" /> },
    { id: 'multispectral', label: 'Multispectral', content: <ImageGallery missionId={missionId} fileType="MS_TIF" /> },
    {
      id: 'capturesets', label: 'Capture Sets',
      content: captureSets.length
        ? <div className="space-y-3">{captureSets.map(cs => <CaptureSetCard key={cs.id} captureSet={cs} />)}</div>
        : <p className="text-slate-400 text-center py-12">No capture sets yet.</p>,
    },
    { id: 'orthomosaics', label: 'Orthomosaics', content: <OrthomosaicViewer orthomosaics={orthomosaics ?? []} /> },
    { id: 'map', label: 'Map', content: <MissionMapDynamic captureSets={captureSets} /> },
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
