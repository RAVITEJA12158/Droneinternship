'use client'
import { useState } from 'react'
import { Activity, BarChart3, BrainCircuit, Image as ImageIcon, Layers, Play, RefreshCw } from 'lucide-react'
import { useLabelling, useStartLabelling } from '@/hooks/useLabelling'
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
  ndvi: 'NDVI',
  ndre: 'NDRE',
  superpixels: 'Superpixels',
  labels: 'Labels',
  overlay: 'Overlay',
}

type LayerKey = keyof typeof layerLabels

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

export function LabellingPanel({ missionId, orthomosaics }: Props) {
  const { data: job, isLoading, isError } = useLabelling(missionId)
  const startLabelling = useStartLabelling(missionId)
  const [activeLayer, setActiveLayer] = useState<LayerKey>('labels')

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
    ndvi: job?.ndviMapUrl,
    ndre: job?.ndreMapUrl,
    superpixels: job?.stats?.visualizations?.superpixelsMapUrl,
    labels: job?.labelMapUrl,
    overlay: job?.stats?.visualizations?.overlayMapUrl,
  }
  const activeUrl =
    layerUrls[activeLayer] ||
    layerUrls.labels ||
    layerUrls.overlay ||
    layerUrls.ndvi ||
    layerUrls.rgb ||
    layerUrls.multispectral

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
        description="Upload both RGB and multispectral orthomosaics, then run the workflow. The multispectral orthomosaic is used to generate NDVI, NDRE, and crop labels."
        action={
          <Button loading={startLabelling.isPending} onClick={() => startLabelling.mutate()}>
            <Play size={16} />Start Labelling
          </Button>
        }
      />
    )
  }

  if (isProcessing) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
          <RefreshCw size={30} className="animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-slate-950">Analyzing crop health...</h3>
        <p className="mt-2 text-sm text-slate-500">Status: {job.status}. The dashboard will update when NDVI, NDRE, and label maps are ready.</p>
      </div>
    )
  }

  if (job.status === 'FAILED') {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 shadow-sm">
        <h3 className="text-lg font-semibold text-red-700">Labelling failed</h3>
        <p className="mt-2 text-sm text-slate-600">{job.stats?.error || 'The Python labelling job failed.'}</p>
        <Button className="mt-5" loading={startLabelling.isPending} onClick={() => startLabelling.mutate()}>
          <RefreshCw size={16} />Run Again
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-950">
              <ImageIcon size={18} className="text-cyan-700" />
              Labelling Outputs
            </div>
            <p className="mt-1 text-sm text-slate-500">RGB reference, multispectral source, and generated NDVI, NDRE, superpixel, label, and overlay visuals</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(layerLabels) as LayerKey[]).map(layer => (
              <button
                key={layer}
                type="button"
                disabled={!layerUrls[layer]}
                onClick={() => setActiveLayer(layer)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${activeLayer === layer ? 'border-cyan-600 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {layerLabels[layer]}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-100 p-3">
          {activeUrl ? (
            <img
              src={activeUrl}
              alt={`${layerLabels[activeLayer]} labelling layer`}
              className="h-[34rem] w-full rounded-lg border border-slate-200 bg-white object-contain"
            />
          ) : (
            <div className="flex h-[34rem] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
              Layer is not available yet.
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <Activity size={18} className="text-cyan-700" />
            Vital Stats
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">Mean NDVI</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(job.stats?.ndvi?.mean)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">Mean NDRE</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(job.stats?.ndre?.mean)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">Segments</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{totalSegments}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">Status</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">{isCompleted ? 'Ready' : job.status}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">Avg Confidence</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(avgConfidence)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">Uncertain Pixels</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{formatPercent(uncertainClass?.percentage ?? 0)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <BarChart3 size={18} className="text-cyan-700" />
            Field Classes
          </div>
          <div className="space-y-3">
            {classStats.map(item => (
              <div key={item.id}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="text-slate-500">{formatPercent(item.percentage)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(item.percentage, 100)}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <Activity size={18} className="text-cyan-700" />
            Index Percentiles
          </div>
          <div className="space-y-4 text-sm text-slate-700">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">NDVI Percentiles</p>
              <p className="mt-2">P25: {formatNumber(job.stats?.ndvi_percentiles?.p25)}</p>
              <p>P50: {formatNumber(job.stats?.ndvi_percentiles?.p50)}</p>
              <p>P75: {formatNumber(job.stats?.ndvi_percentiles?.p75)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">NDRE Percentiles</p>
              <p className="mt-2">P25: {formatNumber(job.stats?.ndre_percentiles?.p25)}</p>
              <p>P50: {formatNumber(job.stats?.ndre_percentiles?.p50)}</p>
              <p>P75: {formatNumber(job.stats?.ndre_percentiles?.p75)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <BrainCircuit size={18} className="text-cyan-700" />
            Workflow Details
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">Method</p>
              <p className="mt-1 font-medium text-slate-950">{formatMethod(job.stats?.labeling_method)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">Parameters</p>
              <p className="mt-2">Segments: {job.stats?.parameters?.n_segments ?? 'N/A'}</p>
              <p>Compactness: {job.stats?.parameters?.compactness ?? 'N/A'}</p>
              <p>Min Segment Pixels: {job.stats?.parameters?.min_segment_pixels ?? 'N/A'}</p>
              <p>Confidence Threshold: {job.stats?.parameters?.confidence_threshold ?? 'N/A'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">Cluster Centers</p>
              {(job.stats?.cluster_centers?.length ?? 0) > 0 ? (
                <div className="mt-2 space-y-1">
                  {job.stats?.cluster_centers?.map((center, index) => (
                    <p key={index}>
                      Cluster {index + 1}: NDVI {formatNumber(center[0])}, NDRE {formatNumber(center[1])}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-1">N/A</p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
