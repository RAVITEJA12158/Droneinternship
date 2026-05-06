'use client'
import { useExport } from '@/hooks/useExport'
import { Button } from '@/components/ui/Button'
import { ExportJobStatus } from './ExportJobStatus'
import { Download, FileArchive, FileText, FileJson } from 'lucide-react'

export function ExportPanel({ missionId }: { missionId: string }) {
  const { job, isExporting, startExport } = useExport(missionId)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" loading={isExporting} onClick={() => startExport('zip')}><FileArchive size={16} />Export ZIP</Button>
        <Button variant="secondary" loading={isExporting} onClick={() => startExport('pdf')}><FileText size={16} />Export PDF</Button>
        <Button variant="secondary" loading={isExporting} onClick={() => startExport('json')}><FileJson size={16} />Export JSON</Button>
      </div>
      {job && <ExportJobStatus job={job} />}
    </div>
  )
}
