'use client'
import { useEffect, useRef } from 'react'
import { Mission } from '@/types'

interface Props { latitude: number; longitude: number; missions?: Mission[] }
export function ProjectMap({ latitude, longitude, missions = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    import('leaflet').then(L => {
      const map = L.map(ref.current!).setView([latitude, longitude], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map)
      L.marker([latitude, longitude]).addTo(map).bindPopup('Project location')
      missions.forEach(m => {
        // Mission markers would go here if they had coordinates
      })
      mapRef.current = map
    })
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [latitude, longitude])

  return <div ref={ref} className="h-64 rounded-xl" />
}
