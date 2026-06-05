'use client'
import { useState } from 'react'
import { Download, Image as ImageIcon, Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { useLabelling, useResumeYield } from '@/hooks/useLabelling'
import { Orthomosaic } from '@/types'
import { orthomosaicsApi } from '@/lib/api/orthomosaics'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface Props {
  missionId: string
  orthomosaics: Orthomosaic[]
}

function IconButton({ label, onClick, children, disabled, tone = 'light' }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; tone?: 'light' | 'dark' }) {
  const className = tone === 'dark'
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function ArtifactLink({ label, href }: { label: string; href?: string | null }) {
  const resolvedHref = href
    ? /^https?:\/\//.test(href)
      ? href
      : href.startsWith('/')
      ? `${apiBaseUrl}${href}`
      : href
    : undefined

  return (
    <a
      href={resolvedHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!href}
      className={`inline-flex h-9 items-center justify-between gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
        href
          ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950'
          : 'pointer-events-none border-slate-100 bg-slate-50 text-slate-300'
      }`}
    >
      <span className="truncate">{label}</span>
      <Download size={14} className="shrink-0" />
    </a>
  )
}

export function YieldPredictionPanel({ missionId, orthomosaics }: Props) {
  const { data: job, isLoading, isError } = useLabelling(missionId)
  const resume = useResumeYield(missionId)
  const [zoom, setZoom] = useState(1)
  const [isFullScreen, setIsFullScreen] = useState(false)

  const rgbOrthomosaic = orthomosaics.find(o => o.type === 'RGB')
  const yieldStats = job?.stats?.yieldPrediction
  const predictionUrl = job?.stats?.visualizations?.yieldPredictionHeatmapUrl
  const rgbUrl = rgbOrthomosaic ? orthomosaicsApi.getPreviewUrl(rgbOrthomosaic.id) : null

  const resetViewer = () => setZoom(1)

  const handleDownloadImage = async () => {
    if (!predictionUrl) return
    try {
      const response = await fetch(predictionUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `yield-prediction-${missionId}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download image', err)
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (isError) return <ErrorState />

  if (!job) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No yield prediction yet"
        description="Run the labelling workflow first. Yield prediction is generated immediately after labelling finishes."
      />
    )
  }

  if (job.status === 'PENDING' || job.status === 'PROCESSING') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
          <ImageIcon size={28} />
        </div>
        <h3 className="text-lg font-semibold text-slate-950">Yield prediction is pending</h3>
        <p className="mt-2 text-sm text-slate-500">This stage starts automatically after labelling completes.</p>
      </div>
    )
  }

  if (!yieldStats || yieldStats.status === 'skipped') {
    return (
      <div>
        <EmptyState
          icon={ImageIcon}
          title="Yield prediction not available"
          description={yieldStats?.error || 'No yield prediction outputs were generated for this mission.'}
        />
        <div className="mt-3 flex justify-center">
          <Button loading={resume.isPending} onClick={() => resume.mutate()}>
            Retry yield prediction
          </Button>
        </div>
      </div>
    )
  }

  if (yieldStats.status === 'failed') {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 shadow-sm">
        <h3 className="text-center text-lg font-bold text-red-700">Yield prediction failed</h3>
        <div className="mx-auto mt-4 max-w-3xl rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-900">
          {yieldStats.error || 'The yield prediction step failed unexpectedly.'}
        </div>
        <div className="mt-4 flex justify-center">
          <Button loading={resume.isPending} onClick={() => resume.mutate()}>
            Retry yield prediction
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-950">
            <ImageIcon size={18} className="text-cyan-700" />
            Yield Prediction Viewer
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownloadImage} disabled={!predictionUrl}>
              <Download size={15} />Download
            </Button>
          </div>
        </div>

        <div className="space-y-3 bg-slate-50 p-4">
          <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950/5 h-[28rem] sm:h-[34rem]">
            {rgbUrl && (
              <img src={rgbUrl} alt="RGB base" className="absolute inset-0 h-full w-full object-contain" style={{ transform: `scale(${zoom})` }} />
            )}
            {predictionUrl ? (
              <img src={predictionUrl} alt="Yield prediction heatmap" className="absolute inset-0 h-full w-full object-contain" style={{ transform: `scale(${zoom})`, zIndex: 2 }} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Yield prediction output is not available yet.</div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <IconButton label="Zoom out" onClick={() => setZoom(v => Math.max(0.5, v - 0.25))}>
                <ZoomOut size={17} />
              </IconButton>
              <span className="inline-flex h-9 min-w-16 items-center justify-center rounded-lg border px-2 text-xs font-semibold border-slate-200 bg-white text-slate-600">{Math.round(zoom * 100)}%</span>
              <IconButton label="Zoom in" onClick={() => setZoom(v => Math.min(4, v + 0.25))}>
                <ZoomIn size={17} />
              </IconButton>
              <IconButton label="Reset view" onClick={resetViewer}>
                <RotateCcw size={17} />
              </IconButton>
            </div>

            <div className="flex gap-2">
              <IconButton label="Open fullscreen" onClick={() => setIsFullScreen(true)} disabled={!predictionUrl}>
                <Maximize2 size={17} />
              </IconButton>
            </div>
          </div>
        </div>

        {isFullScreen && predictionUrl && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <p className="text-sm font-semibold">Yield prediction</p>
                <p className="text-xs text-slate-400">Fullscreen heatmap viewer</p>
              </div>
              <div className="flex gap-3">
                <IconButton label="Exit fullscreen" onClick={() => setIsFullScreen(false)} tone="dark">
                  <Minimize2 size={18} />
                </IconButton>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-4">
              <img src={predictionUrl} alt="Yield prediction" className="h-full w-full object-contain" />
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <Download size={18} className="text-cyan-700" />
            Output Downloads
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <ArtifactLink label="Yield Prediction JSON" href={job?.stats?.artifacts?.yieldPredictionStatsJsonUrl} />
            <ArtifactLink label="Yield Prediction Report" href={job?.stats?.artifacts?.yieldPredictionReportUrl} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <ImageIcon size={18} className="text-cyan-700" />
            Model Stats
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Status" value={yieldStats?.status ?? 'N/A'} />
            <StatTile label="Predicted (t)" value={yieldStats?.predicted_yield_tonnes ?? 'N/A'} />
            <StatTile label="Patches" value={yieldStats?.num_patches ?? 'N/A'} />
            <StatTile label="Patch Size" value={yieldStats?.patch_size ?? 'N/A'} />
            <StatTile label="Batch Size" value={yieldStats?.batch_size ?? 'N/A'} />
            <StatTile label="Device" value={yieldStats?.device ?? 'N/A'} />
          </div>
        </div>
      </aside>
    </div>
  )
}
