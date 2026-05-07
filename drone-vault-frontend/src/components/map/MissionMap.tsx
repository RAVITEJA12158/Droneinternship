'use client'
import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CaptureSet } from '@/types'
import { MapPin, Route } from 'lucide-react'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Props { captureSets: CaptureSet[] }

export function MissionMap({ captureSets }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const points = useMemo(
    () => captureSets.filter(cs => cs.lat != null && cs.lng != null && Number.isFinite(Number(cs.lat)) && Number.isFinite(Number(cs.lng))),
    [captureSets]
  )

  useEffect(() => {
    if (!ref.current || !points.length) return

    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = null
    mapRef.current?.remove()
    mapRef.current = null

    const center: [number, number] = [points[0].lat!, points[0].lng!]
    const map = L.map(ref.current, {
      center,
      zoom: 15,
      scrollWheelZoom: false,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    const coords: [number, number][] = points.map(cs => [cs.lat!, cs.lng!])
    L.polyline(coords, { color: '#0891b2', weight: 3, opacity: 0.9 }).addTo(map)
    coords.forEach((c, i) =>
      L.circleMarker(c, {
        radius: 5,
        color: '#0e7490',
        fillColor: '#06b6d4',
        fillOpacity: 1,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(`Shot #${points[i].shotNumber}`)
    )
    map.fitBounds(coords, { padding: [28, 28], maxZoom: 18 })
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
  }, [points])

  if (!points.length) return (
    <div className="h-80 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 shadow-sm">
      No GPS data available
    </div>
  )

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-950 font-semibold">
            <MapPin size={18} className="text-cyan-700" />
            Mission Flight Path
          </div>
          <p className="mt-1 text-sm text-slate-500">{points.length} GPS points plotted</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">
          <Route size={13} />
          Capture route
        </div>
      </div>
      <div className="p-3">
        <div ref={ref} className="w-full h-[30rem] min-h-96 z-0 rounded-xl overflow-hidden border border-slate-200" />
      </div>
    </section>
  )
}
