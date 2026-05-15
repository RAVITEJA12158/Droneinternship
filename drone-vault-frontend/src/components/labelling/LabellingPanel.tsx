'use client'
import { useState } from 'react'
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  BrainCircuit,
  Download,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Square,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useLabelling, useStartLabelling, useStopLabelling } from '@/hooks/useLabelling'
import { Orthomosaic } from '@/types'
import { orthomosaicsApi } from '@/lib/api/orthomosaics'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'

interface Props {
  missionId: string
  orthomosaics: Orthomosaic[]
}

const layerLabels = {
  rgb: 'RGB',
  multispectral: 'Multispectral',
  composite: 'Composite',
  ndvi: 'NDVI',
  ndre: 'NDRE',
  superpixels: 'Superpixels',
  labels: 'Labels',
  overlay: 'Overlay',
  confidence: 'Confidence',
  ndviHistogram: 'NDVI Hist',
  ndreHistogram: 'NDRE Hist',
  classDistribution: 'Classes',
  scatter: 'NDVI/NDRE',
}

type LayerKey = keyof typeof layerLabels
type CompareMode = 'single' | 'blend' | 'swipe'

function formatNumber(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A'
  return value.toFixed(3)
}

function formatPercent(value: number) {
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`
}

function formatMethod(value?: string) {
  if (!value) return 'N/A'
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getProcessingProgress(job: { stats?: { message?: string; progress?: number } | null; status: string }) {
  if (typeof job.stats?.progress === 'number' && Number.isFinite(job.stats.progress)) {
    return Math.max(0, Math.min(100, Math.round(job.stats.progress)))
  }

  const stepMatch = job.stats?.message?.match(/\b(\d+)\s*\/\s*(\d+)\b/)
  if (stepMatch) {
    const current = Number(stepMatch[1])
    const total = Number(stepMatch[2])
    if (total > 0) return Math.max(0, Math.min(99, Math.round((current / total) * 100)))
  }

  return job.status === 'PROCESSING' ? 5 : 0
}

function IconButton({
  label,
  onClick,
  children,
  disabled,
  tone = 'light',
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  tone?: 'light' | 'dark'
}) {
  const className = tone === 'dark'
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}

function StatTile({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'success' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone === 'success' ? 'text-emerald-700' : 'text-slate-950'}`}>{value}</p>
    </div>
  )
}

function ArtifactLink({ label, href }: { label: string; href?: string | null }) {
  return (
    <a
      href={href || undefined}
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

export function LabellingPanel({ missionId, orthomosaics }: Props) {
  const { data: job, isLoading, isError } = useLabelling(missionId)
  const startLabelling = useStartLabelling(missionId)
  const stopLabelling = useStopLabelling(missionId)
  const [activeLayer, setActiveLayer] = useState<LayerKey>('labels')
  const [zoom, setZoom] = useState(1)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [opacity, setOpacity] = useState(70)
  const [compareMode, setCompareMode] = useState<CompareMode>('single')
  const [swipePosition, setSwipePosition] = useState(50)

  const rgbOrthomosaic = orthomosaics.find(o => o.type === 'RGB')
  const multispectral = orthomosaics.find(o => o.type === 'MULTISPECTRAL')
  const isProcessing = job?.status === 'PENDING' || job?.status === 'PROCESSING'
  const isCompleted = job?.status === 'COMPLETED'
  const classStats = Object.values(job?.stats?.classes ?? {}).filter(item => item.id !== 255)
  const uncertainClass = Object.values(job?.stats?.classes ?? {}).find(item => item.id === 255)
  const totalSegments = job?.stats?.segments?.length ?? 0
  const avgConfidence = totalSegments
    ? (job?.stats?.segments ?? []).reduce((sum, segment) => sum + (segment.confidence ?? 0), 0) / totalSegments
    : undefined

  const layerUrls: Record<LayerKey, string | null | undefined> = {
    rgb: rgbOrthomosaic ? orthomosaicsApi.getPreviewUrl(rgbOrthomosaic.id) : null,
    multispectral: multispectral ? orthomosaicsApi.getPreviewUrl(multispectral.id) : null,
    composite: job?.stats?.visualizations?.sourceCompositeMapUrl,
    ndvi: job?.ndviMapUrl,
    ndre: job?.ndreMapUrl,
    superpixels: job?.stats?.visualizations?.superpixelsMapUrl,
    labels: job?.labelMapUrl,
    overlay: job?.stats?.visualizations?.overlayMapUrl,
    confidence: job?.stats?.visualizations?.confidenceMapUrl,
    ndviHistogram: job?.stats?.visualizations?.ndviHistogramUrl,
    ndreHistogram: job?.stats?.visualizations?.ndreHistogramUrl,
    classDistribution: job?.stats?.visualizations?.classDistributionUrl,
    scatter: job?.stats?.visualizations?.ndviNdreScatterUrl,
  }
  const activeUrl =
    layerUrls[activeLayer] ||
    layerUrls.labels ||
    layerUrls.overlay ||
    layerUrls.ndvi ||
    layerUrls.composite ||
    layerUrls.confidence ||
    layerUrls.rgb ||
    layerUrls.multispectral
  const canCompareWithRgb = Boolean(layerUrls.rgb && activeUrl && activeLayer !== 'rgb')
  const effectiveCompareMode = canCompareWithRgb ? compareMode : 'single'
  const artifactLinks = [
    { label: 'NDVI TIFF', href: job?.stats?.artifacts?.ndviTifUrl },
    { label: 'NDRE TIFF', href: job?.stats?.artifacts?.ndreTifUrl },
    { label: 'Labels TIFF', href: job?.stats?.artifacts?.labelsTifUrl },
    { label: 'Superpixels TIFF', href: job?.stats?.artifacts?.superpixelsTifUrl },
    { label: 'Statistics JSON', href: job?.stats?.artifacts?.statisticsJsonUrl },
    { label: 'Summary CSV', href: job?.stats?.artifacts?.datasetSummaryCsvUrl },
  ]

  const resetViewer = () => {
    setZoom(1)
    setOpacity(70)
    setSwipePosition(50)
  }

  const downloadStats = () => {
    if (!job?.stats) return
    const blob = new Blob([JSON.stringify(job.stats, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `labelling-stats-${missionId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleDownloadImage = async () => {
    if (!activeUrl) return
    try {
      const response = await fetch(activeUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `labelling-${activeLayer}-${missionId}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download image', err)
    }
  }

  const renderViewerImage = (fullscreen = false) => {
    if (!activeUrl) {
      return (
        <div className="flex h-full min-h-[28rem] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500">
          Layer is not available yet.
        </div>
      )
    }

    const imageClass = fullscreen
      ? 'absolute inset-0 h-full w-full object-contain transition-transform duration-200'
      : 'absolute inset-0 h-full w-full object-contain transition-transform duration-200'

    return (
      <div className={`${fullscreen ? 'h-full' : 'h-[28rem] sm:h-[34rem]'} relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950/5`}>
        {effectiveCompareMode !== 'single' && layerUrls.rgb && (
          <img
            src={layerUrls.rgb}
            alt="RGB comparison base"
            className={imageClass}
            style={{ transform: `scale(${zoom})` }}
          />
        )}
        <img
          src={activeUrl}
          alt={`${layerLabels[activeLayer]} labelling layer`}
          className={imageClass}
          style={{
            transform: `scale(${zoom})`,
            opacity: effectiveCompareMode === 'blend' ? opacity / 100 : 1,
            clipPath: effectiveCompareMode === 'swipe' ? `inset(0 ${100 - swipePosition}% 0 0)` : undefined,
            zIndex: 2,
          }}
        />
        {effectiveCompareMode === 'swipe' && (
          <>
            <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-cyan-500" style={{ left: `${swipePosition}%` }} />
            <div
              className="pointer-events-none absolute top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg"
              style={{ left: `${swipePosition}%` }}
            >
              <ArrowLeftRight size={17} />
            </div>
            <input
              type="range"
              aria-label="Comparison position"
              min="0"
              max="100"
              value={swipePosition}
              onChange={event => setSwipePosition(Number(event.target.value))}
              className="absolute inset-x-6 bottom-5 z-20 accent-cyan-600"
            />
          </>
        )}
      </div>
    )
  }

  const renderViewerToolbar = (tone: 'light' | 'dark' = 'light') => {
    const isDark = tone === 'dark'
    const segmentedClass = isDark
      ? 'border-white/10 bg-white/10 text-slate-200'
      : 'border-slate-200 bg-white text-slate-600'
    const activeClass = isDark ? 'bg-white text-slate-950' : 'bg-cyan-50 text-cyan-800'
    const inactiveClass = isDark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-50 hover:text-slate-950'

    return (
      <div className={`flex flex-col gap-3 ${isDark ? 'text-slate-200' : 'text-slate-700'} lg:flex-row lg:items-center lg:justify-between`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex rounded-lg border p-1 ${segmentedClass}`}>
            {(['single', 'blend', 'swipe'] as CompareMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                disabled={mode !== 'single' && !canCompareWithRgb}
                onClick={() => setCompareMode(mode)}
                className={`h-8 rounded-md px-3 text-xs font-semibold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${effectiveCompareMode === mode ? activeClass : inactiveClass}`}
              >
                {mode}
              </button>
            ))}
          </div>
          {effectiveCompareMode === 'blend' && (
            <div className={`flex h-10 items-center gap-2 rounded-lg border px-3 ${segmentedClass}`}>
              <SlidersHorizontal size={15} />
              <input
                type="range"
                aria-label="Overlay opacity"
                min="0"
                max="100"
                value={opacity}
                onChange={event => setOpacity(Number(event.target.value))}
                className="w-24 accent-cyan-600"
              />
              <span className="w-9 text-right text-xs font-semibold">{opacity}%</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Zoom out" onClick={() => setZoom(value => Math.max(0.5, value - 0.25))} tone={tone}>
            <ZoomOut size={17} />
          </IconButton>
          <span className={`inline-flex h-9 min-w-16 items-center justify-center rounded-lg border px-2 text-xs font-semibold ${segmentedClass}`}>
            {Math.round(zoom * 100)}%
          </span>
          <IconButton label="Zoom in" onClick={() => setZoom(value => Math.min(4, value + 0.25))} tone={tone}>
            <ZoomIn size={17} />
          </IconButton>
          <IconButton label="Reset view" onClick={resetViewer} tone={tone}>
            <RotateCcw size={17} />
          </IconButton>
          <IconButton label="Download active layer" onClick={handleDownloadImage} disabled={!activeUrl} tone={tone}>
            <Download size={17} />
          </IconButton>
          {!isDark && (
            <IconButton label="Open fullscreen viewer" onClick={() => setIsFullScreen(true)} disabled={!activeUrl} tone={tone}>
              <Maximize2 size={17} />
            </IconButton>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (isError) return <ErrorState />

  if (!multispectral) {
    return (
      <EmptyState
        icon={Layers}
        title="No multispectral orthomosaic"
        description="Upload a multispectral orthomosaic before running crop labelling."
      />
    )
  }

  if (!job) {
    return (
      <EmptyState
        icon={BrainCircuit}
        title="Ready for crop labelling"
        description="Upload a multispectral orthomosaic, then run the workflow. RGB is optional and only used as a visual reference."
        action={
          <Button loading={startLabelling.isPending} onClick={() => startLabelling.mutate()}>
            <Play size={16} />{startLabelling.isPending ? 'Starting...' : 'Start Labelling'}
          </Button>
        }
      />
    )
  }

  if (isProcessing) {
    const liveMessage = job.stats?.message || (job.status === 'PENDING' ? 'Waiting to start...' : 'Starting process...')
    const progress = getProcessingProgress(job)

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
          <RefreshCw size={28} className="animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-slate-950">Analyzing crop health</h3>
        <div className="mx-auto mt-5 max-w-xl text-left">
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <span className="min-w-0 truncate font-medium text-slate-700">{liveMessage}</span>
            <span className="font-semibold text-cyan-700">{progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-cyan-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">Status: {job.status}. The dashboard will update automatically.</p>
        <div className="mt-5 flex justify-center">
          <Button variant="danger" loading={stopLabelling.isPending} onClick={() => stopLabelling.mutate()}>
            <Square size={15} />Stop Processing
          </Button>
        </div>
      </div>
    )
  }

  if (job.status === 'FAILED') {
    const wasStopped = Boolean(job.stats?.stopped)
    return (
      <div className={`rounded-xl bg-white p-8 shadow-sm ${wasStopped ? 'border border-amber-200' : 'border border-red-200'}`}>
        <h3 className={`text-center text-lg font-bold ${wasStopped ? 'text-amber-700' : 'text-red-700'}`}>
          {wasStopped ? 'Labelling stopped' : 'Labelling failed'}
        </h3>
        <div className={`mx-auto mt-4 max-w-3xl rounded-lg border p-4 text-sm ${wasStopped ? 'border-amber-100 bg-amber-50 text-amber-900' : 'border-red-100 bg-red-50 text-red-900'}`}>
          {job.stats?.error || (wasStopped ? 'Processing was stopped before completion.' : 'The Python labelling job failed unexpectedly.')}
        </div>
        <div className="mt-5 flex justify-center">
          <Button loading={startLabelling.isPending} onClick={() => startLabelling.mutate()}>
            {startLabelling.isPending ? <RefreshCw size={16} /> : <Play size={16} />}
            {startLabelling.isPending ? 'Starting...' : wasStopped ? 'Start Again' : 'Run Again'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 font-semibold text-slate-950">
                <ImageIcon size={18} className="text-cyan-700" />
                Labelling Viewer
              </div>
              <p className="mt-1 text-sm text-slate-500">Inspect generated maps, compare against RGB, and download the current layer.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={downloadStats}>
                <Download size={15} />Stats JSON
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownloadImage} disabled={!activeUrl}>
                <Download size={15} />Layer
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(layerLabels) as LayerKey[]).map(layer => (
              <button
                key={layer}
                type="button"
                disabled={!layerUrls[layer]}
                onClick={() => {
                  setActiveLayer(layer)
                  setZoom(1)
                  if (layer === 'rgb') setCompareMode('single')
                }}
                className={`h-9 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  activeLayer === layer
                    ? 'border-cyan-600 bg-cyan-50 text-cyan-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                {layerLabels[layer]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 bg-slate-50 p-4">
          {renderViewerToolbar()}
          {renderViewerImage()}
          {canCompareWithRgb ? (
            <p className="text-xs text-slate-500">Blend and swipe compare the active layer against the RGB orthomosaic. Composite is generated from the multispectral bands.</p>
          ) : (
            <p className="text-xs text-slate-500">Upload an RGB orthomosaic to enable blend and swipe comparison.</p>
          )}
        </div>

        {isFullScreen && activeUrl && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white" role="dialog" aria-modal="true">
            <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold">{layerLabels[activeLayer]}</p>
                <p className="text-xs text-slate-400">Fullscreen labelling viewer</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {renderViewerToolbar('dark')}
                <IconButton label="Exit fullscreen" onClick={() => setIsFullScreen(false)} tone="dark">
                  <Minimize2 size={18} />
                </IconButton>
                <IconButton label="Close viewer" onClick={() => setIsFullScreen(false)} tone="dark">
                  <X size={18} />
                </IconButton>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-4">
              {renderViewerImage(true)}
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
            {artifactLinks.map(item => (
              <ArtifactLink key={item.label} label={item.label} href={item.href} />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <Activity size={18} className="text-cyan-700" />
            Vital Stats
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Mean NDVI" value={formatNumber(job.stats?.ndvi?.mean)} />
            <StatTile label="Mean NDRE" value={formatNumber(job.stats?.ndre?.mean)} />
            <StatTile label="Segments" value={totalSegments} />
            <StatTile label="Status" value={isCompleted ? 'Ready' : job.status} tone="success" />
            <StatTile label="Avg Confidence" value={formatNumber(avgConfidence)} />
            <StatTile label="Uncertain Pixels" value={formatPercent(uncertainClass?.percentage ?? 0)} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <BarChart3 size={18} className="text-cyan-700" />
            Field Classes
          </div>
          <div className="space-y-3">
            {classStats.length ? classStats.map(item => (
              <div key={item.id}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-slate-700">
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="shrink-0 text-slate-500">{formatPercent(item.percentage)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(item.percentage, 100)}%`, backgroundColor: item.color }} />
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500">No class summary available.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <BrainCircuit size={18} className="text-cyan-700" />
            Workflow Details
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-xs font-medium text-slate-500">Method</p>
              <p className="mt-1 font-medium text-slate-950">{formatMethod(job.stats?.labeling_method)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-xs font-medium text-slate-500">Parameters</p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                <span>Segments</span><span className="text-right text-slate-950">{job.stats?.parameters?.n_segments ?? 'N/A'}</span>
                <span>Compactness</span><span className="text-right text-slate-950">{job.stats?.parameters?.compactness ?? 'N/A'}</span>
                <span>Min pixels</span><span className="text-right text-slate-950">{job.stats?.parameters?.min_segment_pixels ?? 'N/A'}</span>
                <span>Confidence</span><span className="text-right text-slate-950">{job.stats?.parameters?.confidence_threshold ?? 'N/A'}</span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-xs font-medium text-slate-500">Index Percentiles</p>
              <div className="mt-2 grid grid-cols-[auto_1fr_1fr_1fr] gap-x-3 gap-y-1">
                <span />
                <span className="text-right text-xs text-slate-500">P25</span>
                <span className="text-right text-xs text-slate-500">P50</span>
                <span className="text-right text-xs text-slate-500">P75</span>
                <span>NDVI</span>
                <span className="text-right text-slate-950">{formatNumber(job.stats?.ndvi_percentiles?.p25)}</span>
                <span className="text-right text-slate-950">{formatNumber(job.stats?.ndvi_percentiles?.p50)}</span>
                <span className="text-right text-slate-950">{formatNumber(job.stats?.ndvi_percentiles?.p75)}</span>
                <span>NDRE</span>
                <span className="text-right text-slate-950">{formatNumber(job.stats?.ndre_percentiles?.p25)}</span>
                <span className="text-right text-slate-950">{formatNumber(job.stats?.ndre_percentiles?.p50)}</span>
                <span className="text-right text-slate-950">{formatNumber(job.stats?.ndre_percentiles?.p75)}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
