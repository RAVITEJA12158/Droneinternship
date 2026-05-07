'use client'
import { useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CaptureSet } from '@/types'

// BUG-02 fix: patch broken default marker icons for Webpack/Next.js
// Must run once after leaflet is imported
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

  // BUG-03 fix: memoize full points array so useEffect dep is the array itself
  const points = useMemo(
    () => captureSets.filter(cs => cs.lat != null && cs.lng != null),
    [captureSets]
  )

  useEffect(() => {
    if (!ref.current || !points.length) return

    // BUG-03 fix: always destroy old map before re-creating so updates take effect
    mapRef.current?.remove()
    mapRef.current = null

    const center: [number, number] = [points[0].lat!, points[0].lng!]
    const map = L.map(ref.current).setView(center, 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map)

    const coords: [number, number][] = points.map(cs => [cs.lat!, cs.lng!])
    L.polyline(coords, { color: '#22c55e', weight: 2 }).addTo(map)
    coords.forEach((c, i) =>
      L.circleMarker(c, { radius: 5, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1 })
        .addTo(map)
        .bindPopup(`Shot #${points[i].shotNumber}`)
    )
    map.fitBounds(coords)
    mapRef.current = map

    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [points])

  if (!points.length) return (
    <div className="h-64 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
      No GPS data available
    </div>
  )

  return <div ref={ref} className="w-full h-96 z-0 rounded-xl" />
}

