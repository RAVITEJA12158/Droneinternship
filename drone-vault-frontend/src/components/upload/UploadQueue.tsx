'use client'
import { useUIStore } from '@/store/ui.store'
import { UploadProgressBar } from './UploadProgressBar'

export function UploadQueue() {
  const { activeUploadJobs } = useUIStore()
  if (!activeUploadJobs.length) return null
  return (
    <div className="space-y-3">
      {activeUploadJobs.map(j => (
        <UploadProgressBar key={j.id} progress={j.progress} status={j.status} label={`${j.step.toUpperCase()} upload`} />
      ))}
    </div>
  )
}
