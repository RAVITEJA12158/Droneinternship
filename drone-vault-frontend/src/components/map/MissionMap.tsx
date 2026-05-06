'use client'
import { useEffect, useRef } from 'react'
import { CaptureSet } from '@/types'

interface Props { captureSets: CaptureSet[] }
export function MissionMap({ captureSets }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  const points = captureSets.filter(cs => cs.lat != null && cs.lng != null)

  useEffect(() => {
    if (!ref.current || mapRef.current || !points.length) return
    const center: [number, number] = [points[0].lat!, points[0].lng!]
    import('leaflet').then(L => {
      const map = L.map(ref.current!).setView(center, 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map)
      const coords: [number, number][] = points.map(cs => [cs.lat!, cs.lng!])
      L.polyline(coords, { color: '#22c55e', weight: 2 }).addTo(map)
      coords.forEach((c, i) => L.circleMarker(c, { radius: 5, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1 }).addTo(map).bindPopup(`Shot #${points[i].shotNumber}`))
      map.fitBounds(coords)
      mapRef.current = map
    })
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [points.length])

  if (!points.length) return <div className="h-64 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">No GPS data available</div>

  return <div ref={ref} className="h-96 rounded-xl" />
}
