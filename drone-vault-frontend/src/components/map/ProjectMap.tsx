'use client'
import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Mission } from '@/types'
import { MapPin, Navigation } from 'lucide-react'

// Leaflet's default marker image paths do not resolve reliably in Next.js.
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Props {
  latitude: number
  longitude: number
  missions?: Mission[]
}

export function ProjectMap({ latitude, longitude, missions = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const coords = useMemo<[number, number] | null>(() => {
    const lat = Number(latitude)
    const lng = Number(longitude)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

    return [lat, lng]
  }, [latitude, longitude])

  useEffect(() => {
    if (!ref.current || !coords) return

    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = null
    mapRef.current?.remove()
    mapRef.current = null

    const map = L.map(ref.current, {
      center: coords,
      zoom: 13,
      scrollWheelZoom: false,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    L.marker(coords).addTo(map).bindPopup('Project location')

    missions.forEach(_m => {
      // Mission markers would go here if missions had coordinates.
    })

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
  }, [coords, missions])

  if (!coords) {
    return (
      <div className="h-80 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 shadow-sm">
        Invalid project coordinates
      </div>
    )
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-950 font-semibold">
            <MapPin size={18} className="text-cyan-700" />
            Project Location
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {coords[0].toFixed(6)}, {coords[1].toFixed(6)}
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">
          <Navigation size={13} />
          Interactive map
        </div>
      </div>
      <div className="p-3">
        <div ref={ref} className="w-full h-[28rem] min-h-80 z-0 rounded-xl overflow-hidden border border-slate-200" />
      </div>
    </section>
  )
}
