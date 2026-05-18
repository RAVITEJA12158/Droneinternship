'use client'
import { useState } from 'react'
import {
  ArrowLeftRight,
  BrainCircuit,
  Download,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  RotateCcw,
  SlidersHorizontal,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useLabelling } from '@/hooks/useLabelling'
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

type CompareMode = 'single' | 'blend' | 'swipe'
type LayerKey = 'prediction' | 'confidence'

function formatNumber(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A'
  return value.toFixed(3)
}

function formatPercent(value: number) {
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`
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

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
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

export function DiseasePredictionPanel({ missionId, orthomosaics }: Props) {
  const { data: job, isLoading, isError } = useLabelling(missionId)
  const [activeLayer, setActiveLayer] = useState<LayerKey>('prediction')
  const [zoom, setZoom] = useState(1)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [opacity, setOpacity] = useState(70)
  const [compareMode, setCompareMode] = useState<CompareMode>('single')
  const [swipePosition, setSwipePosition] = useState(50)

  const rgbOrthomosaic = orthomosaics.find(o => o.type === 'RGB')
  const diseaseStats = job?.stats?.diseasePrediction
  const predictionUrl = job?.stats?.visualizations?.diseasePredictionMapUrl
  const confidenceUrl = job?.stats?.visualizations?.diseasePredictionConfidenceMapUrl
  const layerUrls: Record<LayerKey, string | null | undefined> = {
    prediction: predictionUrl,
    confidence: confidenceUrl,
  }
  const activeUrl = layerUrls[activeLayer] || predictionUrl || confidenceUrl
  const rgbUrl = rgbOrthomosaic ? orthomosaicsApi.getPreviewUrl(rgbOrthomosaic.id) : null
  const canCompareWithRgb = Boolean(rgbUrl && activeUrl)
  const effectiveCompareMode = canCompareWithRgb ? compareMode : 'single'
  const classStats = Object.values(diseaseStats?.classes ?? {}).filter(item => item.id !== 255)
  const uncertainClass = Object.values(diseaseStats?.classes ?? {}).find(item => item.id === 255)

  const resetViewer = () => {
    setZoom(1)
    setOpacity(70)
    setSwipePosition(50)
  }

  const handleDownloadImage = async () => {
    if (!activeUrl) return
    try {
      const response = await fetch(activeUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `disease-prediction-${activeLayer}-${missionId}.png`
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
          Disease prediction output is not available yet.
        </div>
      )
    }

    const imageClass = fullscreen
      ? 'absolute inset-0 h-full w-full object-contain transition-transform duration-200'
      : 'absolute inset-0 h-full w-full object-contain transition-transform duration-200'

    return (
      <div className={`${fullscreen ? 'h-full' : 'h-[28rem] sm:h-[34rem]'} relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950/5`}>
        {effectiveCompareMode !== 'single' && rgbUrl && (
          <img
            src={rgbUrl}
            alt="RGB comparison base"
            className={imageClass}
            style={{ transform: `scale(${zoom})` }}
          />
        )}
        <img
          src={activeUrl}
          alt={`Disease prediction ${activeLayer}`}
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

  if (!job) {
    return (
      <EmptyState
        icon={BrainCircuit}
        title="No disease prediction yet"
        description="Run the labelling workflow first. Disease prediction is generated immediately after labelling finishes."
      />
    )
  }

  if (job.status === 'PENDING' || job.status === 'PROCESSING') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
          <BrainCircuit size={28} />
        </div>
        <h3 className="text-lg font-semibold text-slate-950">Disease prediction is pending</h3>
        <p className="mt-2 text-sm text-slate-500">This stage starts automatically after labelling completes.</p>
      </div>
    )
  }

  if (!diseaseStats || diseaseStats.status === 'skipped') {
    return (
      <EmptyState
        icon={BrainCircuit}
        title="Disease prediction not available"
        description={diseaseStats?.error || 'No disease prediction outputs were generated for this mission.'}
      />
    )
  }

  if (diseaseStats.status === 'failed') {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 shadow-sm">
        <h3 className="text-center text-lg font-bold text-red-700">Disease prediction failed</h3>
        <div className="mx-auto mt-4 max-w-3xl rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-900">
          {diseaseStats.error || 'The disease prediction step failed unexpectedly.'}
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
                Disease Prediction Viewer
              </div>
              <p className="mt-1 text-sm text-slate-500">Inspect the prediction map, compare it against RGB, and review model confidence.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleDownloadImage} disabled={!activeUrl}>
                <Download size={15} />Layer
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!predictionUrl}
              onClick={() => {
                setActiveLayer('prediction')
                setZoom(1)
              }}
              className={`h-9 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                activeLayer === 'prediction'
                  ? 'border-cyan-600 bg-cyan-50 text-cyan-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              Prediction
            </button>
            <button
              type="button"
              disabled={!confidenceUrl}
              onClick={() => {
                setActiveLayer('confidence')
                setZoom(1)
              }}
              className={`h-9 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                activeLayer === 'confidence'
                  ? 'border-cyan-600 bg-cyan-50 text-cyan-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              Confidence
            </button>
          </div>
        </div>

        <div className="space-y-3 bg-slate-50 p-4">
          {renderViewerToolbar()}
          {renderViewerImage()}
          {canCompareWithRgb ? (
            <p className="text-xs text-slate-500">Blend and swipe compare the active disease layer against the RGB orthomosaic.</p>
          ) : (
            <p className="text-xs text-slate-500">Upload an RGB orthomosaic to enable blend and swipe comparison.</p>
          )}
        </div>

        {isFullScreen && activeUrl && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white" role="dialog" aria-modal="true">
            <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold">{activeLayer === 'prediction' ? 'Prediction' : 'Confidence'}</p>
                <p className="text-xs text-slate-400">Fullscreen disease prediction viewer</p>
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
            <ArtifactLink label="Disease Prediction TIFF" href={job.stats?.artifacts?.diseasePredictionTifUrl} />
            <ArtifactLink label="Disease Prediction JSON" href={job.stats?.artifacts?.diseasePredictionStatsJsonUrl} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <BrainCircuit size={18} className="text-cyan-700" />
            Model Stats
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Status" value={diseaseStats.status ?? 'N/A'} />
            <StatTile label="Avg Confidence" value={formatNumber(diseaseStats.average_confidence)} />
            <StatTile label="Tiles" value={diseaseStats.num_tiles ?? 'N/A'} />
            <StatTile label="Covered Pixels" value={diseaseStats.covered_pixels ?? 'N/A'} />
            <StatTile label="Patch Size" value={diseaseStats.patch_size ?? 'N/A'} />
            <StatTile label="Uncertain Pixels" value={formatPercent(uncertainClass?.percentage ?? 0)} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <BrainCircuit size={18} className="text-cyan-700" />
            Model Details
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-xs font-medium text-slate-500">Checkpoint</p>
              <p className="mt-1 break-all font-medium text-slate-950">{diseaseStats.checkpoint_name ?? 'N/A'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-xs font-medium text-slate-500">Runtime</p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                <span>Model</span><span className="text-right text-slate-950">{diseaseStats.model_name ?? 'N/A'}</span>
                <span>Device</span><span className="text-right text-slate-950">{diseaseStats.device ?? 'N/A'}</span>
                <span>Stride</span><span className="text-right text-slate-950">{diseaseStats.stride ?? 'N/A'}</span>
                <span>Threshold</span><span className="text-right text-slate-950">{formatNumber(diseaseStats.prediction_threshold)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <BrainCircuit size={18} className="text-cyan-700" />
            Predicted Classes
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
              <p className="text-sm text-slate-500">No disease prediction class summary available.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
