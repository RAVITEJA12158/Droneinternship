'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CaptureSet, DroneFile } from '@/types'
import { filesApi } from '@/lib/api/files'
import { FileText, MapPin, Route } from 'lucide-react'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface MissionPlanPoint {
  latitude: number
  longitude: number
  altitude?: number
}

interface ParsedMissionPlan {
  fileName: string
  points: MissionPlanPoint[]
  error?: string
}

interface Props {
  captureSets: CaptureSet[]
  missionPlans?: DroneFile[]
}

function isValidCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
}

function addPoint(points: MissionPlanPoint[], latitude: unknown, longitude: unknown, altitude?: unknown) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  const alt = altitude == null ? undefined : Number(altitude)

  if (!isValidCoordinate(lat, lng)) return
  points.push({
    latitude: lat,
    longitude: lng,
    altitude: Number.isFinite(alt) ? alt : undefined,
  })
}

function collectPlanJsonPoints(value: unknown, points: MissionPlanPoint[]) {
  if (!value || typeof value !== 'object') return

  if (Array.isArray(value)) {
    value.forEach(item => collectPlanJsonPoints(item, points))
    return
  }

  const record = value as Record<string, unknown>
  if (Array.isArray(record.params) && record.params.length >= 7) {
    addPoint(points, record.params[4], record.params[5], record.params[6])
  }

  addPoint(points, record.latitude ?? record.lat, record.longitude ?? record.lng ?? record.lon, record.altitude ?? record.alt)

  Object.values(record).forEach(child => {
    if (typeof child === 'object') collectPlanJsonPoints(child, points)
  })
}

function parseWaypoints(text: string) {
  const points: MissionPlanPoint[] = []
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

  for (const line of lines) {
    if (line.startsWith('QGC') || line.startsWith('#')) continue
    const parts = line.split(/\s+/)
    if (parts.length < 11) continue
    addPoint(points, parts[8], parts[9], parts[10])
  }

  return points
}

function parseKml(text: string) {
  const points: MissionPlanPoint[] = []
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const coordinates = Array.from(doc.getElementsByTagName('coordinates'))

  for (const node of coordinates) {
    const tuples = (node.textContent ?? '').trim().split(/\s+/)
    for (const tuple of tuples) {
      const [lng, lat, alt] = tuple.split(',')
      addPoint(points, lat, lng, alt)
    }
  }

  return points
}

function parseMissionPlan(fileName: string, text: string): ParsedMissionPlan {
  const lowerName = fileName.toLowerCase()

  if (lowerName.endsWith('.kmz')) {
    return { fileName, points: [], error: 'KMZ preview is not supported yet. Upload KML, .plan, JSON, or waypoints to preview the route.' }
  }

  try {
    if (lowerName.endsWith('.plan') || lowerName.endsWith('.json')) {
      const points: MissionPlanPoint[] = []
      collectPlanJsonPoints(JSON.parse(text), points)
      return { fileName, points }
    }

    if (lowerName.endsWith('.waypoints')) {
      return { fileName, points: parseWaypoints(text) }
    }

    if (lowerName.endsWith('.kml')) {
      return { fileName, points: parseKml(text) }
    }
  } catch {
    return { fileName, points: [], error: 'Could not parse this mission plan.' }
  }

  return { fileName, points: [], error: 'Unsupported mission plan format.' }
}

function formatCoordinate(value: number) {
  return value.toFixed(6)
}

function formatAltitude(value?: number) {
  return value == null ? 'Not set' : `${value.toFixed(value % 1 === 0 ? 0 : 1)} m`
}

export function MissionMap({ captureSets, missionPlans = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const [parsedPlan, setParsedPlan] = useState<ParsedMissionPlan | null>(null)
  const [isLoadingPlan, setIsLoadingPlan] = useState(false)

  const capturePoints = useMemo(
    () => captureSets.filter(cs => cs.lat != null && cs.lng != null && isValidCoordinate(Number(cs.lat), Number(cs.lng))),
    [captureSets]
  )

  const planFile = missionPlans[0]

  useEffect(() => {
    let cancelled = false

    async function loadMissionPlan(file: DroneFile) {
      setIsLoadingPlan(true)
      try {
        const response = await fetch(filesApi.getDownloadUrl(file.id), { credentials: 'include' })
        if (!response.ok) throw new Error('Plan download failed')
        const text = await response.text()
        if (!cancelled) setParsedPlan(parseMissionPlan(file.originalName, text))
      } catch {
        if (!cancelled) setParsedPlan({ fileName: file.originalName, points: [], error: 'Could not load this mission plan.' })
      } finally {
        if (!cancelled) setIsLoadingPlan(false)
      }
    }

    if (!planFile) {
      setParsedPlan(null)
      return
    }

    loadMissionPlan(planFile)
    return () => { cancelled = true }
  }, [planFile])

  useEffect(() => {
    const planCoords: [number, number][] = parsedPlan?.points.map(point => [point.latitude, point.longitude]) ?? []
    const captureCoords: [number, number][] = capturePoints.map(cs => [cs.lat!, cs.lng!])
    const allCoords = [...planCoords, ...captureCoords]

    if (!ref.current || !allCoords.length) return

    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = null
    mapRef.current?.remove()
    mapRef.current = null

    const map = L.map(ref.current, {
      center: allCoords[0],
      zoom: 15,
      scrollWheelZoom: false,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    if (planCoords.length) {
      L.polyline(planCoords, { color: '#7c3aed', weight: 3, opacity: 0.85, dashArray: '8 8' }).addTo(map)
      planCoords.forEach((coord, index) =>
        L.circleMarker(coord, {
          radius: 4,
          color: '#6d28d9',
          fillColor: '#a78bfa',
          fillOpacity: 1,
          weight: 2,
        })
          .addTo(map)
          .bindPopup(`Plan waypoint ${index + 1}`)
      )
    }

    if (captureCoords.length) {
      L.polyline(captureCoords, { color: '#0891b2', weight: 3, opacity: 0.9 }).addTo(map)
      captureCoords.forEach((coord, index) =>
        L.circleMarker(coord, {
          radius: 5,
          color: '#0e7490',
          fillColor: '#06b6d4',
          fillOpacity: 1,
          weight: 2,
        })
          .addTo(map)
          .bindPopup(`Shot #${capturePoints[index].shotNumber}`)
      )
    }

    map.fitBounds(allCoords, { padding: [28, 28], maxZoom: 18 })
    mapRef.current = map

    const invalidateSize = () => map.invalidateSize()
    const animationFrame = window.requestAnimationFrame(invalidateSize)
    const timeout = window.setTimeout(invalidateSize, 250)

    resizeObserverRef.current = new ResizeObserver(invalidateSize)
    resizeObserverRef.current.observe(ref.current)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(timeout)
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [capturePoints, parsedPlan])

  const planPoints = parsedPlan?.points ?? []
  const planPointCount = planPoints.length

  if (!capturePoints.length && !planPointCount) return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 shadow-sm">
      <MapPin size={28} className="mx-auto mb-3 text-slate-400" />
      <p>No GPS capture data or mission plan waypoints available.</p>
      {parsedPlan?.error && <p className="mt-2 text-sm text-amber-700">{parsedPlan.error}</p>}
    </div>
  )

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-950 font-semibold">
            <MapPin size={18} className="text-cyan-700" />
            Mission Map
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {capturePoints.length} capture points
            {planFile ? ` · ${planPointCount} plan waypoints` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-800">
            <Route size={13} />
            Capture route
          </span>
          {planFile && (
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-800">
              <FileText size={13} />
              {isLoadingPlan ? 'Loading plan' : parsedPlan?.fileName ?? 'Mission plan'}
            </span>
          )}
        </div>
      </div>
      {parsedPlan?.error && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {parsedPlan.error}
        </div>
      )}
      <div className="p-3">
        <div ref={ref} className="w-full h-[30rem] min-h-96 z-0 rounded-xl overflow-hidden border border-slate-200" />
      </div>
      {planPoints.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Mission Plan Waypoints</h3>
              <p className="text-xs text-slate-500">{parsedPlan?.fileName}</p>
            </div>
            <span className="text-xs font-medium text-slate-500">{planPoints.length} total</span>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="max-h-80 overflow-auto">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="w-16 px-3 py-2">#</th>
                    <th className="px-3 py-2">Latitude</th>
                    <th className="px-3 py-2">Longitude</th>
                    <th className="px-3 py-2">Altitude</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {planPoints.map((point, index) => (
                    <tr key={`${point.latitude}-${point.longitude}-${index}`} className="hover:bg-violet-50/50">
                      <td className="px-3 py-2 font-medium text-slate-700">WP {index + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{formatCoordinate(point.latitude)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{formatCoordinate(point.longitude)}</td>
                      <td className="px-3 py-2 text-slate-600">{formatAltitude(point.altitude)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
