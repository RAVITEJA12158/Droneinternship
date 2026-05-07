'use client'
import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Mission } from '@/types'

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
    })

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
      <div className="h-64 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
        Invalid project coordinates
      </div>
    )
  }

  return <div ref={ref} className="w-full h-64 min-h-64 z-0 rounded-xl overflow-hidden" />
}
